import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getUsageHeatmap } from "@/lib/admin-advanced.functions";
import { SectionTitle } from "@/components/admin/SectionTitle";

export const Route = createFileRoute("/admin/heatmap")({
  component: HeatmapPage,
});

const DAY_LABELS = ["d-6", "d-5", "d-4", "d-3", "d-2", "ontem", "hoje"];

function HeatmapPage() {
  const fn = useServerFn(getUsageHeatmap);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "heatmap"],
    queryFn: () => fn({ data: undefined as unknown as never }),
  });

  return (
    <div>
      <SectionTitle
        eyebrow="atividade"
        title="Mapa de calor — mensagens por hora"
        description="Últimos 7 dias × 24 horas (UTC). Identifica picos de uso e momentos ociosos."
      />

      {isLoading && <p className="italic text-muted-foreground">carregando…</p>}

      {data && (
        <div className="glass rounded-xl p-5 overflow-x-auto">
          <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <span>total {data.totalMessages.toLocaleString()} msgs</span>
            <span>máx/hora {data.max}</span>
          </div>
          <table className="text-[10px]">
            <thead>
              <tr>
                <th className="w-12"></th>
                {Array.from({ length: 24 }).map((_, h) => (
                  <th key={h} className="w-5 text-muted-foreground text-center">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.grid.map((row, dIdx) => (
                <tr key={dIdx}>
                  <td className="pr-2 text-right text-muted-foreground">{DAY_LABELS[dIdx]}</td>
                  {row.map((v, h) => {
                    const intensity = data.max > 0 ? v / data.max : 0;
                    const bg =
                      intensity === 0
                        ? "rgba(255,255,255,0.03)"
                        : `color-mix(in oklab, var(--gold) ${Math.round(intensity * 80)}%, transparent)`;
                    return (
                      <td key={h} className="p-0.5">
                        <div
                          className="h-5 w-5 rounded"
                          style={{ background: bg }}
                          title={`${DAY_LABELS[dIdx]} ${h}h: ${v} msgs`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
