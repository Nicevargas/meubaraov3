
-- ── Public-callable wrapper: any authenticated user can check their own lock status
CREATE OR REPLACE FUNCTION public.is_account_blocked(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.account_locks
    WHERE user_id = _user_id
      AND unlocked_at IS NULL
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_account_blocked(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_account_blocked(uuid) TO authenticated;

-- ── Hard-delete cascade: removes all per-user rows across schema in one tx.
-- Called server-side only (no anon/authenticated grant). auth.users is removed
-- separately via supabaseAdmin.auth.admin.deleteUser().
CREATE OR REPLACE FUNCTION public.admin_delete_user_data(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.chat_messages WHERE user_id = _user_id;
  DELETE FROM public.favorite_messages WHERE user_id = _user_id;
  DELETE FROM public.emotional_memories WHERE user_id = _user_id;
  DELETE FROM public.emotional_assessments WHERE user_id = _user_id;
  DELETE FROM public.personality_snapshots WHERE user_id = _user_id;
  DELETE FROM public.ai_usage_events WHERE user_id = _user_id;
  DELETE FROM public.ai_usage_daily WHERE user_id = _user_id;
  DELETE FROM public.user_daily_usage WHERE user_id = _user_id;
  DELETE FROM public.memory_consolidation_runs WHERE user_id = _user_id;
  DELETE FROM public.reengagement_queue WHERE user_id = _user_id;
  DELETE FROM public.abuse_signals WHERE user_id = _user_id;
  DELETE FROM public.account_locks WHERE user_id = _user_id;
  DELETE FROM public.premium_history WHERE user_id = _user_id;
  DELETE FROM public.user_plan_assignments WHERE user_id = _user_id;
  DELETE FROM public.payment_retry_attempts WHERE user_id = _user_id;
  DELETE FROM public.payment_anomalies WHERE user_id = _user_id;
  DELETE FROM public.payments WHERE user_id = _user_id;
  DELETE FROM public.subscriptions WHERE user_id = _user_id;
  DELETE FROM public.legal_consents WHERE user_id = _user_id;
  DELETE FROM public.admin_notes WHERE user_id = _user_id;
  DELETE FROM public.endpoint_metrics WHERE user_id = _user_id;
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  DELETE FROM public.profiles WHERE id = _user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_delete_user_data(uuid) FROM PUBLIC, anon, authenticated;
