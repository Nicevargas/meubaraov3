import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { consentQueryKey } from "@/routes/_authenticated";

const TERMS_VERSION = "2026-05-21";
const PRIVACY_VERSION = "2026-05-21";

export const Route = createFileRoute("/_authenticated/mandatory-consent")({
  component: MandatoryConsentPage,
  head: () => ({ meta: [{ title: "Antes de entrar · Meu Barão" }] }),
});

function MandatoryConsentPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptAge, setAcceptAge] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = acceptTerms && acceptAge && !!user;

  async function handleSubmit() {
    if (!canSubmit || !user) return;
    setError(null);
    setLoading(true);
    const { error: insertError } = await supabase.from("legal_consents").insert({
      user_id: user.id,
      terms_version: TERMS_VERSION,
      privacy_version: PRIVACY_VERSION,
      age_confirmed: true,
      terms_accepted: true,
      privacy_accepted: true,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
      source: "mandatory_consent",
    });
    if (insertError) {
      setLoading(false);
      setError("Algo silenciou no caminho. Tente novamente em um instante.");
      return;
    }
    try {
      sessionStorage.removeItem("pending_consent");
    } catch {
      /* ignore */
    }
    // Prime the consent cache so AuthGate sees the new state synchronously
    queryClient.setQueryData(consentQueryKey(user.id), true);
    await queryClient.invalidateQueries({ queryKey: consentQueryKey(user.id) });
    navigate({ to: "/app" });
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16 bg-gradient-to-b from-black via-[#0a0606] to-background">
      <div className="w-full max-w-md">
        <p className="text-center text-[10px] uppercase tracking-[0.4em] text-muted-foreground/60 mb-3">
          Um último gesto
        </p>
        <h1 className="text-center serif text-3xl gold-text mb-2">Antes de entrar</h1>
        <p className="text-center serif italic text-sm text-muted-foreground mb-8">
          Um acordo silencioso entre você e este lugar.
        </p>

        <div className="rounded-3xl border border-[color-mix(in_oklab,var(--gold)_20%,transparent)] bg-black/60 backdrop-blur-xl p-8 shadow-[0_30px_100px_-30px_color-mix(in_oklab,var(--gold)_30%,transparent)]">
          <div className="space-y-4">
            <ConsentRow checked={acceptTerms} onChange={setAcceptTerms} id="m-accept-terms">
              Ao continuar, você declara que leu e concorda com os{" "}
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
            <ConsentRow checked={acceptAge} onChange={setAcceptAge} id="m-accept-age">
              Declaro possuir mais de 18 anos.
            </ConsentRow>
          </div>

          {error && <p className="mt-5 text-sm text-red-400 serif italic text-center">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading || !canSubmit}
            className="mt-8 w-full rounded-xl bg-gradient-to-r from-[var(--gold)] to-[var(--copper)] py-3 text-sm font-medium text-black tracking-wide disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {loading ? "Selando…" : "Entrar com presença"}
          </button>

          <button
            onClick={handleSignOut}
            className="mt-3 w-full rounded-xl border border-white/5 py-3 text-xs uppercase tracking-[0.3em] text-muted-foreground/70 hover:text-foreground hover:border-white/10 transition"
          >
            Sair
          </button>
        </div>

        <p className="mt-6 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground/40">
          Versão {TERMS_VERSION}
        </p>
      </div>
    </div>
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
