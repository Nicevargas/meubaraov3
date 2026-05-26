
-- Wipe legacy free-tier-polluted memory data, keep table for backwards compat reads during cutover
TRUNCATE TABLE public.emotional_memories;

-- ============================================================================
-- temporary_conversation_chunks: short-lived raw context
-- ============================================================================
CREATE TABLE public.temporary_conversation_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  token_estimate integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);
CREATE INDEX idx_tcc_user_created ON public.temporary_conversation_chunks(user_id, created_at DESC);
CREATE INDEX idx_tcc_expires ON public.temporary_conversation_chunks(expires_at);
ALTER TABLE public.temporary_conversation_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tcc_select_own" ON public.temporary_conversation_chunks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "tcc_insert_own" ON public.temporary_conversation_chunks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tcc_delete_own" ON public.temporary_conversation_chunks FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "tcc_admin_read" ON public.temporary_conversation_chunks FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

-- ============================================================================
-- user_memory_events: scored, decaying, TTL-bounded emotional events
-- ============================================================================
CREATE TABLE public.user_memory_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,                 -- e.g. relationship_loss, work_stress
  canonical_key text NOT NULL,            -- dedup bucket key
  entry_type text NOT NULL DEFAULT 'emotion' CHECK (entry_type IN ('fact','belief','emotion','fantasy','roleplay','preference')),
  emotion text,
  intensity numeric(3,2) NOT NULL DEFAULT 0.50 CHECK (intensity BETWEEN 0 AND 1),
  content text NOT NULL,                  -- compressed phrase, max ~200 chars
  confidence numeric(3,2) NOT NULL DEFAULT 0.50 CHECK (confidence BETWEEN 0 AND 1),
  importance numeric(3,2) NOT NULL DEFAULT 0.50 CHECK (importance BETWEEN 0 AND 1),
  emotional_weight numeric(3,2) NOT NULL DEFAULT 0.50 CHECK (emotional_weight BETWEEN 0 AND 1),
  reinforcement_count integer NOT NULL DEFAULT 1,
  decay_score numeric(4,3) NOT NULL DEFAULT 0.500,
  last_reinforced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);
CREATE INDEX idx_ume_user_score ON public.user_memory_events(user_id, decay_score DESC);
CREATE INDEX idx_ume_user_canonical ON public.user_memory_events(user_id, canonical_key);
CREATE INDEX idx_ume_expires ON public.user_memory_events(expires_at);
ALTER TABLE public.user_memory_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ume_select_own" ON public.user_memory_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ume_delete_own" ON public.user_memory_events FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ume_admin_read" ON public.user_memory_events FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

-- ============================================================================
-- user_memory_summaries: compressed semantic clusters
-- ============================================================================
CREATE TABLE public.user_memory_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  theme text NOT NULL,                    -- e.g. "longing for ex-partner"
  summary text NOT NULL,                  -- compressed semantic statement
  source_event_count integer NOT NULL DEFAULT 0,
  importance numeric(3,2) NOT NULL DEFAULT 0.50,
  emotional_weight numeric(3,2) NOT NULL DEFAULT 0.50,
  confidence numeric(3,2) NOT NULL DEFAULT 0.50,
  decay_score numeric(4,3) NOT NULL DEFAULT 0.500,
  last_reinforced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ums_user_score ON public.user_memory_summaries(user_id, decay_score DESC);
ALTER TABLE public.user_memory_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ums_select_own" ON public.user_memory_summaries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ums_delete_own" ON public.user_memory_summaries FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ums_admin_read" ON public.user_memory_summaries FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

-- ============================================================================
-- user_identity_memory: 1 row per user, psychological profile
-- ============================================================================
CREATE TABLE public.user_identity_memory (
  user_id uuid PRIMARY KEY,
  profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- profile shape: {attachment_style, communication_style, relationship_patterns[], core_needs[], confidence}
  evidence_count integer NOT NULL DEFAULT 0,
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_identity_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "uim_select_own" ON public.user_identity_memory FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "uim_delete_own" ON public.user_identity_memory FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "uim_admin_read" ON public.user_identity_memory FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

-- ============================================================================
-- user_emotional_state: current mood, overwritten over time
-- ============================================================================
CREATE TABLE public.user_emotional_state (
  user_id uuid PRIMARY KEY,
  primary_emotion text,
  secondary_emotion text,
  intensity numeric(3,2) NOT NULL DEFAULT 0.50,
  context_summary text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_emotional_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ues_select_own" ON public.user_emotional_state FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ues_admin_read" ON public.user_emotional_state FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

-- ============================================================================
-- archived_memory: cold compressed long-tail (Elite only)
-- ============================================================================
CREATE TABLE public.archived_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,
  compressed_summary text NOT NULL,
  source_count integer NOT NULL DEFAULT 1,
  archived_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_archived_user ON public.archived_memory(user_id, archived_at DESC);
ALTER TABLE public.archived_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "arch_select_own" ON public.archived_memory FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "arch_delete_own" ON public.archived_memory FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "arch_admin_read" ON public.archived_memory FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

-- ============================================================================
-- Cron schedules (TTL sweep hourly, consolidation every 6h)
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Hourly TTL sweep — pure SQL, no HTTP needed
SELECT cron.schedule(
  'memory-ttl-sweep-hourly',
  '0 * * * *',
  $$
  DELETE FROM public.temporary_conversation_chunks WHERE expires_at < now();
  DELETE FROM public.user_memory_events WHERE expires_at < now();
  $$
);

-- 6-hourly consolidation via existing endpoint
SELECT cron.schedule(
  'memory-consolidation-6h',
  '15 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://meubarao.lovable.app/api/public/jobs/memory-consolidation',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6cmdmYXp3ZWN2Y25qaXhobmFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMTg2ODQsImV4cCI6MjA5NDc5NDY4NH0.FaR7N_hUr3bgbVLLr9uiJC8ITg8UjZLgUe_hY-dWL8E"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
