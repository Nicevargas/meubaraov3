import { createFileRoute, Outlet, Navigate, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { checkAccountStatus } from "@/lib/account-status.functions";
import { useRecoveryState } from "@/lib/recovery-state";

export const Route = createFileRoute("/_authenticated")({
  component: AuthGate,
});

export const consentQueryKey = (userId: string | undefined) => ["legal-consent", userId];

function AuthGate() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const isRecovering = useRecoveryState();
  const statusFn = useServerFn(checkAccountStatus);

  // Server-side block enforcement. Runs on every authenticated navigation.
  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ["account-status", user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: () => statusFn(),
  });

  const { data: hasConsent, isLoading: consentLoading } = useQuery({
    queryKey: consentQueryKey(user?.id),
    enabled: !!user && status?.blocked === false,
    staleTime: 0,
    queryFn: async () => {
      const { count } = await supabase
        .from("legal_consents")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("terms_accepted", true)
        .eq("privacy_accepted", true)
        .eq("age_confirmed", true);
      return (count ?? 0) > 0;
    },
  });

  // Hard sign-out + redirect when blocked is detected.
  useEffect(() => {
    if (status?.blocked) {
      supabase.auth.signOut().catch(() => null);
    }
  }, [status?.blocked]);

  if (loading || (user && statusLoading)) {
    return <SplashLoader />;
  }

  if (!user) {
    return <Navigate to="/login" search={{ redirect: location.href }} />;
  }

  // Recovery sessions must not leak into authenticated areas.
  if (isRecovering) {
    console.warn("[_authenticated] recovery session detected, bouncing to /reset-password");
    return <Navigate to="/reset-password" />;
  }

  if (status?.blocked) {
    return <Navigate to="/blocked" />;
  }

  if (consentLoading) return <SplashLoader />;

  const onConsentRoute = location.pathname.startsWith("/mandatory-consent");
  if (!hasConsent && !onConsentRoute) {
    return <Navigate to="/mandatory-consent" />;
  }
  if (hasConsent && onConsentRoute) {
    return <Navigate to="/app" />;
  }

  return <Outlet />;
}

function SplashLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-2 w-2 rounded-full bg-[var(--gold)] animate-pulse" />
        <p className="serif italic text-sm text-muted-foreground">um instante…</p>
      </div>
    </div>
  );
}
