import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { ShieldCheck, RotateCcw } from "lucide-react";
import { recoverSuperAdmin } from "@/lib/admin-bootstrap.functions";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/recover")({
  component: AdminRecoverPage,
  head: () => ({ meta: [{ title: "Recuperar Super Admin · Meu Barão" }] }),
});

function AdminRecoverPage() {
  const recover = useServerFn(recoverSuperAdmin);
  const [confirmationEmail, setConfirmationEmail] = useState("admin@meubarao.com");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isDevMode = import.meta.env.DEV;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setResult(null);
    setError(null);

    try {
      console.warn("[admin-recover] recovery attempt", {
        email: confirmationEmail.trim().toLowerCase(),
      });
      const res = await recover({ data: { confirmationEmail } });
      console.warn("[admin-recover] recovery result", res);
      if (res.status === "disabled") {
        setError("Recuperação bloqueada fora do ambiente de desenvolvimento.");
      } else {
        setResult(`Super Admin pronto: ${res.email}. Senha temporária: Admin123!`);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Falha ao recuperar o Super Admin.";
      console.error("[admin-recover] recovery failure", e);
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16 bg-[radial-gradient(ellipse_at_top,_rgba(40,20,8,0.6),_#000_55%)]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[color-mix(in_oklab,var(--gold)_40%,transparent)] bg-black/60">
            <ShieldCheck className="h-5 w-5 text-[var(--gold)]" />
          </div>
          <p className="mt-4 text-[10px] uppercase tracking-[0.45em] text-[var(--gold)]/70">
            recuperação
          </p>
          <h1 className="serif mt-1 text-3xl gold-text">Recuperação de Super Admin</h1>
          <p className="serif italic text-sm text-muted-foreground mt-2">
            Regenera a conta administrativa canônica em desenvolvimento.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-[color-mix(in_oklab,var(--gold)_22%,transparent)] bg-black/70 p-8 shadow-[0_40px_120px_-40px_color-mix(in_oklab,var(--gold)_40%,transparent)] backdrop-blur-xl"
        >
          {isDevMode && (
            <div className="mb-5 rounded-lg border border-[var(--gold)]/35 bg-[var(--gold)]/10 px-3 py-2 text-center text-[10px] uppercase tracking-[0.25em] text-[var(--gold)]">
              Credenciais administrativas padrão ativas
            </div>
          )}

          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
              Email canônico
            </span>
            <input
              type="email"
              required
              value={confirmationEmail}
              onChange={(e) => setConfirmationEmail(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[color-mix(in_oklab,var(--gold)_20%,transparent)] bg-black/40 px-4 py-3 text-sm focus:border-[color-mix(in_oklab,var(--gold)_55%,transparent)] focus:outline-none"
            />
          </label>

          {result && (
            <p className="mt-4 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-xs text-emerald-200">
              {result}
            </p>
          )}
          {error && <p className="mt-4 text-sm text-red-400 serif italic">{error}</p>}

          <button
            disabled={busy}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--gold)] to-[var(--copper)] py-3 text-sm font-medium text-black tracking-wide disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            {busy ? "Regenerando…" : "Regenerar Super Admin"}
          </button>

          <div className="mt-6 text-center">
            <Link
              to="/admin/login"
              className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-[var(--gold)]"
            >
              voltar ao login administrativo
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
