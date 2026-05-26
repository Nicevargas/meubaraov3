ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_version integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subscription_synced_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.touch_subscription_state(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    subscription_version = COALESCE(subscription_version, 0) + 1,
    subscription_synced_at = now(),
    updated_at = now()
  WHERE id = _user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_user_entitlement(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment record;
  v_sub record;
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
    'tier', COALESCE(v_plan.tier, v_plan_code),
    'source', v_source,
    'status', v_status,
    'has_premium_access', v_plan_code <> 'free',
    'limits', jsonb_build_object(
      'daily_message_limit', CASE WHEN v_plan_code = 'free' THEN COALESCE(v_plan.daily_message_limit, 15) ELSE v_plan.daily_message_limit END,
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
$$;

CREATE OR REPLACE FUNCTION public.apply_manual_plan(_user_id uuid, _plan_code text, _assignment_type text, _expires_at timestamp with time zone, _reason text, _actor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan public.plans%ROWTYPE;
  v_old_plan text;
  v_assignment_id uuid;
BEGIN
  SELECT * INTO v_plan FROM public.plans WHERE plan_code = _plan_code AND active = true LIMIT 1;
  IF v_plan.id IS NULL AND _plan_code <> 'free' THEN
    RAISE EXCEPTION 'Plan % not found or inactive', _plan_code;
  END IF;

  SELECT plan INTO v_old_plan FROM public.profiles WHERE id = _user_id;

  UPDATE public.user_plan_assignments
    SET revoked_at = now(), revoked_by = _actor_id
    WHERE user_id = _user_id AND revoked_at IS NULL;

  INSERT INTO public.user_plan_assignments
    (user_id, plan_id, plan_code, assignment_type, granted_by, expires_at, reason)
  VALUES
    (_user_id, v_plan.id, _plan_code, _assignment_type, _actor_id, _expires_at, _reason)
  RETURNING id INTO v_assignment_id;

  UPDATE public.profiles
    SET plan = _plan_code,
        subscription_version = COALESCE(subscription_version, 0) + 1,
        subscription_synced_at = now(),
        updated_at = now()
    WHERE id = _user_id;

  INSERT INTO public.premium_history
    (user_id, plan_id, plan_code, status, reason, actor, actor_id, details)
  VALUES
    (_user_id, v_plan.id, _plan_code,
     CASE WHEN _plan_code = 'free' THEN 'revoked' ELSE 'active' END,
     _reason, 'admin', _actor_id,
     jsonb_build_object('assignment_type', _assignment_type, 'expires_at', _expires_at, 'previous_plan', v_old_plan));

  INSERT INTO public.admin_audit_log
    (actor_id, target_id, action, old_role, new_role, details)
  VALUES
    (_actor_id, _user_id, 'plan_assigned', v_old_plan, _plan_code,
     jsonb_build_object('assignment_type', _assignment_type, 'expires_at', _expires_at, 'reason', _reason));

  RETURN jsonb_build_object('assignment_id', v_assignment_id, 'old_plan', v_old_plan, 'new_plan', _plan_code);
END;
$$;

CREATE INDEX IF NOT EXISTS idx_user_plan_assignments_active_user
  ON public.user_plan_assignments(user_id, granted_at DESC)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_entitlement_user
  ON public.subscriptions(user_id, created_at DESC)
  WHERE status IN ('authorized', 'active', 'paused', 'trialing', 'past_due');