import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listSegments } from "@/lib/admin-advanced.functions";
import { SectionTitle } from "@/components/admin/SectionTitle";

export const Route = createFileRoute("/admin/segments")({
  component: SegmentsPage,
});

const SEGMENT_LABEL: Record<string, string> = {
  highly_engaged: "Altamente engajado",
  dependent: "Dependente",
  churn_risk: "Risco de churn",
  high_cost: "Alto custo",
  conversion_candidate: "Candidato a conversão",
  returning: "Retornando",
  inactive: "Inativo",
};

function SegmentsPage() {
  const fn = useServerFn(listSegments);
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "segments", selected, page],
    queryFn: () => fn({ data: { segment: selected, page, pageSize: 25 } }),
  });

  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 25));

  return (
    <div>
      <SectionTitle
        eyebrow="inteligência comportamental"
        title="Segmentos"
        description="Classificação automática dos usuários. Recomputada diariamente pelo job de segmentação."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {data?.segments.map((s) => (
          <button
            key={s.segment}
            onClick={() => {
              setSelected(s.segment);
              setPage(0);
            }}
            className={`glass rounded-xl px-4 py-3 text-left transition-all ${
              selected === s.segment ? "ring-1 ring-[var(--gold)]/50" : "hover:bg-white/[0.02]"
            }`}
          >
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {SEGMENT_LABEL[s.segment] ?? s.segment}
            </p>
            <p className="serif mt-1 text-2xl gold-text">{s.count}</p>
          </button>
        ))}
        {!isLoading && (data?.segments.length ?? 0) === 0 && (
          <p className="col-span-full text-sm italic text-muted-foreground">
            nenhum segmento computado ainda — aguarde o job diário
          </p>
        )}
      </div>

      {selected && (
        <div className="glass overflow-hidden rounded-xl">
          <div className="flex items-center justify-between border-b border-border/30 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--gold)]/80">
              {SEGMENT_LABEL[selected] ?? selected} · {total} usuários
            </p>
            <button
              onClick={() => setSelected(undefined)}
              className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              limpar
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 text-left text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                <th className="px-4 py-3 font-normal">Usuário</th>
                <th className="px-4 py-3 font-normal">Plano</th>
                <th className="px-4 py-3 font-normal">Score</th>
                <th className="px-4 py-3 font-normal">Computado</th>
              </tr>
            </thead>
            <tbody>
              {data?.users.map((u) => (
                <tr key={u.userId} className="border-b border-border/20 hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <p>{u.displayName ?? "—"}</p>
                    <p className="text-[11px] text-muted-foreground">{u.userId.slice(0, 8)}</p>
                  </td>
                  <td className="px-4 py-3 text-[11px] uppercase tracking-widest text-[var(--gold)]/70">
                    {u.plan}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{u.score.toFixed(2)}</td>
                  <td className="px-4 py-3 text-[11px] text-muted-foreground">
                    {new Date(u.computedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-border/30 px-4 py-3 text-xs text-muted-foreground">
            <span>{total} usuários</span>
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
      )}
    </div>
  );
}
