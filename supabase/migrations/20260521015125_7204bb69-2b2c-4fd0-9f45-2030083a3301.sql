-- Daily usage counter per user for free-tier rate limiting.
CREATE TABLE public.user_daily_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  usage_date date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  message_count integer NOT NULL DEFAULT 0,
  subscription_type text NOT NULL DEFAULT 'free',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, usage_date)
);

CREATE INDEX idx_user_daily_usage_user_date ON public.user_daily_usage (user_id, usage_date DESC);

ALTER TABLE public.user_daily_usage ENABLE ROW LEVEL SECURITY;

-- Users can view (but never mutate) their own usage rows; writes happen via service role from server fn.
CREATE POLICY "Users view own daily usage"
  ON public.user_daily_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_user_daily_usage_updated_at
  BEFORE UPDATE ON public.user_daily_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
