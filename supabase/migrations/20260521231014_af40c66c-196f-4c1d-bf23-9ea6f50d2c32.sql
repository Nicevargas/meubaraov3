
-- Extend plans with admin-managed fields
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS long_description text,
  ADD COLUMN IF NOT EXISTS promo_price_brl numeric,
  ADD COLUMN IF NOT EXISTS trial_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS badge_label text,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS max_conversations integer,
  ADD COLUMN IF NOT EXISTS memory_context_size integer,
  ADD COLUMN IF NOT EXISTS ai_priority integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS premium_features jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS vip_features jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS mp_product_id text,
  ADD COLUMN IF NOT EXISTS mp_checkout_reference text,
  ADD COLUMN IF NOT EXISTS billing_enabled boolean NOT NULL DEFAULT true;

-- updated_at trigger (idempotent)
DROP TRIGGER IF EXISTS plans_set_updated_at ON public.plans;
CREATE TRIGGER plans_set_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Guard: prevent deleting plans that still have subscribers, and protect the free placeholder
CREATE OR REPLACE FUNCTION public.protect_plan_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active int;
BEGIN
  IF OLD.plan_code = 'free' THEN
    RAISE EXCEPTION 'The built-in free plan cannot be deleted.';
  END IF;

  SELECT COUNT(*) INTO v_active
  FROM public.subscriptions
  WHERE plan_id = OLD.id
    AND status IN ('active','authorized','trialing','past_due','in_process','pending');
  IF v_active > 0 THEN
    RAISE EXCEPTION 'Cannot delete plan % — % active subscription(s) reference it. Archive instead.', OLD.plan_code, v_active;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS plans_protect_delete ON public.plans;
CREATE TRIGGER plans_protect_delete
  BEFORE DELETE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.protect_plan_delete();
