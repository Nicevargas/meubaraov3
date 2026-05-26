
-- ============================================================
-- Phase 2A: Operational intelligence data foundation
-- ============================================================

-- 1. App settings (kill switch + global flags)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins read app_settings" ON public.app_settings
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins manage app_settings" ON public.app_settings
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

INSERT INTO public.app_settings (key, value) VALUES
  ('kill_switch', '{"enabled": false, "scope": "free_only", "message": "Service temporarily unavailable"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. Plan limits columns
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS daily_message_limit integer,
  ADD COLUMN IF NOT EXISTS monthly_token_limit bigint,
  ADD COLUMN IF NOT EXISTS soft_limit_pct integer NOT NULL DEFAULT 80;

-- Defaults: free / premium / elite. We key by tier when present, otherwise plan_code prefix.
UPDATE public.plans SET daily_message_limit = 20,   monthly_token_limit = 50000     WHERE tier = 'free';
UPDATE public.plans SET daily_message_limit = 500,  monthly_token_limit = 2000000   WHERE tier = 'premium';
UPDATE public.plans SET daily_message_limit = NULL, monthly_token_limit = 10000000  WHERE tier = 'elite';

-- 3. AI usage events (granular per-message)
CREATE TABLE IF NOT EXISTS public.ai_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  conversation_id uuid,
  model text NOT NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
  est_cost_usd numeric(12,6) NOT NULL DEFAULT 0,
  latency_ms integer,
  status text NOT NULL DEFAULT 'success',
  error_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins read ai_usage_events" ON public.ai_usage_events
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_user_created
  ON public.ai_usage_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_created
  ON public.ai_usage_events (created_at DESC);

-- 4. AI usage daily rollup
CREATE TABLE IF NOT EXISTS public.ai_usage_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  usage_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'UTC')::date),
  message_count integer NOT NULL DEFAULT 0,
  input_tokens bigint NOT NULL DEFAULT 0,
  output_tokens bigint NOT NULL DEFAULT 0,
  total_tokens bigint NOT NULL DEFAULT 0,
  est_cost_usd numeric(12,6) NOT NULL DEFAULT 0,
  session_minutes integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, usage_date)
);
ALTER TABLE public.ai_usage_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own ai_usage_daily" ON public.ai_usage_daily
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Super admins read all ai_usage_daily" ON public.ai_usage_daily
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_ai_usage_daily_user_date
  ON public.ai_usage_daily (user_id, usage_date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_daily_date
  ON public.ai_usage_daily (usage_date DESC);

-- 5. User segments
CREATE TABLE IF NOT EXISTS public.user_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  segment text NOT NULL,
  score numeric(6,3) NOT NULL DEFAULT 0,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, segment)
);
ALTER TABLE public.user_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins read user_segments" ON public.user_segments
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_user_segments_user ON public.user_segments (user_id);
CREATE INDEX IF NOT EXISTS idx_user_segments_segment ON public.user_segments (segment);

-- 6. Premium history (audit trail of every plan/status transition)
CREATE TABLE IF NOT EXISTS public.premium_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid,
  plan_code text,
  status text NOT NULL,
  reason text,
  actor text NOT NULL DEFAULT 'system',
  actor_id uuid,
  payment_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.premium_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own premium_history" ON public.premium_history
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Super admins read all premium_history" ON public.premium_history
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_premium_history_user_occurred
  ON public.premium_history (user_id, occurred_at DESC);

-- 7. Admin actions log (every admin server fn call)
CREATE TABLE IF NOT EXISTS public.admin_actions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  actor_email text,
  action_type text NOT NULL,
  target_type text,
  target_id text,
  ip_hash text,
  user_agent text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'success',
  error_text text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_actions_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins read admin_actions_log" ON public.admin_actions_log
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_admin_actions_log_actor_occurred
  ON public.admin_actions_log (actor_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_actions_log_action_type
  ON public.admin_actions_log (action_type, occurred_at DESC);

-- 8. Abuse signals
CREATE TABLE IF NOT EXISTS public.abuse_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  ip_hash text,
  signal_type text NOT NULL,
  severity text NOT NULL DEFAULT 'low',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.abuse_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins read abuse_signals" ON public.abuse_signals
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_abuse_signals_user_created
  ON public.abuse_signals (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_abuse_signals_type_created
  ON public.abuse_signals (signal_type, created_at DESC);

-- 9. Account locks
CREATE TABLE IF NOT EXISTS public.account_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reason text NOT NULL,
  severity text NOT NULL DEFAULT 'temp',
  locked_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  unlocked_at timestamptz,
  unlocked_by uuid,
  locked_by uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE public.account_locks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own account_locks" ON public.account_locks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Super admins read all account_locks" ON public.account_locks
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_account_locks_user_active
  ON public.account_locks (user_id, expires_at, unlocked_at);

-- 10. Rate limit buckets (token-bucket counters)
CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  bucket_key text PRIMARY KEY,
  count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins read rate_limit_buckets" ON public.rate_limit_buckets
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_updated
  ON public.rate_limit_buckets (updated_at DESC);

-- 11. Helper: atomic token-bucket increment.
-- Returns the count AFTER increment within the current window.
CREATE OR REPLACE FUNCTION public.bump_rate_limit(
  _bucket_key text,
  _window_seconds integer,
  _increment integer DEFAULT 1
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_count integer;
BEGIN
  INSERT INTO public.rate_limit_buckets (bucket_key, count, window_start, updated_at)
  VALUES (_bucket_key, _increment, now(), now())
  ON CONFLICT (bucket_key) DO UPDATE
    SET
      count = CASE
        WHEN public.rate_limit_buckets.window_start < now() - (_window_seconds || ' seconds')::interval
          THEN _increment
        ELSE public.rate_limit_buckets.count + _increment
      END,
      window_start = CASE
        WHEN public.rate_limit_buckets.window_start < now() - (_window_seconds || ' seconds')::interval
          THEN now()
        ELSE public.rate_limit_buckets.window_start
      END,
      updated_at = now()
  RETURNING count INTO v_new_count;

  RETURN v_new_count;
END;
$$;

-- 12. Helper: check whether a user is currently locked
CREATE OR REPLACE FUNCTION public.is_user_locked(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.account_locks
    WHERE user_id = _user_id
      AND unlocked_at IS NULL
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- 13. updated_at triggers
CREATE TRIGGER trg_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_ai_usage_daily_updated_at
  BEFORE UPDATE ON public.ai_usage_daily
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_rate_limit_buckets_updated_at
  BEFORE UPDATE ON public.rate_limit_buckets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
