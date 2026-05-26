-- ============================================================
-- Phase 0b: Relax pricing_plans constraints to allow manual assignments
-- ============================================================
ALTER TABLE public.pricing_plans DROP CONSTRAINT IF EXISTS pricing_plans_billing_cycle_check;
ALTER TABLE public.pricing_plans ADD CONSTRAINT pricing_plans_billing_cycle_check
  CHECK (billing_cycle = ANY (ARRAY['monthly','quarterly','semiannual','annual','lifetime','trial','manual']));

-- ============================================================
-- Phase 1: Schema additions to products (additive)
-- ============================================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS tier                text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS daily_message_limit integer,
  ADD COLUMN IF NOT EXISTS monthly_token_limit bigint,
  ADD COLUMN IF NOT EXISTS max_conversations   integer,
  ADD COLUMN IF NOT EXISTS memory_context_size integer,
  ADD COLUMN IF NOT EXISTS ai_priority         integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS soft_limit_pct      integer NOT NULL DEFAULT 80,
  ADD COLUMN IF NOT EXISTS premium_features    jsonb   NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS vip_features        jsonb   NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON public.subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_pricing_plan ON public.subscriptions(pricing_plan_id);
CREATE INDEX IF NOT EXISTS idx_pricing_plans_product_active ON public.pricing_plans(product_id, active);

-- ============================================================
-- Phase 2: Backfill product tier + limits from legacy plans
-- ============================================================
UPDATE public.products prod
SET
  tier                = p.tier,
  daily_message_limit = COALESCE(prod.daily_message_limit, p.daily_message_limit),
  monthly_token_limit = COALESCE(prod.monthly_token_limit, p.monthly_token_limit),
  max_conversations   = COALESCE(prod.max_conversations,   p.max_conversations),
  memory_context_size = COALESCE(prod.memory_context_size, p.memory_context_size),
  ai_priority         = GREATEST(prod.ai_priority, COALESCE(p.ai_priority, 0)),
  soft_limit_pct      = COALESCE(NULLIF(prod.soft_limit_pct, 80), p.soft_limit_pct, 80),
  premium_features    = prod.premium_features || COALESCE(p.premium_features, '{}'::jsonb),
  vip_features        = prod.vip_features     || COALESCE(p.vip_features,     '{}'::jsonb),
  updated_at          = now()
FROM (
  SELECT pl.tier, pl.daily_message_limit, pl.monthly_token_limit, pl.max_conversations,
         pl.memory_context_size, pl.ai_priority, pl.soft_limit_pct,
         pl.premium_features, pl.vip_features,
         row_number() OVER (PARTITION BY pl.tier ORDER BY pl.sort_order, pl.created_at) AS rn
  FROM public.plans pl
  WHERE pl.active AND pl.tier IN ('premium','elite')
) p
WHERE p.rn = 1 AND prod.slug = p.tier;

-- ============================================================
-- Phase 2b: Decision A — create hidden plano_teste pricing_plan
-- ============================================================
INSERT INTO public.pricing_plans (
  id, product_id, billing_cycle, price_brl, currency, active, visibility, sort_order
)
SELECT
  gen_random_uuid(), prod.id, 'manual', 0, 'BRL', true, 'hidden', 999
FROM public.products prod
WHERE prod.slug = 'premium'
  AND NOT EXISTS (
    SELECT 1 FROM public.pricing_plans pp
    WHERE pp.product_id = prod.id AND pp.billing_cycle = 'manual'
  );

-- ============================================================
-- Phase 2c: Backfill subscriptions from active manual assignments
-- ============================================================
INSERT INTO public.subscriptions (
  user_id, provider, status, plan_id, pricing_plan_id, product_id,
  billing_cycle, environment, created_at, updated_at
)
SELECT
  upa.user_id,
  'manual',
  'active',
  upa.plan_id,
  COALESCE(
    (SELECT pp.id FROM public.pricing_plans pp WHERE pp.legacy_plan_id = upa.plan_id LIMIT 1),
    CASE WHEN upa.plan_code = 'plano_teste' THEN
      (SELECT pp.id FROM public.pricing_plans pp
       JOIN public.products prod ON prod.id = pp.product_id
       WHERE prod.slug = 'premium' AND pp.billing_cycle = 'manual' LIMIT 1)
    END
  ),
  COALESCE(
    (SELECT pp.product_id FROM public.pricing_plans pp WHERE pp.legacy_plan_id = upa.plan_id LIMIT 1),
    CASE WHEN upa.plan_code = 'plano_teste' THEN
      (SELECT id FROM public.products WHERE slug = 'premium' LIMIT 1)
    END
  ),
  COALESCE(
    (SELECT pp.billing_cycle FROM public.pricing_plans pp WHERE pp.legacy_plan_id = upa.plan_id LIMIT 1),
    'manual'
  ),
  'live', now(), now()
