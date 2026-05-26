import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  getRetentionOverview,
  triggerRetentionDispatch,
  requeueReengagementItem,
} from "@/lib/admin-retention.functions";
import { SectionTitle } from "@/components/admin/SectionTitle";
import { StatCard } from "@/components/admin/StatCard";

export const Route = createFileRoute("/admin/retention")({
  component: RetentionPage,
});

function RetentionPage() {
  const fetchOverview = useServerFn(getRetentionOverview);
  const dispatch = useServerFn(triggerRetentionDispatch);
  const requeue = useServerFn(requeueReengagementItem);

  const [reason, setReason] = useState("manual_dispatch");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin", "retention"],
    queryFn: () => fetchOverview({ data: undefined as unknown as never }),
    refetchInterval: 30_000,
  });

  const runMut = useMutation({
    mutationFn: () => dispatch({ data: { reason } }),
    onSuccess: (r) => {
      toast.success(`Dispatch: ${r.sent} enviados · ${r.failed} falhas · ${r.skipped} ignorados`);
      refetch();
    },
    onError: (e) => toast.error(String(e)),
  });

  const requeueMut = useMutation({
    mutationFn: (id: string) => requeue({ data: { id } }),
    onSuccess: () => {
      toast.success("Reenfileirado");
      refetch();
    },
  });

  const last = data?.reports?.[0];

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <SectionTitle
          eyebrow="retenção"
          title="Fila de reengajamento"
          description="Mensagens automáticas para usuários inativos, em risco e com pagamentos falhos. Email via Lovable Email, WhatsApp via Twilio."
        />
        <button
          onClick={() => refetch()}
          className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground"
        >
          {isFetching ? "atualizando…" : "atualizar"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Pendentes" value={data?.counts.pending ?? 0} hint="aguardando envio" />
        <StatCard label="Enviados (50 últimas)" value={data?.counts.sent ?? 0} tone="gold" />
        <StatCard label="Falhas" value={data?.counts.failed ?? 0} />
        <StatCard
          label="MRR (ontem)"
          value={last ? `R$ ${Number(last.mrr_brl).toFixed(0)}` : "—"}
          hint={last ? `${last.active_subscriptions} assinaturas` : "sem relatório"}
        />
      </div>

      <div className="mt-8 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            motivo do dispatch
          </span>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm"
          />
        </label>
        <button
          onClick={() => runMut.mutate()}
          disabled={runMut.isPending}
          className="rounded-md bg-[var(--gold)]/15 px-4 py-2 text-sm text-[var(--gold)] hover:bg-[var(--gold)]/25 disabled:opacity-50"
        >
          {runMut.isPending ? "executando…" : "Executar dispatch agora"}
        </button>
      </div>

      <h3 className="serif text-xl gold-text mt-10 mb-4">Fila (últimas 50)</h3>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">um instante…</p>
      ) : (data?.queue ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">fila vazia.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full text-sm">
            <thead className="bg-black/40 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Quando</th>
                <th className="text-left px-3 py-2">Motivo</th>
                <th className="text-left px-3 py-2">Canal</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-right px-3 py-2">Tent.</th>
                <th className="text-left px-3 py-2">Erro</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(data?.queue ?? []).map((q) => (
                <tr key={q.id} className="border-t border-white/5">
                  <td className="px-3 py-2 text-xs">
                    {new Date(q.created_at).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px]">{q.reason}</td>
                  <td className="px-3 py-2 text-xs">{q.channel}</td>
                  <td
                    className={`px-3 py-2 text-xs ${
                      q.status === "sent"
                        ? "text-[var(--gold)]"
                        : q.status === "failed"
                          ? "text-destructive"
                          : "text-muted-foreground"
                    }`}
                  >
                    {q.status}
                  </td>
                  <td className="px-3 py-2 text-right text-xs">{q.attempts}</td>
                  <td className="px-3 py-2 text-[10px] text-muted-foreground max-w-[260px] truncate">
                    {q.error_text ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {q.status !== "pending" && (
                      <button
                        onClick={() => requeueMut.mutate(q.id)}
                        className="text-[10px] uppercase tracking-[0.25em] text-[var(--gold)]/80 hover:text-[var(--gold)]"
                      >
                        reenfileirar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 className="serif text-xl gold-text mt-10 mb-4">Relatórios diários (7d)</h3>
      {(data?.reports ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">sem relatórios ainda.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full text-sm">
            <thead className="bg-black/40 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Data</th>
                <th className="text-right px-3 py-2">Signups</th>
                <th className="text-right px-3 py-2">Ativos</th>
                <th className="text-right px-3 py-2">Mensagens</th>
                <th className="text-right px-3 py-2">Custo AI</th>
                <th className="text-right px-3 py-2">Pag. OK</th>
                <th className="text-right px-3 py-2">Pag. Falh.</th>
                <th className="text-right px-3 py-2">MRR</th>
              </tr>
            </thead>
            <tbody>
              {(data?.reports ?? []).map((r) => (
                <tr key={r.report_date} className="border-t border-white/5">
                  <td className="px-3 py-2 text-xs">{r.report_date}</td>
                  <td className="px-3 py-2 text-right text-xs">{r.new_signups}</td>
                  <td className="px-3 py-2 text-right text-xs">{r.active_users}</td>
                  <td className="px-3 py-2 text-right text-xs">{r.messages_sent}</td>
                  <td className="px-3 py-2 text-right text-xs">
                    ${Number(r.ai_cost_usd).toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right text-xs">{r.payments_approved}</td>
                  <td className="px-3 py-2 text-right text-xs">{r.payments_failed}</td>
                  <td className="px-3 py-2 text-right text-xs">
                    R$ {Number(r.mrr_brl).toFixed(0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
