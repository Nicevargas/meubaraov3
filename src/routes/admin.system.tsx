import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getSystemStatus } from "@/lib/admin.functions";
import {
  getKillSwitch,
  adminSetKillSwitch,
  getFailedPaymentAlerts,
  getWebhookFailureAlerts,
} from "@/lib/admin-ops.functions";
import { SectionTitle } from "@/components/admin/SectionTitle";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/system")({
  component: SystemPage,
});

function SystemPage() {
  const fn = useServerFn(getSystemStatus);
  const { data } = useQuery({
    queryKey: ["admin", "system"],
    queryFn: () => fn({ data: undefined as unknown as never }),
    refetchInterval: 15_000,
  });

  return (
    <div>
      <SectionTitle
        eyebrow="infraestrutura"
        title="Status do sistema"
        description="O coração técnico do Barão."
      />
      <div className="grid gap-3 md:grid-cols-2">
        <StatusRow
          label="Banco de dados"
          ok={data?.db.ok}
          sub={data ? `${data.db.latencyMs}ms · ${data.db.totalProfiles} perfis` : "—"}
        />
        <StatusRow label="Lovable AI Gateway" ok={data?.ai.configured} sub={data?.ai.provider} />
        <StatusRow
          label="Mercado Pago Sandbox"
          ok={data?.mercadopago.sandboxConfigured}
          sub={data?.mercadopago.sandboxConfigured ? "token configurado" : "não configurado"}
        />
        <StatusRow
          label="Mercado Pago Produção"
          ok={data?.mercadopago.prodConfigured}
          sub={data?.mercadopago.prodConfigured ? "pronto para produção" : "ainda em sandbox"}
          optional
        />
        <StatusRow
          label="Webhook MP"
          ok={data?.mercadopago.webhookConfigured}
          sub="assinatura de eventos do Mercado Pago"
        />
        <StatusRow
          label="Autenticação"
          ok={data?.auth.ok}
          sub="Supabase Auth · sessões persistentes"
        />
      </div>
      <p className="mt-4 text-xs italic text-muted-foreground">
        Verificado em {data ? new Date(data.checkedAt).toLocaleString("pt-BR") : "…"} · atualiza a
        cada 15s
      </p>

      <div className="mt-10">
        <SectionTitle
          eyebrow="kill switch"
          title="Bloqueio global de IA"
          description="Use em incidentes. Bloqueia novas mensagens conforme escopo."
        />
        <KillSwitchPanel />
      </div>

      <div className="mt-10">
        <SectionTitle
          eyebrow="alertas"
          title="Pagamentos & webhooks (24h)"
          description="Falhas recentes do Mercado Pago."
        />
        <AlertsPanels />
      </div>
    </div>
  );
}

