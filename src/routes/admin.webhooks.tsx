import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listWebhookEvents } from "@/lib/admin-advanced.functions";
import { SectionTitle } from "@/components/admin/SectionTitle";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/webhooks")({
  component: WebhooksPage,
});

function WebhooksPage() {
  const fn = useServerFn(listWebhookEvents);
  const [page, setPage] = useState(0);
  const [onlyFailures, setOnlyFailures] = useState(false);
  const [eventType, setEventType] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "webhooks", page, onlyFailures, eventType],
    queryFn: () =>
      fn({ data: { page, pageSize: 25, onlyFailures, eventType: eventType || undefined } }),
  });

  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 25));

  return (
    <div>
      <SectionTitle
        eyebrow="integrações"
        title="Eventos de webhook"
        description="Histórico de callbacks externos (Mercado Pago). Use para diagnosticar falhas de pagamento."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Filtrar por event_type (ex: payment.updated)"
          value={eventType}
          onChange={(e) => {
            setEventType(e.target.value);
            setPage(0);
          }}
          className="bg-background/40"
        />
        <button
          onClick={() => {
            setOnlyFailures((v) => !v);
            setPage(0);
          }}
          className={`rounded-full px-4 py-1.5 text-xs uppercase tracking-widest ${
            onlyFailures
              ? "bg-red-500/15 text-red-300 ring-1 ring-red-500/40"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {onlyFailures ? "só falhas ✓" : "só falhas"}
        </button>
      </div>

      <div className="glass overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 text-left text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                <th className="px-4 py-3 font-normal">Quando</th>
                <th className="px-4 py-3 font-normal">Provider</th>
                <th className="px-4 py-3 font-normal">Tipo</th>
                <th className="px-4 py-3 font-normal">External ID</th>
                <th className="px-4 py-3 font-normal">Processado</th>
                <th className="px-4 py-3 font-normal">Erro</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center italic text-muted-foreground">
                    carregando…
                  </td>
                </tr>
              )}
              {!isLoading && data?.rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center italic text-muted-foreground">
                    sem eventos
                  </td>
                </tr>
              )}
              {data?.rows.map((r) => (
                <tr key={r.id} className="border-b border-border/20 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-[11px] text-muted-foreground tabular-nums">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">{r.provider}</td>
                  <td className="px-4 py-3 text-[11px] uppercase tracking-widest text-[var(--gold)]/80">
                    {r.event_type}
                  </td>
                  <td className="px-4 py-3 text-[11px] text-muted-foreground">{r.external_id}</td>
                  <td className="px-4 py-3 text-[11px] text-muted-foreground">
                    {r.processed_at ? "✓" : "—"}
                  </td>
                  <td className="px-4 py-3 text-[11px] text-red-300">
                    {r.error_text ? r.error_text.slice(0, 80) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border/30 px-4 py-3 text-xs text-muted-foreground">
          <span>{total} eventos</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded px-2 py-1 disabled:opacity-30"
            >
              ← anterior
            </button>
            <span>
              {page + 1} / {pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
              disabled={page >= pages - 1}
              className="rounded px-2 py-1 disabled:opacity-30"
            >
              próxima →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
