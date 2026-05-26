import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getBillingStats } from "@/lib/admin.functions";
import { StatCard } from "@/components/admin/StatCard";
import { SectionTitle } from "@/components/admin/SectionTitle";

export const Route = createFileRoute("/admin/billing")({
  component: BillingPage,
});

function BillingPage() {
  const fn = useServerFn(getBillingStats);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "billing"],
    queryFn: () => fn({ data: undefined as unknown as never }),
  });

  return (
    <div>
      <SectionTitle
        eyebrow="finanças"
        title="Assinaturas & receita"
        description="Onde o desejo encontra a recorrência."
      />
      {isLoading || !data ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass h-28 animate-pulse rounded-xl opacity-40" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
              label="MRR estimado"
              value={`R$ ${data.estimatedMrrBrl.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
              tone="gold"
              estimated
              hint="planos ativos · normalizado mensal"
            />
            <StatCard label="Ativas" value={data.counts.active} />
            <StatCard label="Em trial" value={data.counts.trialing} />
            <StatCard
              label="Renovações próximas"
              value={data.pendingRenewals}
              hint="próximos 7 dias"
            />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Premium" value={data.byPlan.premium ?? 0} />
            <StatCard label="Elite" value={data.byPlan.elite ?? 0} tone="gold" />
            <StatCard label="Inadimplentes" value={data.counts.pastDue} tone="warn" />
            <StatCard label="Canceladas" value={data.counts.canceled} />
          </div>
          <p className="mt-6 text-xs italic text-muted-foreground">
            Receita exibida usando preços indicativos por plano. Para valores fiscais oficiais
            consulte o painel do Mercado Pago.
          </p>
        </>
      )}
    </div>
  );
}
