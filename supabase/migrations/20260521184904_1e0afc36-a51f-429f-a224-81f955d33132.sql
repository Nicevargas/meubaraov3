CREATE TABLE IF NOT EXISTS public.personality_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  avg_msg_length numeric NOT NULL DEFAULT 0,
  msg_count_window int NOT NULL DEFAULT 0,
  dominant_emotion text,
  emotion_distribution jsonb NOT NULL DEFAULT '{}'::jsonb,
  memory_count int NOT NULL DEFAULT 0,
  segment text,
  drift_score numeric NOT NULL DEFAULT 0,
  drift_signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_personality_snapshots_user
  ON public.personality_snapshots (user_id, captured_at DESC);
ALTER TABLE public.personality_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins read personality_snapshots"
  ON public.personality_snapshots FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Users read own personality_snapshots"
  ON public.personality_snapshots FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.memory_consolidation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ran_at timestamptz NOT NULL DEFAULT now(),
  before_count int NOT NULL DEFAULT 0,
  after_count int NOT NULL DEFAULT 0,
  removed_count int NOT NULL DEFAULT 0,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_memory_consolidation_runs_user
  ON public.memory_consolidation_runs (user_id, ran_at DESC);
ALTER TABLE public.memory_consolidation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins read memory_consolidation_runs"
  ON public.memory_consolidation_runs FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

DO $$ BEGIN PERFORM cron.unschedule('memory-consolidation-daily'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('personality-drift-daily'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'memory-consolidation-daily',
  '30 4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://meubarao.lovable.app/api/public/jobs/memory-consolidation',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'personality-drift-daily',
  '45 5 * * *',
  $$
  SELECT net.http_post(
    url := 'https://meubarao.lovable.app/api/public/jobs/personality-drift',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);