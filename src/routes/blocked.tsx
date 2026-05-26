import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/blocked")({
  component: BlockedPage,
  head: () => ({
    meta: [{ title: "Acesso bloqueado — Meu Barão" }, { name: "robots", content: "noindex" }],
  }),
});

function BlockedPage() {
  // Defensive: ensure no active session can be used elsewhere.
  useEffect(() => {
    supabase.auth.signOut().catch(() => null);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="max-w-md text-center space-y-6">
        <h1 className="serif text-3xl text-foreground">Acesso suspenso</h1>
        <p className="text-sm text-muted-foreground">
          Sua conta foi bloqueada pela administração. Se você acredita que isso é um engano, entre
          em contato com nosso suporte.
        </p>
        <div className="flex flex-col gap-2 items-center">
          <Link
            to="/contato"
            className="rounded-full bg-[var(--gold)]/15 px-5 py-2 text-xs uppercase tracking-widest text-[var(--gold)] ring-1 ring-[var(--gold)]/40 hover:bg-[var(--gold)]/25"
          >
            Falar com suporte
          </Link>
          <Link to="/" className="text-[11px] text-muted-foreground hover:text-foreground">
            voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}
