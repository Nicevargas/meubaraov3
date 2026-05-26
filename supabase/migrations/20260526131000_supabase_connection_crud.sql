-- Minimal Supabase connection CRUD helpers
-- Keeps the new registry table small and exposes the basic operations.

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

CREATE OR REPLACE FUNCTION public.get_supabase_connection(
  p_id TEXT DEFAULT 'default'
)
RETURNS public.supabase_connections
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row public.supabase_connections%ROWTYPE;
BEGIN
  SELECT * INTO row
  FROM public.supabase_connections
  WHERE id = p_id;
  RETURN row;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_supabase_connections()
RETURNS SETOF public.supabase_connections
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
SELECT * FROM public.supabase_connections;
$$;

CREATE OR REPLACE FUNCTION public.delete_supabase_connection(
  p_id TEXT DEFAULT 'default'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.supabase_connections
  WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_supabase_connection(
  p_id TEXT DEFAULT 'default',
  p_client_kind TEXT DEFAULT 'public',
  p_project_id TEXT DEFAULT NULL,
  p_url TEXT DEFAULT NULL
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
  VALUES (p_id, p_client_kind, p_project_id, p_url)
  ON CONFLICT (id) DO UPDATE
    SET client_kind = EXCLUDED.client_kind,
        project_id = EXCLUDED.project_id,
        url = EXCLUDED.url,
        updated_at = now()
  RETURNING * INTO row;

  RETURN row;
END;
$$;

REVOKE ALL ON FUNCTION public.get_supabase_connection(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_supabase_connection(TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.list_supabase_connections() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_supabase_connections() TO service_role;

REVOKE ALL ON FUNCTION public.delete_supabase_connection(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_supabase_connection(TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.save_supabase_connection(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_supabase_connection(TEXT, TEXT, TEXT, TEXT) TO service_role;

COMMENT ON TABLE public.supabase_connections IS 'Catalog of Supabase connection metadata used by the application.';
COMMENT ON FUNCTION public.get_supabase_connection(TEXT) IS 'Read a Supabase connection record by id.';
COMMENT ON FUNCTION public.list_supabase_connections() IS 'List all Supabase connection records.';
COMMENT ON FUNCTION public.delete_supabase_connection(TEXT) IS 'Delete a Supabase connection record by id.';
COMMENT ON FUNCTION public.save_supabase_connection(TEXT, TEXT, TEXT, TEXT) IS 'Insert or update a Supabase connection record.';
