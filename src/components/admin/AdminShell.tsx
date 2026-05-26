import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyAdminRoles, type AdminRole } from "@/lib/admin.functions";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useRecoveryState } from "@/lib/recovery-state";
import { AdminRoleBadge } from "@/components/admin/AdminRoleBadge";
import { ForcePasswordChangeModal } from "@/components/admin/ForcePasswordChangeModal";

import {
  LayoutDashboard,
  Users,
  UserCog,
  CreditCard,
  HeartPulse,
  RotateCcw,
  Brain,
  Sparkles,
  ShieldAlert,
  DollarSign,
  Activity,
  Webhook,
  Layers,
  Flame,
  ListChecks,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  // Roles allowed to see this nav item. super_admin always passes.
  roles: AdminRole[];
  // When true, ONLY super_admin can access.
  superOnly?: boolean;
};

const NAV: Item[] = [
  {
    to: "/admin",
    label: "Visão geral",
    icon: LayoutDashboard,
    roles: ["admin", "support", "finance", "analytics", "moderator"],
  },
  {
    to: "/admin/users",
    label: "Usuários",
    icon: Users,
    roles: ["admin", "support", "analytics", "moderator"],
  },
  { to: "/admin/segments", label: "Segmentos", icon: Layers, roles: [], superOnly: true },
  { to: "/admin/heatmap", label: "Mapa de calor", icon: Flame, roles: [], superOnly: true },
  { to: "/admin/admins", label: "Administradores", icon: UserCog, roles: [], superOnly: true },
  {
    to: "/admin/audit",
    label: "Auditoria de papéis",
    icon: ShieldCheck,
    roles: [],
    superOnly: true,
  },
  { to: "/admin/actions", label: "Log de ações", icon: ListChecks, roles: [], superOnly: true },
  { to: "/admin/billing", label: "Assinaturas", icon: CreditCard, roles: [], superOnly: true },
  { to: "/admin/plans", label: "Planos & Produtos", icon: Layers, roles: [], superOnly: true },
  { to: "/admin/webhooks", label: "Webhooks", icon: Webhook, roles: [], superOnly: true },
  {
    to: "/admin/ai-health",
    label: "Saúde da IA",
    icon: HeartPulse,
    roles: ["admin", "support", "analytics"],
  },
  {
    to: "/admin/recovery",
    label: "Recuperação",
    icon: RotateCcw,
    roles: ["admin", "support", "analytics"],
  },
  { to: "/admin/memory", label: "Memória & contexto", icon: Brain, roles: ["admin", "analytics"] },
  {
    to: "/admin/emotional",
    label: "Analítica emocional",
    icon: Sparkles,
    roles: [],
    superOnly: true,
  },
  {
    to: "/admin/safety",
    label: "Segurança & risco",
    icon: ShieldAlert,
    roles: ["admin", "support"],
  },
  { to: "/admin/cost", label: "Tokens & custo", icon: DollarSign, roles: [], superOnly: true },
  { to: "/admin/system", label: "Status do sistema", icon: Activity, roles: [], superOnly: true },
  { to: "/admin/health", label: "Saúde & latência", icon: HeartPulse, roles: [], superOnly: true },
  { to: "/admin/retention", label: "Retenção", icon: RotateCcw, roles: [], superOnly: true },
];

// Routes that require super_admin (path prefix match).
const SUPER_ONLY_PREFIXES = [
  "/admin/system",
  "/admin/health",
  "/admin/admins",
  "/admin/audit",
  "/admin/actions",
  "/admin/billing",
  "/admin/plans",
  "/admin/emotional",
  "/admin/cost",
  "/admin/webhooks",
  "/admin/segments",
  "/admin/heatmap",
  "/admin/retention",
];

function highestRole(roles: AdminRole[]): AdminRole | "user" {
  if (roles.includes("super_admin")) return "super_admin";
  if (roles.includes("admin")) return "admin";
  return roles[0] ?? "user";
}

