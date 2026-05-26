-- Phase 0: Backups before architecture migration
BEGIN;

CREATE TABLE IF NOT EXISTS public._backup_20260522_subscriptions          AS TABLE public.subscriptions;
CREATE TABLE IF NOT EXISTS public._backup_20260522_pricing_plans          AS TABLE public.pricing_plans;
CREATE TABLE IF NOT EXISTS public._backup_20260522_products               AS TABLE public.products;
CREATE TABLE IF NOT EXISTS public._backup_20260522_product_features       AS TABLE public.product_features;
CREATE TABLE IF NOT EXISTS public._backup_20260522_profiles               AS TABLE public.profiles;
CREATE TABLE IF NOT EXISTS public._backup_20260522_payments               AS TABLE public.payments;
CREATE TABLE IF NOT EXISTS public._backup_20260522_user_roles             AS TABLE public.user_roles;
CREATE TABLE IF NOT EXISTS public._backup_20260522_account_locks          AS TABLE public.account_locks;
CREATE TABLE IF NOT EXISTS public._backup_20260522_plans                  AS TABLE public.plans;
CREATE TABLE IF NOT EXISTS public._backup_20260522_user_plan_assignments  AS TABLE public.user_plan_assignments;
CREATE TABLE IF NOT EXISTS public._backup_20260522_premium_history        AS TABLE public.premium_history;

-- Lock down: only super_admins can read backups
ALTER TABLE public._backup_20260522_subscriptions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._backup_20260522_pricing_plans          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._backup_20260522_products               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._backup_20260522_product_features       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._backup_20260522_profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._backup_20260522_payments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._backup_20260522_user_roles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._backup_20260522_account_locks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._backup_20260522_plans                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._backup_20260522_user_plan_assignments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._backup_20260522_premium_history        ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    '_backup_20260522_subscriptions','_backup_20260522_pricing_plans','_backup_20260522_products',
    '_backup_20260522_product_features','_backup_20260522_profiles','_backup_20260522_payments',
    '_backup_20260522_user_roles','_backup_20260522_account_locks','_backup_20260522_plans',
    '_backup_20260522_user_plan_assignments','_backup_20260522_premium_history'
  ]) LOOP
    EXECUTE format('CREATE POLICY "super_admin_read_%I" ON public.%I FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()))', t, t);
  END LOOP;
END $$;

COMMIT;