-- 1. Allow 'semiannual' billing cycle
ALTER TABLE public.plans DROP CONSTRAINT IF EXISTS plans_billing_cycle_check;
ALTER TABLE public.plans ADD CONSTRAINT plans_billing_cycle_check
  CHECK (billing_cycle = ANY (ARRAY['monthly','quarterly','semiannual','annual','lifetime','trial']));

-- 2. Seed canonical 8 paid plans (premium/elite × monthly/quarterly/semiannual/annual).
--    Existing premium_monthly and elite_monthly rows are preserved via ON CONFLICT,
--    keeping their UUIDs so existing subscriptions.plan_id FKs remain valid.
INSERT INTO public.plans
  (plan_code, tier, billing_cycle, name, price_brl, currency, active, sort_order, billing_enabled,
   description, daily_message_limit, soft_limit_pct, ai_priority, featured, badge_label)
VALUES
  ('premium_monthly',    'premium', 'monthly',    'Premium Mensal',      97.00,  'BRL', true, 10, true,
   'A relação começa de verdade.', NULL, 80, 1, true,  NULL),
  ('premium_quarterly',  'premium', 'quarterly',  'Premium Trimestral',  261.00, 'BRL', true, 11, true,
   'A relação começa de verdade.', NULL, 80, 1, false, '10% off'),
  ('premium_semiannual', 'premium', 'semiannual', 'Premium Semestral',   489.00, 'BRL', true, 12, true,
   'A relação começa de verdade.', NULL, 80, 1, false, '16% off'),
  ('premium_annual',     'premium', 'annual',     'Premium Anual',       873.00, 'BRL', true, 13, true,
   'A relação começa de verdade.', NULL, 80, 1, false, '25% off'),
  ('elite_monthly',      'elite',   'monthly',    'Elite Mensal',        297.00, 'BRL', true, 40, true,
   'Intimidade ultra personalizada.', NULL, 80, 2, false, NULL),
  ('elite_quarterly',    'elite',   'quarterly',  'Elite Trimestral',    802.00, 'BRL', true, 41, true,
   'Intimidade ultra personalizada.', NULL, 80, 2, false, '10% off'),
  ('elite_semiannual',   'elite',   'semiannual', 'Elite Semestral',     1485.00,'BRL', true, 42, true,
   'Intimidade ultra personalizada.', NULL, 80, 2, false, '17% off'),
  ('elite_annual',       'elite',   'annual',     'Elite Anual',         2673.00,'BRL', true, 43, true,
   'Intimidade ultra personalizada.', NULL, 80, 2, false, '25% off')
ON CONFLICT (plan_code) DO UPDATE SET
  tier = EXCLUDED.tier,
  billing_cycle = EXCLUDED.billing_cycle,
  name = EXCLUDED.name,
  active = true,
  billing_enabled = true,
  sort_order = EXCLUDED.sort_order,
  badge_label = COALESCE(public.plans.badge_label, EXCLUDED.badge_label),
  updated_at = now();

-- 3. Archive the legacy test plan so it stops appearing in public listings.
UPDATE public.plans
  SET active = false, archived_at = COALESCE(archived_at, now())
  WHERE plan_code = 'plano_teste';