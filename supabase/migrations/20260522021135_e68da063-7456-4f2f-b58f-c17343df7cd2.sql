
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS essence_phrase text,
  ADD COLUMN IF NOT EXISTS emotional_state text,
  ADD COLUMN IF NOT EXISTS ritual_style text;

CREATE TABLE IF NOT EXISTS public.favorite_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  note text,
  message_created_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, message_id)
);

CREATE INDEX IF NOT EXISTS favorite_messages_user_created_idx
  ON public.favorite_messages (user_id, created_at DESC);

ALTER TABLE public.favorite_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fav_select_own" ON public.favorite_messages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "fav_insert_own" ON public.favorite_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "fav_update_own" ON public.favorite_messages
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "fav_delete_own" ON public.favorite_messages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