FROM public.user_plan_assignments upa
JOIN public.plans p ON p.id = upa.plan_id
WHERE upa.revoked_at IS NULL
  AND p.tier IN ('premium','elite')
  AND NOT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = upa.user_id
      AND s.status IN ('active','authorized','trialing')
      AND s.provider = 'manual'
  );

-- ============================================================
-- Phase 2d: Sync profiles.plan cache
-- ============================================================
UPDATE public.profiles p
SET plan = COALESCE(
      (SELECT prod.tier
       FROM public.subscriptions s
       JOIN public.pricing_plans pp ON pp.id = s.pricing_plan_id
       JOIN public.products prod ON prod.id = pp.product_id
       WHERE s.user_id = p.id
         AND s.status IN ('active','authorized','trialing')
       ORDER BY s.created_at DESC LIMIT 1),
      'free'
    ),
    subscription_version = COALESCE(subscription_version, 0) + 1,
    subscription_synced_at = now(),
    updated_at = now();

-- ============================================================
-- Phase 3: New resolver — typed scalars only
-- ============================================================
CREATE OR REPLACE FUNCTION public.resolve_user_entitlement(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_sub_id                  uuid;
  v_sub_status              text;
  v_sub_grace_until         timestamptz;
  v_pricing_plan_id         uuid;
  v_product_id              uuid;
  v_pp_active               boolean;
  v_prod_active             boolean;
  v_tier                    text;
  v_product_name            text;
  v_product_slug            text;
  v_daily_message_limit     integer;
  v_monthly_token_limit     bigint;
  v_max_conversations       integer;
  v_memory_context_size     integer;
  v_ai_priority             integer;
  v_soft_limit_pct          integer;
  v_premium_features        jsonb;
  v_vip_features            jsonb;
  v_status                  text := 'revoked';
  v_source                  text := 'default';
  v_has_premium             boolean := false;
  v_subscription_version    integer;
  v_subscription_synced_at  timestamptz;
  v_now                     timestamptz := now();
BEGIN
  SELECT subscription_version, subscription_synced_at
    INTO v_subscription_version, v_subscription_synced_at
  FROM public.profiles WHERE id = _user_id;

  SELECT s.id, s.status, s.grace_period_until, s.pricing_plan_id
    INTO v_sub_id, v_sub_status, v_sub_grace_until, v_pricing_plan_id
  FROM public.subscriptions s
  WHERE s.user_id = _user_id
    AND s.status IN ('active','authorized','trialing','past_due')
  ORDER BY
    CASE WHEN s.status IN ('active','authorized','trialing') THEN 0 ELSE 1 END,
    s.created_at DESC
  LIMIT 1;

  IF v_sub_id IS NULL THEN
    RETURN jsonb_build_object(
      'user_id', _user_id,
      'plan', 'free', 'plan_id', NULL, 'plan_name', 'Free',
      'tier', 'free', 'source', 'default', 'status', 'revoked',
      'has_premium_access', false,
      'limits', jsonb_build_object('daily_message_limit',15,'monthly_token_limit',0,'max_conversations',1000,'memory_context_size',0,'ai_priority',0,'soft_limit_pct',80),
      'features', jsonb_build_object('premium','{}'::jsonb,'vip','{}'::jsonb),
      'subscription_version', COALESCE(v_subscription_version, 0),
      'subscription_synced_at', COALESCE(v_subscription_synced_at, v_now)
    );
  END IF;

  IF v_pricing_plan_id IS NULL THEN
    RAISE EXCEPTION 'Subscription % has no pricing_plan_id (user %)', v_sub_id, _user_id;
  END IF;

  SELECT pp.product_id, pp.active INTO v_product_id, v_pp_active
  FROM public.pricing_plans pp WHERE pp.id = v_pricing_plan_id;

  IF v_product_id IS NULL THEN
    RAISE EXCEPTION 'pricing_plan % not found (sub %, user %)', v_pricing_plan_id, v_sub_id, _user_id;
  END IF;
  IF NOT v_pp_active THEN
    RAISE EXCEPTION 'pricing_plan % is inactive (sub %, user %)', v_pricing_plan_id, v_sub_id, _user_id;
  END IF;

  SELECT prod.active, prod.tier, prod.name, prod.slug,
         prod.daily_message_limit, prod.monthly_token_limit,
         prod.max_conversations, prod.memory_context_size,
         prod.ai_priority, prod.soft_limit_pct,
         prod.premium_features, prod.vip_features
    INTO v_prod_active, v_tier, v_product_name, v_product_slug,
         v_daily_message_limit, v_monthly_token_limit,
         v_max_conversations, v_memory_context_size,
         v_ai_priority, v_soft_limit_pct,
         v_premium_features, v_vip_features
  FROM public.products prod WHERE prod.id = v_product_id;

  IF NOT v_prod_active THEN
    RAISE EXCEPTION 'product % is inactive (pp %, user %)', v_product_id, v_pricing_plan_id, _user_id;
  END IF;

  IF v_sub_status = 'past_due' THEN
    IF v_sub_grace_until IS NOT NULL AND v_sub_grace_until > v_now THEN
      v_status := 'grace';
      v_source := 'billing_grace';
    ELSE
      RETURN jsonb_build_object(
        'user_id', _user_id, 'plan', 'free', 'plan_id', NULL, 'plan_name', 'Free',
        'tier', 'free', 'source', 'past_due_expired', 'status', 'revoked',
        'has_premium_access', false,
        'limits', jsonb_build_object('daily_message_limit',15,'monthly_token_limit',0,'max_conversations',1000,'memory_context_size',0,'ai_priority',0,'soft_limit_pct',80),
        'features', jsonb_build_object('premium','{}'::jsonb,'vip','{}'::jsonb),
        'subscription_version', COALESCE(v_subscription_version, 0),
        'subscription_synced_at', COALESCE(v_subscription_synced_at, v_now)
      );
    END IF;
  ELSE
    v_status := 'active';
    v_source := 'billing_subscription';
  END IF;

  v_has_premium := COALESCE(v_tier,'free') <> 'free' AND v_status IN ('active','grace');

  RETURN jsonb_build_object(
    'user_id', _user_id,
    'plan', v_product_slug,
    'plan_id', v_pricing_plan_id,
    'plan_name', v_product_name,
    'tier', COALESCE(v_tier,'free'),
    'source', v_source,
    'status', v_status,
    'has_premium_access', v_has_premium,
    'limits', jsonb_build_object(
      'daily_message_limit', v_daily_message_limit,
      'monthly_token_limit', v_monthly_token_limit,
      'max_conversations',   v_max_conversations,
      'memory_context_size', v_memory_context_size,
      'ai_priority',         COALESCE(v_ai_priority,0),
      'soft_limit_pct',      COALESCE(v_soft_limit_pct,80)
    ),
    'features', jsonb_build_object(
      'premium', COALESCE(v_premium_features,'{}'::jsonb),
      'vip',     COALESCE(v_vip_features,    '{}'::jsonb)
    ),
    'subscription_version', COALESCE(v_subscription_version, 0),
    'subscription_synced_at', COALESCE(v_subscription_synced_at, v_now)
  );
END;
$function$;

-- ============================================================
-- Phase 3b: user_features → straight via subscription → product
-- ============================================================
CREATE OR REPLACE FUNCTION public.user_features(_user_id uuid)
RETURNS TABLE(feature_key text, enabled boolean, limit_value bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE v_product_id uuid;
BEGIN
  SELECT pp.product_id INTO v_product_id
  FROM public.subscriptions s
  JOIN public.pricing_plans pp ON pp.id = s.pricing_plan_id
  WHERE s.user_id = _user_id
    AND s.status IN ('active','authorized','trialing')
    AND pp.active
  ORDER BY s.created_at DESC LIMIT 1;
  IF v_product_id IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT pf.feature_key, pf.enabled, pf.limit_value
  FROM public.product_features pf
  WHERE pf.product_id = v_product_id AND pf.enabled = true;
END;
$function$;

-- ============================================================
-- Phase 4: New writer
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_assign_subscription(
  _user_id uuid, _pricing_plan_id uuid, _expires_at timestamptz, _reason text, _actor_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  v_pp_active boolean; v_product_id uuid; v_billing text;
  v_tier text; v_old_plan text; v_sub_id uuid;
BEGIN
  SELECT pp.active, pp.product_id, pp.billing_cycle
    INTO v_pp_active, v_product_id, v_billing
  FROM public.pricing_plans pp WHERE pp.id = _pricing_plan_id;

  IF v_product_id IS NULL THEN RAISE EXCEPTION 'pricing_plan % not found', _pricing_plan_id; END IF;
  IF NOT v_pp_active THEN RAISE EXCEPTION 'pricing_plan % is inactive', _pricing_plan_id; END IF;

  SELECT tier INTO v_tier FROM public.products WHERE id = v_product_id;
  SELECT plan INTO v_old_plan FROM public.profiles WHERE id = _user_id;

  UPDATE public.subscriptions
     SET status = 'canceled', canceled_at = now(), updated_at = now()
   WHERE user_id = _user_id
     AND status IN ('active','authorized','trialing','past_due');

  INSERT INTO public.subscriptions (
    user_id, provider, status, pricing_plan_id, product_id,
    billing_cycle, current_period_end, environment, created_at, updated_at
  ) VALUES (
    _user_id, 'manual', 'active', _pricing_plan_id, v_product_id,
    v_billing, _expires_at, 'live', now(), now()
  ) RETURNING id INTO v_sub_id;

  PERFORM public.touch_subscription_state(_user_id);
  UPDATE public.profiles SET plan = COALESCE(v_tier,'free') WHERE id = _user_id;

  INSERT INTO public.premium_history (user_id, plan_id, status, reason, actor, actor_id, details)
  VALUES (_user_id, _pricing_plan_id,
     CASE WHEN v_tier = 'free' THEN 'revoked' ELSE 'active' END,
     _reason, 'admin', _actor_id,
     jsonb_build_object('subscription_id', v_sub_id, 'expires_at', _expires_at, 'previous_plan', v_old_plan, 'tier', v_tier));

  INSERT INTO public.admin_audit_log (actor_id, target_id, action, old_role, new_role, details)
  VALUES (_actor_id, _user_id, 'subscription_assigned', v_old_plan, v_tier,
     jsonb_build_object('subscription_id', v_sub_id, 'pricing_plan_id', _pricing_plan_id, 'expires_at', _expires_at, 'reason', _reason));

  RETURN jsonb_build_object(
    'subscription_id', v_sub_id, 'pricing_plan_id', _pricing_plan_id,
    'product_id', v_product_id, 'tier', v_tier, 'old_plan', v_old_plan
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_assign_subscription(uuid, uuid, timestamptz, text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_assign_subscription(uuid, uuid, timestamptz, text, uuid) FROM authenticated, anon;

-- Deprecate apply_manual_plan
CREATE OR REPLACE FUNCTION public.apply_manual_plan(_user_id uuid, _plan_code text, _assignment_type text, _expires_at timestamptz, _reason text, _actor_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  RAISE EXCEPTION 'apply_manual_plan is deprecated. Use admin_assign_subscription(_user_id, _pricing_plan_id, _expires_at, _reason, _actor_id).';
END;
$function$;

-- ============================================================
-- Phase 5: Validation gates
-- ============================================================
DO $$
DECLARE v_count int; v_user_ids text;
BEGIN
  SELECT count(*) INTO v_count FROM public.subscriptions
   WHERE pricing_plan_id IS NULL AND status IN ('active','authorized','trialing','past_due');
  IF v_count > 0 THEN RAISE EXCEPTION 'VALIDATION FAILED: % active sub(s) without pricing_plan_id', v_count; END IF;

  SELECT count(*) INTO v_count FROM public.subscriptions s
   JOIN public.pricing_plans pp ON pp.id = s.pricing_plan_id
   WHERE NOT pp.active AND s.status IN ('active','authorized','trialing');
  IF v_count > 0 THEN RAISE EXCEPTION 'VALIDATION FAILED: % sub(s) on inactive pricing_plans', v_count; END IF;

  SELECT string_agg(upa.user_id::text, ', '), count(*) INTO v_user_ids, v_count
  FROM public._backup_20260522_user_plan_assignments upa
  JOIN public._backup_20260522_plans p ON p.id = upa.plan_id
  WHERE upa.revoked_at IS NULL AND p.tier IN ('premium','elite')
    AND (public.resolve_user_entitlement(upa.user_id)->>'tier') = 'free';
  IF v_count > 0 THEN RAISE EXCEPTION 'VALIDATION FAILED: % user(s) lost tier: %', v_count, v_user_ids; END IF;

  SELECT count(*) INTO v_count FROM public.user_roles
   WHERE role = 'super_admin' AND disabled_at IS NULL;
  IF v_count < 1 THEN
    SELECT count(*) INTO v_count FROM public.user_roles;
    IF v_count > 0 OR EXISTS (SELECT 1 FROM auth.users) THEN
      RAISE EXCEPTION 'VALIDATION FAILED: no active super_admin';
    END IF;
  END IF;

  SELECT count(*) INTO v_count FROM public.account_locks al
   WHERE al.unlocked_at IS NULL AND (al.expires_at IS NULL OR al.expires_at > now())
     AND NOT public.is_account_blocked(al.user_id);
  IF v_count > 0 THEN RAISE EXCEPTION 'VALIDATION FAILED: % blocked user(s) no longer detected', v_count; END IF;

  RAISE NOTICE 'All validation checks passed.';
END $$;