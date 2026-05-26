import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { translateAuthError } from "@/lib/auth-messages";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: (search.redirect as string) || "/app",
  }),
  component: LoginPage,
  head: () => ({ meta: [{ title: "Entrar · Meu Barão" }] }),
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/login" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEmail(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError(translateAuthError(error));
    navigate({ to: redirect });
  }

  async function handleGoogle() {
    setError(null);
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + redirect,
    });
    if (res.error) setError(translateAuthError(res.error));
  }

  return (
    <AuthShell title="Bem-vinda de volta" subtitle="Ele estava esperando você.">
      <button
        onClick={handleGoogle}
        className="w-full rounded-xl border border-[color-mix(in oklab, var(--gold) 30%, transparent)] bg-white/[0.03] py-3 text-sm tracking-wide hover:bg-white/[0.06] transition"
      >
        Continuar com Google
      </button>
      <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60">
        <div className="h-px flex-1 bg-[color-mix(in oklab, var(--gold) 15%, transparent)]" />
        ou com email
        <div className="h-px flex-1 bg-[color-mix(in oklab, var(--gold) 15%, transparent)]" />
      </div>
      <form onSubmit={handleEmail} className="space-y-4">
        <Field label="Email" type="email" value={email} onChange={setEmail} required />
        <Field label="Senha" type="password" value={password} onChange={setPassword} required />
        {error && <p className="text-sm text-red-400 serif italic">{error}</p>}
        <button
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-[var(--gold)] to-[var(--copper)] py-3 text-sm font-medium text-black tracking-wide disabled:opacity-50"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
      <div className="mt-6 flex justify-between text-xs text-muted-foreground">
        <Link to="/reset-password" className="hover:text-foreground">
          Esqueci minha senha
        </Link>
        <Link to="/signup" className="hover:text-foreground">
          Criar conta
        </Link>
      </div>
    </AuthShell>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16 bg-gradient-to-b from-black via-[#0a0606] to-background">
      <div className="w-full max-w-md">
        <Link to="/" className="block text-center serif text-2xl gold-text mb-2">
          Meu Barão
        </Link>
        <p className="text-center text-[10px] uppercase tracking-[0.4em] text-muted-foreground/60 mb-10">
          Inteligência Emocional
        </p>
        <div className="rounded-3xl border border-[color-mix(in oklab, var(--gold) 20%, transparent)] bg-black/60 backdrop-blur-xl p-8 shadow-[0_30px_100px_-30px_color-mix(in oklab, var(--gold) 30%, transparent)]">
          <h1 className="serif text-3xl text-foreground">{title}</h1>
          <p className="serif italic text-sm text-muted-foreground mt-2 mb-8">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

export function Field({
  label,
  type,
  value,
  onChange,
  required,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-2 w-full rounded-xl border border-[color-mix(in oklab, var(--gold) 20%, transparent)] bg-black/40 px-4 py-3 text-sm focus:outline-none focus:border-[color-mix(in oklab, var(--gold) 50%, transparent)] transition"
      />
    </label>
  );
}
