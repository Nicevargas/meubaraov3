DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.plans WHERE plan_code = 'free') THEN
    INSERT INTO public.plans (
      plan_code, tier, billing_cycle, name, price_brl, currency, active, sort_order,
      daily_message_limit, soft_limit_pct, ai_priority, premium_features, vip_features,
      description, billing_enabled
    ) VALUES (
      'free', 'free', 'lifetime', 'Gratuito', 0, 'BRL', true, 0,
      15, 80, 0, '{}'::jsonb, '{}'::jsonb,
      'Plano gratuito padrão', false
    );
  ELSE
    UPDATE public.plans
    SET tier = 'free',
        billing_cycle = 'lifetime',
        name = COALESCE(NULLIF(name, ''), 'Gratuito'),
        price_brl = 0,
        active = true,
        daily_message_limit = COALESCE(daily_message_limit, 15),
        soft_limit_pct = COALESCE(soft_limit_pct, 80),
        ai_priority = COALESCE(ai_priority, 0),
        premium_features = COALESCE(premium_features, '{}'::jsonb),
        vip_features = COALESCE(vip_features, '{}'::jsonb),
        billing_enabled = false,
        updated_at = now()
    WHERE plan_code = 'free';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.apply_manual_plan(
  _user_id uuid,
  _plan_code text,
  _assignment_type text,
  _expires_at timestamp with time zone,
  _reason text,
  _actor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_plan public.plans%ROWTYPE;
  v_old_plan text;
  v_assignment_id uuid;
  v_profile_plan text;
BEGIN
  SELECT * INTO v_plan
  FROM public.plans
  WHERE active = true
    AND (plan_code = _plan_code OR tier = _plan_code)
  ORDER BY CASE WHEN plan_code = _plan_code THEN 0 ELSE 1 END,
           sort_order ASC,
           created_at DESC
  LIMIT 1;

  IF v_plan.id IS NULL THEN
    RAISE EXCEPTION 'Plan % not found or inactive', _plan_code;
  END IF;

  v_profile_plan := COALESCE(v_plan.tier, v_plan.plan_code);

  SELECT plan INTO v_old_plan FROM public.profiles WHERE id = _user_id;

  UPDATE public.user_plan_assignments
    SET revoked_at = now(), revoked_by = _actor_id
    WHERE user_id = _user_id AND revoked_at IS NULL;

  INSERT INTO public.user_plan_assignments
    (user_id, plan_id, plan_code, assignment_type, granted_by, expires_at, reason, details)
  VALUES
    (_user_id, v_plan.id, v_plan.plan_code, _assignment_type, _actor_id, _expires_at, _reason,
     jsonb_build_object('requested_plan', _plan_code, 'resolved_tier', v_plan.tier))
  RETURNING id INTO v_assignment_id;

  UPDATE public.profiles
    SET plan = v_profile_plan,
        subscription_version = COALESCE(subscription_version, 0) + 1,
        subscription_synced_at = now(),
        updated_at = now()
    WHERE id = _user_id;

  INSERT INTO public.premium_history
    (user_id, plan_id, plan_code, status, reason, actor, actor_id, details)
  VALUES
    (_user_id, v_plan.id, v_plan.plan_code,
     CASE WHEN v_plan.tier = 'free' THEN 'revoked' ELSE 'active' END,
     _reason, 'admin', _actor_id,
     jsonb_build_object('assignment_type', _assignment_type, 'expires_at', _expires_at, 'previous_plan', v_old_plan, 'requested_plan', _plan_code, 'resolved_tier', v_plan.tier));

  INSERT INTO public.admin_audit_log
    (actor_id, target_id, action, old_role, new_role, details)
  VALUES
    (_actor_id, _user_id, 'plan_assigned', v_old_plan, v_plan.plan_code,
     jsonb_build_object('assignment_type', _assignment_type, 'expires_at', _expires_at, 'reason', _reason, 'requested_plan', _plan_code, 'resolved_tier', v_plan.tier));

  RETURN jsonb_build_object(
    'assignment_id', v_assignment_id,
    'old_plan', v_old_plan,
    'new_plan', v_plan.plan_code,
    'new_tier', v_plan.tier,
    'plan_id', v_plan.id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.resolve_user_entitlement(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_assignment record;
  v_sub record;
  v_payment record;
  v_profile record;
  v_plan public.plans%ROWTYPE;
  v_requested_plan text := 'free';
  v_source text := 'default';
  v_status text := 'revoked';
  v_now timestamptz := now();
  v_has_premium boolean := false;
BEGIN
  SELECT plan, subscription_version, subscription_synced_at
  INTO v_profile
  FROM public.profiles
  WHERE id = _user_id;

  SELECT upa.plan_code, upa.plan_id, upa.assignment_type, upa.expires_at
  INTO v_assignment
  FROM public.user_plan_assignments upa
  WHERE upa.user_id = _user_id
    AND upa.revoked_at IS NULL
    AND (upa.expires_at IS NULL OR upa.expires_at > v_now)
  ORDER BY upa.granted_at DESC
  LIMIT 1;

  IF v_assignment.plan_code IS NOT NULL THEN
    v_requested_plan := v_assignment.plan_code;
    v_source := 'manual_assignment';
    v_status := 'active';
  ELSE
    SELECT s.status, s.plan_id, s.grace_period_until, s.current_period_end, p.plan_code, p.tier
    INTO v_sub
    FROM public.subscriptions s
    LEFT JOIN public.plans p ON p.id = s.plan_id
    WHERE s.user_id = _user_id
      AND s.status IN ('authorized', 'active', 'paused', 'trialing', 'past_due')
    ORDER BY s.created_at DESC
    LIMIT 1;

    IF v_sub.status IN ('authorized', 'active', 'trialing') THEN
      v_requested_plan := COALESCE(v_sub.plan_code, v_sub.tier, 'free');
      v_source := 'billing_subscription';
      v_status := 'active';
    ELSIF v_sub.status = 'past_due' AND v_sub.grace_period_until IS NOT NULL AND v_sub.grace_period_until > v_now THEN
      v_requested_plan := COALESCE(v_sub.plan_code, v_sub.tier, 'free');
      v_source := 'billing_grace';
      v_status := 'grace';
    ELSE
      SELECT pay.plan_id, p.plan_code, p.tier, pay.paid_at, pay.created_at
      INTO v_payment
      FROM public.payments pay
      LEFT JOIN public.plans p ON p.id = pay.plan_id
      WHERE pay.user_id = _user_id
        AND pay.status = 'approved'
        AND pay.plan_id IS NOT NULL
      ORDER BY COALESCE(pay.paid_at, pay.created_at) DESC
      LIMIT 1;

      IF v_payment.plan_id IS NOT NULL THEN
        v_requested_plan := COALESCE(v_payment.plan_code, v_payment.tier, 'free');
        v_source := 'approved_payment';
        v_status := 'active';
      END IF;
    END IF;
  END IF;

  SELECT * INTO v_plan
  FROM public.plans
  WHERE active = true
    AND (plan_code = v_requested_plan OR tier = v_requested_plan)
  ORDER BY CASE WHEN plan_code = v_requested_plan THEN 0 ELSE 1 END,
           sort_order ASC,
           created_at DESC
  LIMIT 1;

  IF v_plan.id IS NULL THEN
    SELECT * INTO v_plan
    FROM public.plans
    WHERE plan_code = 'free' AND active = true
    ORDER BY sort_order ASC, created_at DESC
    LIMIT 1;
    v_source := 'missing_plan_fallback';
    v_status := 'revoked';
  END IF;

  IF v_plan.id IS NULL THEN
    RAISE EXCEPTION 'Required free plan is not configured';
  END IF;

  IF v_plan.tier = 'free' THEN
    v_status := 'revoked';
  END IF;

  v_has_premium := COALESCE(v_plan.tier, 'free') <> 'free' AND v_status IN ('active', 'grace');

  RETURN jsonb_build_object(
    'user_id', _user_id,
    'plan', v_plan.plan_code,
    'plan_id', v_plan.id,
    'plan_name', v_plan.name,
    'tier', COALESCE(v_plan.tier, v_plan.plan_code),
    'source', v_source,
    'status', v_status,
    'has_premium_access', v_has_premium,
    'limits', jsonb_build_object(
      'daily_message_limit', v_plan.daily_message_limit,
      'monthly_token_limit', v_plan.monthly_token_limit,
      'max_conversations', v_plan.max_conversations,
      'memory_context_size', v_plan.memory_context_size,
      'ai_priority', COALESCE(v_plan.ai_priority, 0),
      'soft_limit_pct', COALESCE(v_plan.soft_limit_pct, 80)
    ),
    'features', jsonb_build_object(
      'premium', COALESCE(v_plan.premium_features, '{}'::jsonb),
      'vip', COALESCE(v_plan.vip_features, '{}'::jsonb)
    ),
    'subscription_version', COALESCE(v_profile.subscription_version, 0),
    'subscription_synced_at', COALESCE(v_profile.subscription_synced_at, v_now)
  );
END;
$function$;

DROP TRIGGER IF EXISTS trg_prevent_plan_self_update ON public.profiles;
CREATE TRIGGER trg_prevent_plan_self_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_plan_self_update();

INSERT INTO public.user_plan_assignments
  (user_id, plan_id, plan_code, assignment_type, reason, details)
SELECT p.id,
       resolved.id,
       resolved.plan_code,
       'legacy_profile_backfill',
       'Backfilled from legacy profile plan during entitlement unification',
       jsonb_build_object('legacy_profile_plan', p.plan, 'resolved_tier', resolved.tier)
FROM public.profiles p
JOIN LATERAL (
  SELECT pl.*
  FROM public.plans pl
  WHERE pl.active = true
    AND (pl.plan_code = p.plan OR pl.tier = p.plan)
  ORDER BY CASE WHEN pl.plan_code = p.plan THEN 0 ELSE 1 END,
           pl.sort_order ASC,
           pl.created_at DESC
  LIMIT 1
) resolved ON true
WHERE p.plan <> 'free'
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_plan_assignments upa
    WHERE upa.user_id = p.id
      AND upa.revoked_at IS NULL
      AND (upa.expires_at IS NULL OR upa.expires_at > now())
  );