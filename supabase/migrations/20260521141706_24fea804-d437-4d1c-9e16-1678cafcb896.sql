-- ── Tables ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.reengagement_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  channel text NOT NULL DEFAULT 'email', -- email | whatsapp | push | in_app
  reason text NOT NULL, -- inactive | churn_risk | payment_failed | premium_renewal | abandoned_conversation | streak_reminder
  status text NOT NULL DEFAULT 'pending', -- pending | sent | skipped | failed
  dedupe_key text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  error_text text,
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_reengagement_queue_status_sched
  ON public.reengagement_queue (status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_reengagement_queue_user
  ON public.reengagement_queue (user_id, created_at DESC);

ALTER TABLE public.reengagement_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins read reengagement_queue"
  ON public.reengagement_queue FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE TRIGGER reengagement_queue_set_updated_at
  BEFORE UPDATE ON public.reengagement_queue
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


CREATE TABLE IF NOT EXISTS public.daily_ops_reports (
  report_date date PRIMARY KEY,
  new_signups int NOT NULL DEFAULT 0,
  active_users int NOT NULL DEFAULT 0,
  messages_sent int NOT NULL DEFAULT 0,
  ai_cost_usd numeric NOT NULL DEFAULT 0,
  payments_approved int NOT NULL DEFAULT 0,
  payments_failed int NOT NULL DEFAULT 0,
  webhook_errors int NOT NULL DEFAULT 0,
  mrr_brl numeric NOT NULL DEFAULT 0,
  active_subscriptions int NOT NULL DEFAULT 0,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_ops_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins read daily_ops_reports"
  ON public.daily_ops_reports FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));


CREATE TABLE IF NOT EXISTS public.payment_retry_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL,
  user_id uuid NOT NULL,
  attempt_number int NOT NULL DEFAULT 1,
  status text NOT NULL, -- queued | succeeded | failed | abandoned
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_retry_payment
  ON public.payment_retry_attempts (payment_id, attempted_at DESC);

ALTER TABLE public.payment_retry_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins read payment_retry_attempts"
  ON public.payment_retry_attempts FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));


-- ── Cron jobs ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  END IF;
END $$;
-- Unschedule first in case they already exist (idempotent rerun)
DO $$
BEGIN
  PERFORM cron.unschedule('failed-payment-retry-30min');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$
BEGIN
  PERFORM cron.unschedule('inactive-detection-daily');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$
BEGIN
  PERFORM cron.unschedule('stale-session-cleanup-daily');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$
BEGIN
  PERFORM cron.unschedule('daily-ops-report');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$
BEGIN
  PERFORM cron.unschedule('orphan-payment-reconciliation-2h');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'failed-payment-retry-30min',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://meubarao.lovable.app/api/public/jobs/failed-payment-retry',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'inactive-detection-daily',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://meubarao.lovable.app/api/public/jobs/inactive-detection',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'stale-session-cleanup-daily',
  '15 4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://meubarao.lovable.app/api/public/jobs/stale-session-cleanup',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'daily-ops-report',
  '0 5 * * *',
  $$
  SELECT net.http_post(
    url := 'https://meubarao.lovable.app/api/public/jobs/daily-ops-report',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'orphan-payment-reconciliation-2h',
  '23 */2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://meubarao.lovable.app/api/public/jobs/orphan-payment-reconciliation',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);