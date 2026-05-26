-- Endpoint latency ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.endpoint_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL,
  method text NOT NULL DEFAULT 'POST',
  status_code int NOT NULL DEFAULT 200,
  latency_ms int NOT NULL DEFAULT 0,
  user_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_endpoint_metrics_path_time
  ON public.endpoint_metrics (path, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_endpoint_metrics_time
  ON public.endpoint_metrics (occurred_at DESC);
ALTER TABLE public.endpoint_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins read endpoint_metrics"
  ON public.endpoint_metrics FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Admin login attempts -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_hash text,
  success boolean NOT NULL DEFAULT false,
  user_agent text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_email_time
  ON public.admin_login_attempts (lower(email), attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_ip_time
  ON public.admin_login_attempts (ip_hash, attempted_at DESC);
ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins read admin_login_attempts"
  ON public.admin_login_attempts FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Payment anomalies --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_anomalies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anomaly_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  user_id uuid,
  payment_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  detected_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_payment_anomalies_time
  ON public.payment_anomalies (detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_anomalies_type
  ON public.payment_anomalies (anomaly_type, detected_at DESC);
ALTER TABLE public.payment_anomalies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins read payment_anomalies"
  ON public.payment_anomalies FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Brute-force gate ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_admin_login_attempt(
  _email text,
  _ip_hash text,
  _success boolean,
  _user_agent text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent_failures int;
BEGIN
  INSERT INTO public.admin_login_attempts (email, ip_hash, success, user_agent)
  VALUES (lower(_email), _ip_hash, _success, _user_agent);

  SELECT COUNT(*) INTO v_recent_failures
  FROM public.admin_login_attempts
  WHERE success = false
    AND attempted_at > now() - interval '15 minutes'
    AND (
      lower(email) = lower(_email)
      OR (ip_hash IS NOT NULL AND ip_hash = _ip_hash)
    );

  RETURN jsonb_build_object(
    'recent_failures', v_recent_failures,
    'blocked', v_recent_failures >= 5
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.register_admin_login_attempt(text, text, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_admin_login_attempt(text, text, boolean, text) TO service_role;

-- Cron job: payment anomaly detection -------------------------------------
DO $$ BEGIN PERFORM cron.unschedule('payment-anomaly-detection-daily'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'payment-anomaly-detection-daily',
  '15 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://meubarao.lovable.app/api/public/jobs/payment-anomaly-detection',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);