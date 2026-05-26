-- Structured Supabase connection registry
-- Stores the canonical connection metadata for the public and service clients.

CREATE TABLE IF NOT EXISTS public.supabase_connections (
  id TEXT PRIMARY KEY DEFAULT 'default',
  client_kind TEXT NOT NULL CHECK (client_kind IN ('public', 'service_role', 'admin')),
  project_id TEXT,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.supabase_connections ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "service_role_can_manage_supabase_connections"
    ON public.supabase_connections
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END
$$;

CREATE OR REPLACE FUNCTION public.upsert_supabase_connection(
  p_client_kind TEXT,
  p_project_id TEXT,
  p_url TEXT
)
RETURNS public.supabase_connections
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row public.supabase_connections%ROWTYPE;
BEGIN
  INSERT INTO public.supabase_connections (id, client_kind, project_id, url)
  VALUES ('default', p_client_kind, p_project_id, p_url)
  ON CONFLICT (id) DO UPDATE
    SET client_kind = EXCLUDED.client_kind,
        project_id = EXCLUDED.project_id,
        url = EXCLUDED.url,
        updated_at = now()
  RETURNING * INTO row;

  RETURN row;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_supabase_connection(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_supabase_connection(TEXT, TEXT, TEXT) TO service_role;

COMMENT ON TABLE public.supabase_connections IS 'Catalog of Supabase connection metadata used by the application.';
COMMENT ON FUNCTION public.upsert_supabase_connection(TEXT, TEXT, TEXT) IS 'Upserts the canonical Supabase connection metadata for the application.';
