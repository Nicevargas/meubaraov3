import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { changeMyPassword } from "@/lib/admin-management.functions";
import { ShieldAlert } from "lucide-react";

export function ForcePasswordChangeModal({ onDone }: { onDone: () => void }) {
  const change = useServerFn(changeMyPassword);
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (pw1 !== pw2) {
      setErr("As senhas não coincidem.");
      return;
    }
    setBusy(true);
    try {
      await change({ data: { newPassword: pw1 } });
      console.info("[admin] password rotated, lifting force-change gate");
      onDone();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao trocar senha";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md px-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl border border-[color-mix(in_oklab,var(--gold)_25%,transparent)] bg-black/90 p-8 shadow-[0_40px_120px_-40px_color-mix(in_oklab,var(--gold)_45%,transparent)]"
      >
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-[var(--gold)]" />
          <p className="text-[10px] uppercase tracking-[0.4em] text-[var(--gold)]/80">segurança</p>
        </div>
        <h2 className="serif mt-2 text-2xl gold-text">Defina uma nova senha</h2>
        <p className="mt-2 text-sm text-muted-foreground italic serif">
          Sua conta administrativa exige troca de senha antes de continuar.
        </p>

        <label className="mt-6 block">
          <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
            Nova senha
          </span>
          <input
            type="password"
            value={pw1}
            onChange={(e) => setPw1(e.target.value)}
            required
            minLength={10}
            autoFocus
            className="mt-2 w-full rounded-xl border border-[color-mix(in_oklab,var(--gold)_20%,transparent)] bg-black/40 px-4 py-3 text-sm focus:outline-none focus:border-[color-mix(in_oklab,var(--gold)_55%,transparent)]"
          />
        </label>
        <label className="mt-4 block">
          <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
            Confirmar senha
          </span>
          <input
            type="password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            required
            minLength={10}
            className="mt-2 w-full rounded-xl border border-[color-mix(in_oklab,var(--gold)_20%,transparent)] bg-black/40 px-4 py-3 text-sm focus:outline-none focus:border-[color-mix(in_oklab,var(--gold)_55%,transparent)]"
          />
        </label>

        <p className="mt-3 text-[11px] text-muted-foreground">
          Mínimo 10 caracteres, com maiúscula, minúscula e número.
        </p>
        {err && <p className="mt-3 text-sm text-red-400 italic serif">{err}</p>}

        <button
          disabled={busy}
          className="mt-6 w-full rounded-xl bg-gradient-to-r from-[var(--gold)] to-[var(--copper)] py-3 text-sm font-medium text-black tracking-wide disabled:opacity-50"
        >
          {busy ? "Atualizando…" : "Atualizar senha"}
        </button>
      </form>
    </div>
  );
}
