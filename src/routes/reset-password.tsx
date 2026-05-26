import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { setRecovering } from "@/lib/recovery-state";
import { translateAuthError } from "@/lib/auth-messages";
import { AuthShell, Field } from "./login";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({ meta: [{ title: "Recuperar senha · Meu Barão" }] }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"request" | "update">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Event-driven recovery detection. Supabase emits PASSWORD_RECOVERY when
  // a recovery link is processed. We also accept the legacy hash signal as
  // a fallback for the first paint before the SDK fires the event.
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
      console.info("[reset-password] recovery hash detected on mount");
      setMode("update");
      setRecovering(true);
    }
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      console.info("[reset-password] auth event", event);
      if (event === "PASSWORD_RECOVERY") {
        setMode("update");
        setRecovering(true);
      } else if (event === "SIGNED_OUT") {
        setMode("request");
        setPassword("");
        setRecovering(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleRequest(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) setError(translateAuthError(error));
    else setMsg("Link enviado. Verifique seu email.");
  }

  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    setLoading(true);

    // Capture the recovery-session user BEFORE we tear it down so we can
    // route admins back to /admin/login instead of the customer /login.
    const { data: pre } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
    const recoveryEmail = pre?.user?.email ?? "";

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setLoading(false);
      setError(translateAuthError(error));
      return;
    }
    console.info("[reset-password] password updated, tearing down recovery session", {
      email: recoveryEmail,
    });

    // scope:'local' kills ONLY this tab's recovery session. A global
    // signOut would also invalidate the user's adminSupabase session
    // (separate storage key, same user) and any other legitimate sessions.
    await supabase.auth.signOut({ scope: "local" }).catch(() => null);

    // Hard-clear the recovery URL so a reload cannot re-enter update mode.
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "/reset-password");
    }
    setRecovering(false);
    setPassword("");
    setMode("request");
    setMsg("Senha redefinida. Entre novamente.");
    setLoading(false);

    // Route admins back to the admin login; everyone else to /login.
    const isAdminEmail = /@meubarao\.com$/i.test(recoveryEmail);
    if (isAdminEmail) {
      navigate({ to: "/admin/login", search: { redirect: "/admin" } });
    } else {
      navigate({ to: "/login", search: { redirect: "/app" } });
    }
  }

  if (mode === "update") {
    return (
      <AuthShell title="Defina uma nova senha" subtitle="Algo que só você saberá.">
        <form onSubmit={handleUpdate} className="space-y-4">
          <Field
            label="Nova senha"
            type="password"
            value={password}
            onChange={setPassword}
            required
          />
          {error && <p className="text-sm text-red-400 serif italic">{error}</p>}
          {msg && <p className="text-sm text-green-400/80 serif italic">{msg}</p>}
          <button
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-[var(--gold)] to-[var(--copper)] py-3 text-sm font-medium text-black disabled:opacity-50"
          >
            {loading ? "Salvando..." : "Salvar nova senha"}
          </button>
        </form>
        <p className="mt-6 text-center text-xs">
          <Link to="/login" className="text-foreground hover:underline">
            Voltar para entrar
          </Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Esqueceu a senha?" subtitle="Te enviamos um link para retornar.">
      <form onSubmit={handleRequest} className="space-y-4">
        <Field label="Email" type="email" value={email} onChange={setEmail} required />
        {error && <p className="text-sm text-red-400 serif italic">{error}</p>}
        {msg && <p className="text-sm text-green-400/80 serif italic">{msg}</p>}
        <button
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-[var(--gold)] to-[var(--copper)] py-3 text-sm font-medium text-black disabled:opacity-50"
        >
          {loading ? "Enviando..." : "Enviar link"}
        </button>
      </form>
      <p className="mt-6 text-center text-xs">
        <Link to="/login" className="text-foreground hover:underline">
          Voltar para entrar
        </Link>
      </p>
    </AuthShell>
  );
}
