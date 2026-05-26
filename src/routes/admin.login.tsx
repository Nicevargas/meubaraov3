import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ShieldCheck } from "lucide-react";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useServerFn } from "@tanstack/react-start";
import { ensureSuperAdminExists } from "@/lib/admin-bootstrap.functions";
import { registerAdminLoginAttempt } from "@/lib/admin-login.functions";
import { translateAuthError } from "@/lib/auth-messages";

export const Route = createFileRoute("/admin/login")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: (s.redirect as string) || "/admin",
  }),
  component: AdminLoginPage,
  head: () => ({ meta: [{ title: "Administração · Meu Barão" }] }),
});

function AdminLoginPage() {
  const { user, loading, signIn } = useAdminAuth();
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/admin/login" });
  const bootstrap = useServerFn(ensureSuperAdminExists);
  const registerAttempt = useServerFn(registerAdminLoginAttempt);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bootstrapInfo, setBootstrapInfo] = useState<string | null>(null);
  const isDevMode = import.meta.env.DEV;

  // Idempotent bootstrap: ensures a super_admin always exists.
  useEffect(() => {
    (async () => {
      try {
        const res = await bootstrap({ data: undefined as unknown as never });
        console.info("[admin-login] bootstrap result", res);
        if (res.status === "created") {
          setBootstrapInfo(
            `Conta administrativa inicial criada: ${res.email}. Use a senha temporária e troque imediatamente.`,
          );
        } else if (res.status === "repaired") {
          setBootstrapInfo(
            `Conta administrativa verificada e reparada: ${res.email}. Use a senha padrão temporária e troque imediatamente.`,
          );
        } else if (res.status === "recovered") {
          setBootstrapInfo(
            `Modo de recuperação ativo. A senha de ${res.email} foi restaurada para a senha padrão temporária.`,
          );
        }
      } catch (e) {
        console.warn("[admin-login] bootstrap failed", e);
      }
    })();
  }, [bootstrap]);

  // Single source of truth for post-login navigation: as soon as the admin
  // session hydrates (either from a prior visit or from a fresh sign-in
  // SIGNED_IN event), redirect. AdminShell performs the authoritative role
  // check after mount — we never block here on a serverFn call, because if
  // that call hangs the user gets stuck on the login screen indefinitely.
  useEffect(() => {
    if (loading || !user) return;
    const target =
      redirect.startsWith("/admin") && redirect !== "/admin/login" ? redirect : "/admin";
    console.info("[admin-login] session ready → navigating", { target, userId: user.id });
    navigate({ to: target, replace: true });
    // Hard-fallback: if router navigation is somehow blocked, force a
    // location change after a short tick so the user never stays stuck.
    const t = window.setTimeout(() => {
      if (typeof window !== "undefined" && window.location.pathname === "/admin/login") {
        console.warn("[admin-login] router navigate did not change URL, forcing window.location");
        window.location.assign(target);
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [user, loading, navigate, redirect]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const normalizedEmail = email.trim().toLowerCase();
    console.info("[admin-login] login attempt", { email: normalizedEmail, authType: "admin" });
    const { data: signData, error: signErr } = await signIn(normalizedEmail, password);
    if (signErr) {
      console.warn("[admin-login] auth failure", {
        email: normalizedEmail,
        message: signErr.message,
      });
      const gate = await registerAttempt({
        data: { email: normalizedEmail, success: false },
      }).catch(() => null);
      setBusy(false);
      if (gate?.blocked) {
        setError("Muitas tentativas falhas. Tente novamente em 15 minutos.");
      } else {
        setError(translateAuthError(signErr));
      }
      return;
    }
    console.info("[admin-login] auth success", {
      email: normalizedEmail,
      userId: signData.user?.id,
      hasSession: !!signData.session,
    });
    // Fire-and-forget: never block redirect on a network call.
    registerAttempt({ data: { email: normalizedEmail, success: true } }).catch(() => {});
    // Redirect is handled by the useEffect above as soon as the auth-state
    // listener flips `user` to non-null. Role validation happens inside
    // AdminShell, NOT here — calling a protected serverFn synchronously in
    // this handler caused the redirect to never fire when that call hung
    // or returned a transient error.
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16 bg-[radial-gradient(ellipse_at_top,_rgba(40,20,8,0.6),_#000_55%)]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[color-mix(in_oklab,var(--gold)_40%,transparent)] bg-black/60">
            <ShieldCheck className="h-5 w-5 text-[var(--gold)]" />
          </div>
          <p className="mt-4 text-[10px] uppercase tracking-[0.45em] text-[var(--gold)]/70">
            painel administrativo
          </p>
          <h1 className="serif mt-1 text-3xl gold-text">Meu Barão · Sala de Controle</h1>
          <p className="serif italic text-sm text-muted-foreground mt-2">
            Acesso restrito à administração.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[color-mix(in_oklab,var(--gold)_22%,transparent)] bg-black/70 backdrop-blur-xl p-8 shadow-[0_40px_120px_-40px_color-mix(in_oklab,var(--gold)_40%,transparent)]"
        >
          {isDevMode && (
            <div className="mb-5 rounded-lg border border-[var(--gold)]/35 bg-[var(--gold)]/10 px-3 py-2 text-center text-[10px] uppercase tracking-[0.25em] text-[var(--gold)]">
              Credenciais administrativas padrão ativas
            </div>
          )}
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
              Email administrativo
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              className="mt-2 w-full rounded-xl border border-[color-mix(in_oklab,var(--gold)_20%,transparent)] bg-black/40 px-4 py-3 text-sm focus:outline-none focus:border-[color-mix(in_oklab,var(--gold)_55%,transparent)] transition"
            />
          </label>
          <label className="mt-4 block">
            <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
              Senha
            </span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="mt-2 w-full rounded-xl border border-[color-mix(in_oklab,var(--gold)_20%,transparent)] bg-black/40 px-4 py-3 text-sm focus:outline-none focus:border-[color-mix(in_oklab,var(--gold)_55%,transparent)] transition"
            />
          </label>

          {bootstrapInfo && (
            <p className="mt-4 rounded-lg border border-[var(--gold)]/40 bg-[var(--gold)]/5 px-3 py-2 text-xs text-[var(--gold)]/90">
              {bootstrapInfo}
            </p>
          )}
          {error && <p className="mt-4 text-sm text-red-400 serif italic">{error}</p>}

          <button
            disabled={busy}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-[var(--gold)] to-[var(--copper)] py-3 text-sm font-medium text-black tracking-wide disabled:opacity-50"
          >
            {busy ? "Verificando…" : "Entrar no painel administrativo"}
          </button>

          <div className="mt-6 text-center">
            <Link
              to="/"
              className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-[var(--gold)]"
            >
              voltar ao site público
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
