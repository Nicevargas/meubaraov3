CREATE TABLE public.waitlist (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  source text NOT NULL DEFAULT 'maintenance',
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX waitlist_email_source_uidx
  ON public.waitlist (lower(email), source);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join the waitlist"
  ON public.waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(email) BETWEEN 3 AND 255
    AND email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'
    AND source IN ('maintenance')
  );

CREATE POLICY "Super admins read waitlist"
  ON public.waitlist
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins manage waitlist"
  ON public.waitlist
  FOR DELETE
  TO authenticated
  USING (public.is_super_admin(auth.uid()));