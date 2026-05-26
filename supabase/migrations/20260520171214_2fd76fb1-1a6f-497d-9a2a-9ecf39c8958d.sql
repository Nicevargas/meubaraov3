
CREATE TABLE public.emotional_memories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  memory_type text NOT NULL DEFAULT 'general',
  content text NOT NULL,
  emotion text,
  importance integer NOT NULL DEFAULT 3,
  is_paused boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

ALTER TABLE public.emotional_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own memories"
ON public.emotional_memories FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own memories"
ON public.emotional_memories FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own memories"
ON public.emotional_memories FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own memories"
ON public.emotional_memories FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_emotional_memories_user_active
  ON public.emotional_memories (user_id, is_paused, importance DESC, last_used_at DESC NULLS LAST);

CREATE TRIGGER emotional_memories_set_updated_at
BEFORE UPDATE ON public.emotional_memories
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
