import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getInsights } from "@/lib/admin.functions";
import { StatCard } from "@/components/admin/StatCard";
import { SectionTitle } from "@/components/admin/SectionTitle";

export const Route = createFileRoute("/admin/emotional")({
  component: EmotionalPage,
});

function EmotionalPage() {
  const fn = useServerFn(getInsights);
  const { data } = useQuery({
    queryKey: ["admin", "insights"],
    queryFn: () => fn({ data: undefined as unknown as never }),
  });

  const dist = data?.emotional.intentionDist ?? [];
  const max = Math.max(1, ...dist.map((d) => d.count));

  return (
    <div>
      <SectionTitle
        eyebrow="dinâmica emocional"
        title="Analítica emocional"
        description="O que move os usuários — e onde o desejo se sustenta."
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Peso emocional médio"
          value={(data?.emotional.avgEmotionalWeight ?? 0).toFixed(1)}
          tone="gold"
          hint="escala do ritual (1–5)"
        />
        <StatCard label="Rituais completos" value={data?.emotional.assessmentsTotal ?? 0} />
        <StatCard label="Ativos (24h)" value={data?.emotional.activeUsers24h ?? 0} />
        <StatCard
          label="Conversões pós-ritual"
          value="—"
          estimated
          hint="instrumentação em construção"
        />
      </div>

      <div className="mt-8 glass rounded-xl p-6">
        <h3 className="serif text-xl gold-text">Distribuição de intenções</h3>
        <p className="text-xs text-muted-foreground">o que cada um veio buscar no Barão</p>
        <div className="mt-6 space-y-3">
          {dist.length === 0 && (
            <p className="text-sm italic text-muted-foreground">sem rituais registrados ainda</p>
          )}
          {dist.map((d) => (
            <div key={d.label}>
              <div className="flex justify-between text-xs">
                <span className="capitalize text-muted-foreground">{d.label}</span>
                <span className="tabular-nums text-foreground">{d.count}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--copper)] to-[var(--gold)]"
                  style={{ width: `${(d.count / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