export function AdminShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, signOut } = useAdminAuth();
  const isRecovering = useRecoveryState();
  const [open, setOpen] = useState(false);
  const fetchRoles = useServerFn(getMyAdminRoles);

  const isAuthFreeRoute =
    location.pathname === "/admin/login" || location.pathname === "/admin/recover";

  const {
    data,
    isLoading: rolesLoading,
    isError,
    error: rolesError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["admin-roles", user?.id],
    enabled: !loading && !!user && !isAuthFreeRoute,
    queryFn: () => fetchRoles({ data: undefined as unknown as never }),
    retry: 2,
    retryDelay: 500,
  });

  // Redirect to /admin/login if not authenticated as admin.
  useEffect(() => {
    if (isAuthFreeRoute) return;
    if (loading) return;
    if (!user) {
      console.info("[admin] no admin session → /admin/login", { path: location.pathname });
      navigate({ to: "/admin/login", search: { redirect: location.pathname } });
    }
  }, [loading, user, isAuthFreeRoute, location.pathname, navigate]);

  // Only sign out when the server EXPLICITLY confirms the user is not an admin.
  // Transient fetch errors (isError) are handled inline with a retry UI below —
  // never sign the user out for a network blip.
  useEffect(() => {
    if (isAuthFreeRoute) return;
    if (!user) return;
    if (rolesLoading) return;
    if (data && !data.isAdmin) {
      console.warn("[admin] authenticated but not admin → signing out", {
        userId: user.id,
        roles: data?.roles,
        allDisabled: data?.allDisabled,
      });
      (async () => {
        await signOut();
        navigate({ to: "/" });
      })();
    }
  }, [user, data, rolesLoading, isAuthFreeRoute, signOut, navigate]);

  // RBAC: super-admin-only routes
  const isSuperOnlyRoute = useMemo(
    () =>
      SUPER_ONLY_PREFIXES.some(
        (p) => location.pathname === p || location.pathname.startsWith(p + "/"),
      ),
    [location.pathname],
  );
  useEffect(() => {
    if (!data?.isAdmin) return;
    if (isSuperOnlyRoute && !data.roles.includes("super_admin")) {
      console.warn("[admin] access denied", {
        userId: user?.id,
        path: location.pathname,
        requiredRole: "super_admin",
        actualRoles: data.roles,
      });
      navigate({ to: "/admin" });
    }
  }, [data, isSuperOnlyRoute, location.pathname, navigate, user?.id]);

  useEffect(() => {
    console.info("[admin] shell state", {
      path: location.pathname,
      authType: "admin",
      loading,
      hasAdminSession: !!user,
      adminUserId: user?.id,
      rolesLoading,
      isAdmin: data?.isAdmin,
      roles: data?.roles,
      mustChangePassword: data?.mustChangePassword,
    });
  }, [loading, user, rolesLoading, data, location.pathname]);

  if (isAuthFreeRoute) return <Outlet />;

  // NOTE: We intentionally do NOT gate the admin backoffice on the public
  // client's recovery flag. Admin auth runs through a separate Supabase
  // client (adminSupabase, storageKey "mb-admin-auth"), so a recovery
  // session on the public client is unrelated to admin access. Treating
  // them as coupled produced an infinite /admin → /reset-password loop
  // after a super admin completed a password reset.
  void isRecovering;

  if (loading || (user && rolesLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-noir">
        <div className="flex flex-col items-center gap-4">
          <ShieldCheck className="h-6 w-6 text-[var(--gold)] animate-pulse" />
          <p className="serif italic text-sm text-muted-foreground">
            verificando credenciais administrativas…
          </p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Transient role-fetch failure (network/timeout). Do NOT sign out —
  // surface an inline retry so the admin session is preserved.
  if (isError && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-noir px-6">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          <ShieldAlert className="h-6 w-6 text-[var(--gold)]" />
          <p className="serif text-base gold-text">Não foi possível verificar suas permissões</p>
          <p className="serif italic text-xs text-muted-foreground">
            {rolesError instanceof Error
              ? rolesError.message
              : "Falha de rede ao consultar papéis administrativos."}
          </p>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="mt-2 rounded-xl border border-[var(--gold)]/40 px-4 py-2 text-xs uppercase tracking-[0.3em] text-[var(--gold)] hover:bg-[var(--gold)]/10 disabled:opacity-50"
          >
            {isFetching ? "tentando…" : "tentar novamente"}
          </button>
        </div>
      </div>
    );
  }

  if (!data?.isAdmin) return null;

  const roles = data.roles;
  const isSuper = roles.includes("super_admin");
  const primary = highestRole(roles);

  const items = NAV.filter((n) => {
    if (isSuper) return true;
    if (n.superOnly) return false;
    return n.roles.some((r) => roles.includes(r));
  });

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,rgba(40,20,8,0.45),#050505_60%)] text-foreground">
      {data.mustChangePassword && <ForcePasswordChangeModal onDone={() => refetch()} />}

      <div className="flex">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-72 transform border-r border-[color-mix(in_oklab,var(--gold)_18%,transparent)] bg-black/85 backdrop-blur-xl transition-transform duration-300 md:translate-x-0",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-full flex-col">
            <div className="px-6 pt-8 pb-6">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[var(--gold)]" />
                <p className="text-[10px] uppercase tracking-[0.4em] text-[var(--gold)]/70">
                  backoffice
                </p>
              </div>
              <h2 className="serif mt-1 text-2xl gold-text">Control Room</h2>
              <div className="mt-3">
                <AdminRoleBadge role={primary} />
              </div>
              {user.email && (
                <p className="mt-2 text-[11px] italic text-muted-foreground truncate">
                  {user.email}
                </p>
              )}
            </div>
            <div className="gold-line mx-6 opacity-40" />
            <nav className="flex-1 overflow-y-auto px-3 py-4">
              {items.map((n) => {
                const Icon = n.icon;
                const active =
                  location.pathname === n.to ||
                  (n.to !== "/admin" && location.pathname.startsWith(n.to));
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
                      active
                        ? "bg-[var(--gold)]/10 text-[var(--gold)] shadow-[inset_0_0_0_1px_oklch(0.78_0.13_75/0.25)]"
                        : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 transition-colors",
                        active
                          ? "text-[var(--gold)]"
                          : "text-muted-foreground group-hover:text-[var(--gold)]",
                      )}
                    />
                    <span>{n.label}</span>
                    {n.superOnly && (
                      <span className="ml-auto text-[8px] uppercase tracking-[0.25em] text-[var(--gold)]/60">
                        super
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-border/30 px-3 py-4">
              <button
                onClick={async () => {
                  console.info("[admin] signing out admin session");
                  await signOut();
                  navigate({ to: "/admin/login", search: { redirect: "/admin" } });
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-destructive"
              >
                <LogOut className="h-3.5 w-3.5" /> sair do backoffice
              </button>
            </div>
          </div>
        </aside>

        <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-[color-mix(in_oklab,var(--gold)_18%,transparent)] bg-black/80 px-4 py-3 backdrop-blur-xl md:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[var(--gold)]" />
            <p className="serif text-lg gold-text">Control Room</p>
          </div>
          <button onClick={() => setOpen((o) => !o)} className="p-2 text-muted-foreground">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <main className="flex-1 md:ml-72 pt-14 md:pt-0">
          <div className="mx-auto max-w-7xl px-5 py-8 md:px-10 md:py-12">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
