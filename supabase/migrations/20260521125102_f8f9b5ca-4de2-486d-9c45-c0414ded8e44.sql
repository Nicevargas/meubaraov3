
-- PLANS ------------------------------------------------------------
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code text NOT NULL,
  tier text NOT NULL CHECK (tier IN ('premium','elite')),
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly','quarterly','annual')),
  name text NOT NULL,
  price_brl numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'BRL',
  mp_preapproval_plan_id text,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_code)
);
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read active plans"
  ON public.plans FOR SELECT TO authenticated
  USING (active = true);
CREATE POLICY "Super admins manage plans"
  ON public.plans FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER plans_set_updated_at BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.plans (plan_code, tier, billing_cycle, name, price_brl, sort_order) VALUES
  ('premium_monthly',   'premium', 'monthly',   'Premium Mensal',     97.00, 10),
  ('premium_quarterly', 'premium', 'quarterly', 'Premium Trimestral',249.00, 20),
  ('premium_annual',    'premium', 'annual',    'Premium Anual',     870.00, 30),
  ('elite_monthly',     'elite',   'monthly',   'Elite Mensal',      297.00, 40),
  ('elite_annual',      'elite',   'annual',    'Elite Anual',      2970.00, 50);

-- SUBSCRIPTIONS extensions -----------------------------------------
ALTER TABLE public.subscriptions
  ALTER COLUMN stripe_subscription_id DROP NOT NULL,
  ALTER COLUMN stripe_customer_id DROP NOT NULL,
  ALTER COLUMN price_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'mercadopago',
  ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.plans(id),
  ADD COLUMN IF NOT EXISTS mp_preapproval_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS mp_payer_id text,
  ADD COLUMN IF NOT EXISTS billing_cycle text,
  ADD COLUMN IF NOT EXISTS next_payment_date timestamptz,
  ADD COLUMN IF NOT EXISTS grace_period_until timestamptz,
  ADD COLUMN IF NOT EXISTS canceled_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_subscriptions_mp_preapproval
  ON public.subscriptions (mp_preapproval_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_active
  ON public.subscriptions (user_id, status);

-- PAYMENTS ---------------------------------------------------------
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subscription_id uuid REFERENCES public.subscriptions(id),
  plan_id uuid REFERENCES public.plans(id),
  provider text NOT NULL DEFAULT 'mercadopago',
  mp_payment_id text UNIQUE,
  mp_preapproval_id text,
  payment_method text NOT NULL CHECK (payment_method IN ('pix','credit_card','debit_card','other')),
  payment_type text NOT NULL CHECK (payment_type IN ('one_off','subscription_initial','subscription_renewal')),
  status text NOT NULL,
  status_detail text,
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'BRL',
  pix_qr_code text,
  pix_qr_code_base64 text,
  pix_expires_at timestamptz,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own payments"
  ON public.payments FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Super admins view all payments"
  ON public.payments FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));
CREATE INDEX idx_payments_user ON public.payments (user_id, created_at DESC);
CREATE INDEX idx_payments_mp_payment_id ON public.payments (mp_payment_id);
CREATE TRIGGER payments_set_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- WEBHOOK EVENTS ---------------------------------------------------
CREATE TABLE public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'mercadopago',
  event_type text NOT NULL,
  external_id text NOT NULL,
  payload jsonb NOT NULL,
  processed_at timestamptz,
  error_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_id, event_type)
);
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins view webhook events"
  ON public.webhook_events FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));
CREATE INDEX idx_webhook_events_processed ON public.webhook_events (processed_at) WHERE processed_at IS NULL;
