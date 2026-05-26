-- Backfill plan_id on legacy rows using price_id → plans.plan_code
UPDATE public.subscriptions s
SET plan_id = p.id
FROM public.plans p
WHERE s.plan_id IS NULL
  AND s.price_id IS NOT NULL
  AND p.plan_code = s.price_id;

-- Drop Stripe-specific columns and the unique index they used
ALTER TABLE public.subscriptions
  DROP COLUMN IF EXISTS stripe_customer_id,
  DROP COLUMN IF EXISTS stripe_subscription_id,
  DROP COLUMN IF EXISTS price_id,
  DROP COLUMN IF EXISTS product_id;