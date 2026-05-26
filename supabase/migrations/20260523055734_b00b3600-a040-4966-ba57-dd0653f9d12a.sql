
CREATE TABLE IF NOT EXISTS public.memory_identity_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  key text NOT NULL,
  prev_value text,
  new_value text,
  confidence numeric(3,2) NOT NULL DEFAULT 0,
  evidence_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'probabilistic'
    CHECK (status IN ('probabilistic','reinforced','reverted','cleared')),
  reason text,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mih_user_recorded ON public.memory_identity_history(user_id, recorded_at DESC);

ALTER TABLE public.memory_identity_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY mih_admin_read ON public.memory_identity_history
  FOR SELECT TO authenticated USING (is_super_admin(auth.uid()));
CREATE POLICY mih_own_read ON public.memory_identity_history
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.memory_job_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL CHECK (job_name IN ('ttl_sweep','consolidation')),
  status text NOT NULL DEFAULT 'running'
    CHECK (status IN ('running','success','error','skipped')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text
);
CREATE INDEX IF NOT EXISTS idx_mjr_job_started ON public.memory_job_runs(job_name, started_at DESC);

ALTER TABLE public.memory_job_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY mjr_admin_read ON public.memory_job_runs
  FOR SELECT TO authenticated USING (is_super_admin(auth.uid()));
