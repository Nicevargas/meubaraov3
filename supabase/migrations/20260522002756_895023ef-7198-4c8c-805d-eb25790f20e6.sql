-- 1. Relax plans constraints to allow the built-in free plan
ALTER TABLE public.plans DROP CONSTRAINT IF EXISTS plans_tier_check;
ALTER TABLE public.plans ADD CONSTRAINT plans_tier_check
  CHECK (tier IN ('free', 'premium', 'elite', 'vip', 'enterprise'));

ALTER TABLE public.plans DROP CONSTRAINT IF EXISTS plans_billing_cycle_check;
ALTER TABLE public.plans ADD CONSTRAINT plans_billing_cycle_check
  CHECK (billing_cycle IN ('monthly', 'quarterly', 'annual', 'lifetime', 'trial'));

-- 2. Insert the canonical free plan if it doesn't exist
INSERT INTO public.plans (
  plan_code, tier, billing_cycle, name, description,
  price_brl, currency, active, billing_enabled, featured, sort_order,
  daily_message_limit, soft_limit_pct, ai_priority,
  premium_features, vip_features, trial_days
)
SELECT
  'free', 'free', 'lifetime', 'Gratuito',
  'Plano gratuito com limite diário de mensagens.',
  0, 'BRL', true, false, false, 0,
  15, 80, 0,
  '{}'::jsonb, '{}'::jsonb, 0
WHERE NOT EXISTS (SELECT 1 FROM public.plans WHERE plan_code = 'free');

-- 3. Refresh the resolver so the free plan is treated like any other plan
--    (single source of truth: the plans row drives limits/features).
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
  v_plan record;
  v_plan_code text := 'free';
  v_source text := 'default';
  v_status text := 'revoked';
  v_now timestamptz := now();
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
    v_plan_code := v_assignment.plan_code;
    v_source := 'manual_assignment';
    v_status := CASE WHEN v_plan_code = 'free' THEN 'revoked' ELSE 'active' END;
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
      v_plan_code := COALESCE(v_sub.plan_code, v_sub.tier, 'premium');
      v_source := 'billing_subscription';
      v_status := 'active';
    ELSIF v_sub.status = 'past_due' AND v_sub.grace_period_until IS NOT NULL AND v_sub.grace_period_until > v_now THEN
      v_plan_code := COALESCE(v_sub.plan_code, v_sub.tier, 'premium');
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
        v_plan_code := COALESCE(v_payment.plan_code, v_payment.tier, 'premium');
        v_source := 'approved_payment';
        v_status := 'active';
      END IF;
    END IF;
  END IF;

  SELECT * INTO v_plan
  FROM public.plans
  WHERE plan_code = v_plan_code
  ORDER BY active DESC, created_at DESC
  LIMIT 1;

  IF v_plan.id IS NULL AND v_plan_code <> 'free' THEN
    SELECT * INTO v_plan
    FROM public.plans
    WHERE tier = v_plan_code AND active = true
    ORDER BY sort_order ASC, created_at DESC
    LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'user_id', _user_id,
    'plan', v_plan_code,
    'plan_id', v_plan.id,
    'tier', COALESCE(v_plan.tier, v_plan_code),
    'source', v_source,
    'status', v_status,
    'has_premium_access', v_plan_code <> 'free',
    'limits', jsonb_build_object(
      'daily_message_limit', COALESCE(v_plan.daily_message_limit, CASE WHEN v_plan_code = 'free' THEN 15 ELSE NULL END),
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