function KillSwitchPanel() {
  const readFn = useServerFn(getKillSwitch);
  const writeFn = useServerFn(adminSetKillSwitch);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "kill-switch"],
    queryFn: () => readFn({ data: undefined as unknown as never }),
  });
  const [enabled, setEnabled] = useState(false);
  const [scope, setScope] = useState<"all" | "free_only">("free_only");
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (data) {
      setEnabled(data.enabled);
      setScope(data.scope);
      setMessage(data.message ?? "");
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () => writeFn({ data: { enabled, scope, message } }),
    onSuccess: () => {
      toast.success("Kill switch atualizado");
      qc.invalidateQueries({ queryKey: ["admin", "kill-switch"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="glass h-40 animate-pulse rounded-xl opacity-40" />;

  return (
    <div className="glass rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm">Ativar bloqueio global</p>
          <p className="text-xs text-muted-foreground">
            Quando ligado, novas mensagens são bloqueadas conforme escopo.
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Escopo</p>
        <div className="flex gap-2">
          {(["free_only", "all"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={`rounded-full px-3 py-1.5 text-xs uppercase tracking-widest transition-colors ${
                scope === s
                  ? "bg-[var(--gold)]/15 text-[var(--gold)] ring-1 ring-[var(--gold)]/40"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "free_only" ? "apenas free" : "todos os planos"}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
          Mensagem ao usuário
        </p>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={280}
          placeholder="Ex: estamos em manutenção, voltamos logo."
          className="w-full rounded-md bg-background/40 px-3 py-2 text-sm outline-none ring-1 ring-border/40 focus:ring-[var(--gold)]/40"
        />
      </div>
      <div className="flex items-center justify-between pt-2">
        <p className="text-[11px] italic text-muted-foreground">
          {data?.updatedAt
            ? `última alteração: ${new Date(data.updatedAt).toLocaleString("pt-BR")}`
            : "nunca alterado"}
        </p>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </div>
  );
}

function AlertsPanels() {
  const payFn = useServerFn(getFailedPaymentAlerts);
  const hookFn = useServerFn(getWebhookFailureAlerts);
  const { data: pay } = useQuery({
    queryKey: ["admin", "failed-payments"],
    queryFn: () => payFn({ data: undefined as unknown as never }),
    refetchInterval: 60_000,
  });
  const { data: hooks } = useQuery({
    queryKey: ["admin", "webhook-failures"],
    queryFn: () => hookFn({ data: undefined as unknown as never }),
    refetchInterval: 60_000,
  });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="glass overflow-hidden rounded-xl">
        <div className="border-b border-border/30 px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Pagamentos falhos · {pay?.payments.length ?? 0}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {(pay?.payments ?? []).length === 0 ? (
            <p className="p-6 text-center text-xs italic text-muted-foreground">
              sem falhas recentes
            </p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {pay!.payments.map((p) => (
                  <tr key={p.id} className="border-b border-border/10">
                    <td className="px-4 py-2">
                      <p className="text-[11px] font-mono text-muted-foreground">
                        {p.user_id.slice(0, 8)}…
                      </p>
                      <p className="text-[10px] uppercase tracking-widest text-destructive">
                        {p.status} · {p.status_detail ?? "—"}
                      </p>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <p className="tabular-nums">R$ {Number(p.amount).toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(p.created_at).toLocaleString("pt-BR")}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="glass overflow-hidden rounded-xl">
        <div className="border-b border-border/30 px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Webhooks com erro · {hooks?.events.length ?? 0}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {(hooks?.events ?? []).length === 0 ? (
            <p className="p-6 text-center text-xs italic text-muted-foreground">
              nenhum erro nas últimas 24h
            </p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {hooks!.events.map((e) => (
                  <tr key={e.id} className="border-b border-border/10">
                    <td className="px-4 py-2">
                      <p className="text-[11px] uppercase tracking-widest text-[var(--copper)]">
                        {e.event_type}
                      </p>
                      <p
                        className="text-[10px] text-muted-foreground truncate max-w-[280px]"
                        title={e.error_text ?? ""}
                      >
                        {e.error_text}
                      </p>
                    </td>
                    <td className="px-4 py-2 text-right text-[10px] text-muted-foreground">
                      {new Date(e.created_at).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusRow({
  label,
  ok,
  sub,
  optional,
}: {
  label: string;
  ok?: boolean;
  sub?: string;
  optional?: boolean;
}) {
  const state = ok === undefined ? "unknown" : ok ? "ok" : optional ? "warn" : "down";
  const color =
    state === "ok"
      ? "bg-[var(--gold)]"
      : state === "warn"
        ? "bg-[var(--copper)]"
        : state === "down"
          ? "bg-destructive"
          : "bg-muted";
  const glow = state === "ok" ? "shadow-[0_0_12px_oklch(0.82_0.14_80/0.5)]" : "";
  return (
    <div className="glass flex items-center justify-between rounded-xl p-5">
      <div>
        <p className="text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">{sub ?? "—"}</p>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${color} ${glow} ${state === "ok" ? "animate-pulse" : ""}`}
        />
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{state}</span>
      </div>
    </div>
  );
}
