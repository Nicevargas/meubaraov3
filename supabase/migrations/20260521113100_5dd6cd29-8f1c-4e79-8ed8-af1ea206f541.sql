
-- 1. Extend role enum with 'moderator'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum WHERE enumtypid = 'public.app_role'::regtype AND enumlabel = 'moderator'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'moderator';
  END IF;
END$$;

-- 2. Audit log table
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at  timestamptz NOT NULL DEFAULT now(),
  actor_id     uuid,
  actor_email  text,
  target_id    uuid,
  target_email text,
  action       text NOT NULL,
  old_role     text,
  new_role     text,
  ip_address   text,
  details      jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS admin_audit_log_target_idx ON public.admin_audit_log(target_id);
CREATE INDEX IF NOT EXISTS admin_audit_log_actor_idx ON public.admin_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS admin_audit_log_occurred_idx ON public.admin_audit_log(occurred_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins view audit log" ON public.admin_audit_log;
CREATE POLICY "Super admins view audit log"
  ON public.admin_audit_log FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- 3. Root-owner protection (admin@meubarao.com may never lose super_admin)
CREATE OR REPLACE FUNCTION public.is_root_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = _user_id
      AND lower(email) = 'admin@meubarao.com'
  );
$$;

-- 4. Trigger: protect last super_admin + root owner; audit every change
CREATE OR REPLACE FUNCTION public.protect_and_audit_user_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_super int;
  v_actor uuid := auth.uid();
  v_actor_email text;
  v_target_email text;
BEGIN
  -- Root owner immutability for super_admin role
  IF TG_OP = 'DELETE' AND OLD.role = 'super_admin' AND public.is_root_owner(OLD.user_id) THEN
    RAISE EXCEPTION 'Root owner super_admin privileges cannot be revoked.';
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.role = 'super_admin'
     AND NEW.disabled_at IS NOT NULL
     AND public.is_root_owner(OLD.user_id) THEN
    RAISE EXCEPTION 'Root owner super_admin role cannot be disabled.';
  END IF;

  -- Last active super_admin protection
  IF TG_OP = 'DELETE' AND OLD.role = 'super_admin' THEN
    SELECT public.count_active_super_admins() INTO v_active_super;
    IF v_active_super <= 1 THEN
      RAISE EXCEPTION 'Cannot delete the last active super_admin.';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.role = 'super_admin'
     AND OLD.disabled_at IS NULL
     AND NEW.disabled_at IS NOT NULL THEN
    SELECT public.count_active_super_admins() INTO v_active_super;
    IF v_active_super <= 1 THEN
      RAISE EXCEPTION 'Cannot disable the last active super_admin.';
    END IF;
  END IF;

  -- Audit log entry
  SELECT email INTO v_actor_email FROM auth.users WHERE id = v_actor;
  SELECT email INTO v_target_email FROM auth.users
    WHERE id = COALESCE(NEW.user_id, OLD.user_id);

  INSERT INTO public.admin_audit_log
    (actor_id, actor_email, target_id, target_email, action, old_role, new_role, details)
  VALUES (
    v_actor,
    v_actor_email,
    COALESCE(NEW.user_id, OLD.user_id),
    v_target_email,
    CASE
      WHEN TG_OP = 'INSERT' THEN 'role_granted'
      WHEN TG_OP = 'DELETE' THEN 'role_revoked'
      WHEN TG_OP = 'UPDATE' AND OLD.disabled_at IS NULL AND NEW.disabled_at IS NOT NULL THEN 'role_disabled'
      WHEN TG_OP = 'UPDATE' AND OLD.disabled_at IS NOT NULL AND NEW.disabled_at IS NULL THEN 'role_enabled'
      ELSE 'role_updated'
    END,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN OLD.role::text ELSE NULL END,
    CASE WHEN TG_OP IN ('UPDATE','INSERT') THEN NEW.role::text ELSE NULL END,
    jsonb_build_object(
      'op', TG_OP,
      'disabled_at_old', OLD.disabled_at,
      'disabled_at_new', NEW.disabled_at,
      'must_change_password_old', OLD.must_change_password,
      'must_change_password_new', NEW.must_change_password
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_and_audit_user_roles ON public.user_roles;
CREATE TRIGGER trg_protect_and_audit_user_roles
  BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_and_audit_user_roles();

-- 5. Seed an audit entry for the manual demotion just performed
INSERT INTO public.admin_audit_log (actor_email, target_email, action, old_role, new_role, details)
VALUES (
  'system',
  'gioser.serdyuk@gmail.com',
  'role_revoked',
  'super_admin',
  NULL,
  jsonb_build_object('source', 'security_incident_response', 'reason', 'unauthorized super_admin removed')
);
