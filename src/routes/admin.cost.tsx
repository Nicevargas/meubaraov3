import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getInsights } from "@/lib/admin.functions";
import { StatCard } from "@/components/admin/StatCard";
import { SectionTitle } from "@/components/admin/SectionTitle";

export const Route = createFileRoute("/admin/cost")({
  component: CostPage,
});

function CostPage() {
  const fn = useServerFn(getInsights);
  const { data } = useQuery({
    queryKey: ["admin", "insights"],
    queryFn: () => fn({ data: undefined as unknown as never }),
  });
  const top = data?.cost.topSpenders ?? [];

  return (
    <div>
      <SectionTitle
        eyebrow="economia da intimidade"
        title="Tokens & custo"
        description="Onde o orçamento da IA respira — e onde ele queima."
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Tokens (7d)"
          value={(data?.cost.tokens7d ?? 0).toLocaleString("pt-BR")}
          estimated
          hint="estimado a partir do tamanho das mensagens"
        />
        <StatCard
          label="Custo estimado (7d)"
          value={`$${(data?.cost.estUsd7d ?? 0).toFixed(2)}`}
          tone="gold"
          estimated
          hint="DeepSeek ~$0.14/M"
        />
        <StatCard
          label="Maior consumidor"
          value={`${Math.round(top[0]?.tokens ?? 0).toLocaleString("pt-BR")}`}
          hint="tokens estimados"
        />
        <StatCard label="Usuários monitorados" value={top.length} />
      </div>

      <div className="mt-8 glass rounded-xl">
        <div className="border-b border-border/30 px-6 py-4">
          <h3 className="serif text-xl gold-text">Top consumidores (7d)</h3>
          <p className="text-xs text-muted-foreground">
            por estimativa de tokens · IDs parciais por privacidade
          </p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
              <th className="px-6 py-3 font-normal">#</th>
              <th className="px-6 py-3 font-normal">Usuário</th>
              <th className="px-6 py-3 font-normal text-right">Tokens (est.)</th>
              <th className="px-6 py-3 font-normal text-right">Custo (est.)</th>
            </tr>
          </thead>
          <tbody>
            {top.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground italic">
                  nenhum dado no período
                </td>
              </tr>
            )}
            {top.map((t, i) => (
              <tr key={t.userId} className="border-t border-border/20 hover:bg-white/[0.02]">
                <td className="px-6 py-3 tabular-nums text-muted-foreground">{i + 1}</td>
                <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                  {t.userId.slice(0, 8)}…
                </td>
                <td className="px-6 py-3 text-right tabular-nums">
                  {t.tokens.toLocaleString("pt-BR")}
                </td>
                <td className="px-6 py-3 text-right tabular-nums text-[var(--gold)]">
                  ${t.estUsd.toFixed(4)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
