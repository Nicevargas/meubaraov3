import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getOverviewStats } from "@/lib/admin.functions";
import { getAdminOverview } from "@/lib/admin-ops.functions";
import { StatCard } from "@/components/admin/StatCard";
import { SectionTitle } from "@/components/admin/SectionTitle";

export const Route = createFileRoute("/admin/")({
  component: OverviewPage,
});

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

export function OverviewPage() {
  const fn = useServerFn(getOverviewStats);
  const opsFn = useServerFn(getAdminOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => fn({ data: undefined as unknown as never }),
    refetchInterval: 60_000,
  });
  const { data: ops, isLoading: opsLoading } = useQuery({
    queryKey: ["admin", "overview-ops"],
    queryFn: () => opsFn({ data: undefined as unknown as never }),
    refetchInterval: 60_000,
  });

  return (
    <div>
      <SectionTitle
        eyebrow="control room"
        title="Visão geral"
        description="Pulso do ecossistema emocional — usuários, conversas, recuperação e custos em tempo quase real."
      />

      {isLoading || !data ? (
        <SkeletonGrid />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
              label="Usuários totais"
              value={data.users.total.toLocaleString("pt-BR")}
              tone="gold"
            />
            <StatCard label="Premium" value={data.users.premium.toLocaleString("pt-BR")} />
            <StatCard label="Elite" value={data.users.elite.toLocaleString("pt-BR")} tone="gold" />
            <StatCard
              label="Ativos (24h)"
              value={data.users.activeLast24h.toLocaleString("pt-BR")}
            />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
              label="Mensagens hoje"
              value={data.conversations.messagesToday.toLocaleString("pt-BR")}
            />
            <StatCard
              label="Recuperações 7d"
              value={data.conversations.recoveryEvents7d}
              tone="warn"
              hint="conversas que precisaram de novo começo"
            />
            <StatCard
              label="Assinaturas ativas"
              value={data.billing.activeSubscriptions.toLocaleString("pt-BR")}
            />
            <StatCard
              label="Estabilidade da IA"
              value={`${Math.round(data.health.stabilityScore * 100)}%`}
              tone="gold"
              hint="1 − (recoveries / usuários)"
              estimated
            />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
              label="Memórias ativas"
              value={data.memory.activeEvents.toLocaleString("pt-BR")}
              hint="eventos vivos (v2.1)"
              tone="gold"
            />
            <StatCard
              label="Identidades formadas"
              value={data.memory.usersWithIdentity.toLocaleString("pt-BR")}
              hint="usuárias com perfil probabilístico"
            />
            <StatCard
              label="Expirando 24h"
              value={data.memory.eventsExpiringSoon.toLocaleString("pt-BR")}
              hint="serão removidas pelo TTL sweep"
              tone={data.memory.eventsExpiringSoon > 200 ? "warn" : "default"}
            />
            <StatCard
              label="Custo IA hoje"
              value={`$${data.cost.estCostUsdToday.toFixed(4)}`}
              estimated
              hint="DeepSeek ~$0.14/M"
            />
          </div>
        </>
      )}

      <div className="mt-10">
        <SectionTitle
          eyebrow="operações"
          title="Receita, retenção & custo"
          description="Métricas operacionais — Mercado Pago, assinaturas, custo real da IA e alertas críticos."
        />

        {opsLoading || !ops ? (
          <SkeletonGrid />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard
                label="MRR (mês)"
                value={brl(ops.revenue.mrrBrl)}
                tone="gold"
                hint="pagamentos aprovados no mês"
                estimated
              />
              <StatCard
                label="ARPU"
                value={brl(ops.revenue.arpuBrl)}
                hint="MRR ÷ premium ativos"
                estimated
              />
              <StatCard
                label="Aprovação 30d"
                value={pct(ops.revenue.approvalRate)}
                hint={`${ops.revenue.paymentsApproved7d} pagos 7d`}
              />
              <StatCard
                label="Locks ativos"
                value={ops.totals.lockedUsers}
                tone={ops.totals.lockedUsers > 0 ? "warn" : "default"}
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard
                label="Conversão 30d"
                value={pct(ops.retention.conversionRate)}
                hint="pagos ÷ novos cadastros"
                estimated
              />
              <StatCard
                label="Churn (mês)"
                value={pct(ops.retention.churnRate)}
                hint={`${ops.retention.cancelledThisMonth} cancelamentos`}
                tone={ops.retention.churnRate > 0.1 ? "warn" : "default"}
              />
              <StatCard
                label="Mensagens (mês)"
                value={ops.usage.messagesThisMonth.toLocaleString("pt-BR")}
                hint={`${ops.usage.activeUsersThisMonth} usuários ativos`}
              />
              <StatCard
                label="Custo IA (mês)"
                value={`$${ops.usage.estCostUsdThisMonth.toFixed(2)}`}
                tone="warn"
                estimated
                hint={`média ${ops.usage.avgMessagesPerUser.toFixed(1)} msg/user`}
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-2">
              <StatCard
                label="Pagamentos falhos (24h)"
                value={ops.alerts.failedPayments24h}
                tone={ops.alerts.failedPayments24h > 0 ? "danger" : "default"}
                hint="rejected/failed/cancelled"
              />
              <StatCard
                label="Webhooks com erro (24h)"
                value={ops.alerts.webhookFailures24h}
                tone={ops.alerts.webhookFailures24h > 0 ? "danger" : "default"}
                hint="ver /admin/system"
              />
            </div>

            {ops.heavyUsers.length > 0 && (
              <div className="glass mt-6 overflow-hidden rounded-xl">
                <div className="border-b border-border/30 px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Top 20 usuários por custo (30d)
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/20 text-left text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        <th className="px-4 py-2 font-normal">User ID</th>
                        <th className="px-4 py-2 font-normal text-right">Mensagens</th>
                        <th className="px-4 py-2 font-normal text-right">Custo (USD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ops.heavyUsers.map((u) => (
                        <tr
                          key={u.userId}
                          className="border-b border-border/10 hover:bg-white/[0.02]"
                        >
                          <td className="px-4 py-2 font-mono text-[11px] text-muted-foreground">
                            {u.userId.slice(0, 8)}…
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums">
                            {u.messages.toLocaleString("pt-BR")}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-[var(--gold)]">
                            ${u.costUsd.toFixed(4)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="glass h-28 animate-pulse rounded-xl opacity-40" />
      ))}
    </div>
  );
}
