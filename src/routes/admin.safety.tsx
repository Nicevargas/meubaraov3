import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getInsights } from "@/lib/admin.functions";
import { StatCard } from "@/components/admin/StatCard";
import { SectionTitle } from "@/components/admin/SectionTitle";

export const Route = createFileRoute("/admin/safety")({
  component: SafetyPage,
});

function SafetyPage() {
  const fn = useServerFn(getInsights);
  const { data } = useQuery({
    queryKey: ["admin", "insights"],
    queryFn: () => fn({ data: undefined as unknown as never }),
  });

  return (
    <div>
      <SectionTitle
        eyebrow="cuidado discreto"
        title="Segurança & risco"
        description="Sinais agregados — sem ler conversas, sem expor identidades. Apenas o suficiente para cuidar."
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Sinais de crise (7d)"
          value={data?.safety.crisisSignals7d ?? 0}
          tone="danger"
          hint="frases-gatilho detectadas"
        />
        <StatCard
          label="Padrões de dependência"
          value={data?.safety.obsessionSignals7d ?? 0}
          tone="warn"
        />
        <StatCard
          label="Usuários sinalizados"
          value={data?.safety.flaggedUsers ?? 0}
          hint="únicos no período"
        />
        <StatCard
          label="Mensagens de contato"
          value={data?.support.contactByType.reduce((a, b) => a + b.count, 0) ?? 0}
        />
      </div>

      <div className="mt-8 glass rounded-xl p-6">
        <h3 className="serif text-xl gold-text">Princípios</h3>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li>— A detecção é por padrões agregados. Nunca exibimos conteúdo aqui.</li>
          <li>
            — O modo de contenção da IA já intervém em tempo real; este painel é para visão
            sistêmica.
          </li>
          <li>— Para inspeção individual, role apropriado é necessário e a ação é registrada.</li>
        </ul>
      </div>

      <div className="mt-6 glass rounded-xl p-6">
        <h3 className="serif text-xl gold-text">Mensagens recebidas (7d)</h3>
        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          {(data?.support.contactByType ?? []).map((c) => (
            <div key={c.type} className="rounded-lg border border-border/30 p-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {c.type}
              </p>
              <p className="serif mt-1 text-2xl">{c.count}</p>
            </div>
          ))}
          {(data?.support.contactByType ?? []).length === 0 && (
            <p className="text-sm italic text-muted-foreground">sem mensagens no período</p>
          )}
        </div>
      </div>
    </div>
  );
}
