import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { translateAuthError } from "@/lib/auth-messages";
import { AuthShell, Field } from "./login";

const TERMS_VERSION = "2026-05-21";
const PRIVACY_VERSION = "2026-05-21";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
  head: () => ({ meta: [{ title: "Criar conta · Meu Barão" }] }),
});

async function recordConsent(userId: string, source: "email" | "google") {
  try {
    await supabase.from("legal_consents").insert({
      user_id: userId,
      terms_version: TERMS_VERSION,
      privacy_version: PRIVACY_VERSION,
      age_confirmed: true,
      terms_accepted: true,
      privacy_accepted: true,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
      source,
    });
  } catch {
    // non-blocking
  }
}

function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptAge, setAcceptAge] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const canSubmit = acceptTerms && acceptAge;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) {
      setError("Para continuar, confirme os termos e sua idade.");
      return;
    }
    setError(null);
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: {
          display_name: name,
          terms_version: TERMS_VERSION,
          privacy_version: PRIVACY_VERSION,
          age_confirmed: true,
          accepted_at: new Date().toISOString(),
        },
      },
    });
    setLoading(false);
    if (error) return setError(translateAuthError(error));
    if (data.user?.id) await recordConsent(data.user.id, "email");
    setSent(true);
  }

  async function handleGoogle() {
    setError(null);
    if (!canSubmit) {
      setError("Para continuar, confirme os termos e sua idade.");
      return;
    }
    // Persist consent intent so we can record after OAuth round-trip
    try {
      sessionStorage.setItem(
        "pending_consent",
        JSON.stringify({
          terms_version: TERMS_VERSION,
          privacy_version: PRIVACY_VERSION,
          accepted_at: new Date().toISOString(),
          source: "google",
        }),
      );
    } catch {
      /* ignore */
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/app",
      },
    });
    if (error) setError(translateAuthError(error));
  }

  if (sent) {
    return (
      <AuthShell title="Verifique seu email" subtitle="Enviamos um link para você confirmar.">
        <p className="text-sm text-muted-foreground serif italic">
          Abra a caixa de entrada de <strong className="text-foreground">{email}</strong> e clique
          no link para ativar sua presença no Meu Barão.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Crie sua presença" subtitle="Comece com um nome. Verdadeiro ou inventado.">
      <button
        onClick={handleGoogle}
        disabled={!canSubmit}
        className="w-full rounded-xl border border-[color-mix(in oklab, var(--gold) 30%, transparent)] bg-white/[0.03] py-3 text-sm tracking-wide hover:bg-white/[0.06] transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Continuar com Google
      </button>
      <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60">
        <div className="h-px flex-1 bg-[color-mix(in oklab, var(--gold) 15%, transparent)]" />
        ou com email
        <div className="h-px flex-1 bg-[color-mix(in oklab, var(--gold) 15%, transparent)]" />
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Como quer ser chamada" type="text" value={name} onChange={setName} required />
        <Field label="Email" type="email" value={email} onChange={setEmail} required />
        <Field
          label="Senha (mínimo 6)"
          type="password"
          value={password}
          onChange={setPassword}
          required
        />

        <div className="space-y-3 pt-2">
          <ConsentRow checked={acceptTerms} onChange={setAcceptTerms} id="accept-terms">
            Ao criar sua conta, você declara que leu e concorda com os{" "}
            <Link
              to="/terms"
              target="_blank"
              className="text-foreground underline decoration-[color-mix(in_oklab,var(--gold)_40%,transparent)] underline-offset-2 hover:decoration-[var(--gold)]"
            >
              Termos de Uso
            </Link>{" "}
            e a{" "}
            <Link
              to="/privacy"
              target="_blank"
              className="text-foreground underline decoration-[color-mix(in_oklab,var(--gold)_40%,transparent)] underline-offset-2 hover:decoration-[var(--gold)]"
            >
              Política de Privacidade
            </Link>{" "}
            da plataforma.
          </ConsentRow>
          <ConsentRow checked={acceptAge} onChange={setAcceptAge} id="accept-age">
            Declaro possuir mais de 18 anos.
          </ConsentRow>
        </div>

        {error && <p className="text-sm text-red-400 serif italic">{error}</p>}
        <button
          disabled={loading || !canSubmit}
          className="w-full rounded-xl bg-gradient-to-r from-[var(--gold)] to-[var(--copper)] py-3 text-sm font-medium text-black tracking-wide disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Criando..." : "Criar conta"}
        </button>
      </form>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Já tem conta?{" "}
        <Link to="/login" className="text-foreground hover:underline">
          Entrar
        </Link>
      </p>
    </AuthShell>
  );
}

function ConsentRow({
  id,
  checked,
  onChange,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={id} className="flex items-start gap-3 cursor-pointer group">
      <span className="relative mt-[2px] flex-shrink-0">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          className="block h-4 w-4 rounded-[4px] border border-[color-mix(in_oklab,var(--gold)_40%,transparent)] bg-black/40 transition peer-checked:bg-[var(--gold)] peer-checked:border-[var(--gold)] peer-focus-visible:ring-1 peer-focus-visible:ring-[var(--gold)]"
          aria-hidden
        />
        <svg
          viewBox="0 0 16 16"
          className={`pointer-events-none absolute inset-0 h-4 w-4 text-black transition-opacity ${checked ? "opacity-100" : "opacity-0"}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M3.5 8.5l3 3 6-6" />
        </svg>
      </span>
      <span className="text-xs leading-relaxed text-muted-foreground/90 serif italic">
        {children}
      </span>
    </label>
  );
}
