REVOKE ALL ON FUNCTION public.resolve_user_entitlement(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.touch_subscription_state(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_user_entitlement(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.touch_subscription_state(uuid) TO service_role;