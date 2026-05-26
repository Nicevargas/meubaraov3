
-- ──────────────────────────────────────────────────────────────
-- admin_notes
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  author_id uuid NOT NULL,
  author_email text,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('general','vip','payment','abuse','support','billing')),
  pinned boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_notes_user ON public.admin_notes(user_id, created_at DESC) WHERE deleted_at IS NULL;
ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins manage admin_notes" ON public.admin_notes;
CREATE POLICY "Super admins manage admin_notes" ON public.admin_notes
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_admin_notes_updated_at
  BEFORE UPDATE ON public.admin_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ──────────────────────────────────────────────────────────────
-- user_plan_assignments
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_plan_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid,
  plan_code text NOT NULL,
  assignment_type text NOT NULL CHECK (assignment_type IN ('manual','lifetime','temporary','billing','trial')),
  granted_by uuid,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid,
  reason text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_upa_user_active ON public.user_plan_assignments(user_id) WHERE revoked_at IS NULL;
ALTER TABLE public.user_plan_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins manage plan assignments" ON public.user_plan_assignments;
CREATE POLICY "Super admins manage plan assignments" ON public.user_plan_assignments
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Users read own plan assignments" ON public.user_plan_assignments;
CREATE POLICY "Users read own plan assignments" ON public.user_plan_assignments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────
-- profiles: status columns
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_reason text,
  ADD COLUMN IF NOT EXISTS email_verified_manually_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz;

-- Extend the existing self-update protection to also lock the new columns
CREATE OR REPLACE FUNCTION public.prevent_plan_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('role', true) <> 'service_role'
     AND (auth.jwt() ->> 'role') <> 'service_role'
  THEN
    IF NEW.plan IS DISTINCT FROM OLD.plan THEN NEW.plan := OLD.plan; END IF;
    IF NEW.suspended_at IS DISTINCT FROM OLD.suspended_at THEN NEW.suspended_at := OLD.suspended_at; END IF;
    IF NEW.suspended_reason IS DISTINCT FROM OLD.suspended_reason THEN NEW.suspended_reason := OLD.suspended_reason; END IF;
    IF NEW.email_verified_manually_at IS DISTINCT FROM OLD.email_verified_manually_at THEN NEW.email_verified_manually_at := OLD.email_verified_manually_at; END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_profiles_prevent_self_update ON public.profiles;
CREATE TRIGGER trg_profiles_prevent_self_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_plan_self_update();

-- ──────────────────────────────────────────────────────────────
-- apply_manual_plan: atomic plan switch with audit
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.apply_manual_plan(
  _user_id uuid,
  _plan_code text,
  _assignment_type text,
  _expires_at timestamptz,
  _reason text,
  _actor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_plan public.plans%ROWTYPE;
  v_old_plan text;
  v_assignment_id uuid;
BEGIN
  SELECT * INTO v_plan FROM public.plans WHERE plan_code = _plan_code AND active = true LIMIT 1;
  IF v_plan.id IS NULL AND _plan_code <> 'free' THEN
    RAISE EXCEPTION 'Plan % not found or inactive', _plan_code;
  END IF;

  SELECT plan INTO v_old_plan FROM public.profiles WHERE id = _user_id;

  -- Revoke any active assignment
  UPDATE public.user_plan_assignments
    SET revoked_at = now(), revoked_by = _actor_id
    WHERE user_id = _user_id AND revoked_at IS NULL;

  -- New assignment row
  INSERT INTO public.user_plan_assignments
    (user_id, plan_id, plan_code, assignment_type, granted_by, expires_at, reason)
  VALUES
    (_user_id, v_plan.id, _plan_code, _assignment_type, _actor_id, _expires_at, _reason)
  RETURNING id INTO v_assignment_id;

  -- Update profile plan
  UPDATE public.profiles SET plan = _plan_code, updated_at = now() WHERE id = _user_id;

  -- premium history
  INSERT INTO public.premium_history
    (user_id, plan_id, plan_code, status, reason, actor, actor_id, details)
  VALUES
    (_user_id, v_plan.id, _plan_code,
     CASE WHEN _plan_code = 'free' THEN 'revoked' ELSE 'active' END,
     _reason, 'admin', _actor_id,
     jsonb_build_object('assignment_type', _assignment_type, 'expires_at', _expires_at, 'previous_plan', v_old_plan));

  -- audit
  INSERT INTO public.admin_audit_log
    (actor_id, target_id, action, old_role, new_role, details)
  VALUES
    (_actor_id, _user_id, 'plan_assigned', v_old_plan, _plan_code,
     jsonb_build_object('assignment_type', _assignment_type, 'expires_at', _expires_at, 'reason', _reason));

  RETURN jsonb_build_object('assignment_id', v_assignment_id, 'old_plan', v_old_plan, 'new_plan', _plan_code);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_manual_plan(uuid,text,text,timestamptz,text,uuid) FROM PUBLIC, authenticated, anon;

-- ──────────────────────────────────────────────────────────────
-- last_activity_at bump trigger (chat messages)
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.bump_last_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles SET last_activity_at = now() WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chat_bump_activity ON public.chat_messages;
CREATE TRIGGER trg_chat_bump_activity
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_last_activity();
