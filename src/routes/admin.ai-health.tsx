import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getInsights, getOverviewStats } from "@/lib/admin.functions";
import { StatCard } from "@/components/admin/StatCard";
import { SectionTitle } from "@/components/admin/SectionTitle";

export const Route = createFileRoute("/admin/ai-health")({
  component: AiHealthPage,
});

function AiHealthPage() {
  const insights = useServerFn(getInsights);
  const overview = useServerFn(getOverviewStats);
  const { data } = useQuery({
    queryKey: ["admin", "insights"],
    queryFn: () => insights({ data: undefined as unknown as never }),
    refetchInterval: 60_000,
  });
  const { data: ov } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => overview({ data: undefined as unknown as never }),
  });

  return (
    <div>
      <SectionTitle
        eyebrow="estabilidade conversacional"
        title="Saúde da IA"
        description="Onde o Barão respira bem — e onde precisa de ar."
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Estabilidade"
          value={`${Math.round((ov?.health.stabilityScore ?? 0) * 100)}%`}
          tone="gold"
          estimated
          hint="1 − recoveries / usuários"
        />
        <StatCard label="Recuperações 7d" value={data?.recovery.last7d ?? 0} tone="warn" />
        <StatCard label="Recuperações 30d" value={data?.recovery.last30d ?? 0} />
        <StatCard
          label="Taxa de sucesso"
          value={`${Math.round((data?.recovery.successRate ?? 1) * 100)}%`}
          estimated
          hint="conversas ativas sem recovery"
        />
      </div>

      <div className="mt-8 glass rounded-xl p-6">
        <h3 className="serif text-xl gold-text">Tendência de recuperações (14 dias)</h3>
        <p className="text-xs text-muted-foreground">
          picos indicam instabilidade emocional ou de provider
        </p>
        <Sparkline points={data?.recovery.trend ?? []} />
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <StatCard label="Provider" value="Lovable AI" hint="gateway estável" />
        <StatCard
          label="Interrupções de stream"
          value="—"
          estimated
          hint="instrumentação pendente"
        />
        <StatCard
          label="Colisões de moderação"
          value="—"
          estimated
          hint="instrumentação pendente"
        />
      </div>
    </div>
  );
}

function Sparkline({ points }: { points: { date: string; count: number }[] }) {
  if (points.length === 0)
    return <p className="mt-6 text-sm italic text-muted-foreground">Sem eventos no período.</p>;
  const max = Math.max(...points.map((p) => p.count), 1);
  const w = 600;
  const h = 120;
  const step = w / Math.max(1, points.length - 1);
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${i * step} ${h - (p.count / max) * (h - 12) - 6}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-4 h-32 w-full">
      <defs>
        <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.78 0.13 75)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="oklch(0.78 0.13 75)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L ${w} ${h} L 0 ${h} Z`} fill="url(#g1)" />
      <path d={path} stroke="oklch(0.82 0.14 80)" strokeWidth="1.5" fill="none" />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={i * step}
          cy={h - (p.count / max) * (h - 12) - 6}
          r="2"
          fill="oklch(0.82 0.14 80)"
        />
      ))}
    </svg>
  );
}
