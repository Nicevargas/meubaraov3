import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getObservability } from "@/lib/admin-observability.functions";
import { SectionTitle } from "@/components/admin/SectionTitle";
import { StatCard } from "@/components/admin/StatCard";

export const Route = createFileRoute("/admin/health")({
  component: HealthPage,
});

function HealthPage() {
  const fn = useServerFn(getObservability);
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin", "observability"],
    queryFn: () => fn({ data: undefined as unknown as never }),
    refetchInterval: 30_000,
  });

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <SectionTitle
          eyebrow="observabilidade"
          title="Saúde & latência"
          description="Métricas por endpoint, anomalias de pagamento e tentativas suspeitas no backoffice."
        />
        <button
          onClick={() => refetch()}
          className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground"
        >
          {isFetching ? "atualizando…" : "atualizar"}
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">um instante…</p>
      ) : !data ? (
        <p className="text-sm text-destructive">falha ao carregar.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
              label="Status geral"
              value={data.health.ok ? "OK" : "Degradado"}
              tone={data.health.ok ? "gold" : undefined}
              hint={data.health.killSwitch ? "kill switch ativo" : "sem incidentes"}
            />
            <StatCard
              label="Banco"
              value={data.health.db ? "Conectado" : "Falha"}
              tone={data.health.db ? "gold" : undefined}
            />
            <StatCard
              label="Anomalias 24h"
              value={data.health.recentAnomalies}
              hint="pagamentos suspeitos detectados"
            />
            <StatCard
              label="Falhas login admin 1h"
              value={data.health.recentLoginFailures}
              hint="brute-force gate · 5/15min bloqueia"
            />
          </div>

          <h3 className="serif text-xl gold-text mt-10 mb-4">Latência por endpoint (24h)</h3>
          {data.endpoints.length === 0 ? (
            <p className="text-sm text-muted-foreground">nenhuma métrica registrada ainda.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[color-mix(in_oklab,var(--gold)_15%,transparent)]">
              <table className="w-full text-sm">
                <thead className="bg-black/40 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">Rota</th>
                    <th className="text-right px-4 py-3">Req</th>
                    <th className="text-right px-4 py-3">5xx</th>
                    <th className="text-right px-4 py-3">p50</th>
                    <th className="text-right px-4 py-3">p95</th>
                    <th className="text-right px-4 py-3">p99</th>
                  </tr>
                </thead>
                <tbody>
                  {data.endpoints.map((e) => (
                    <tr key={e.path} className="border-t border-white/5">
                      <td className="px-4 py-2 font-mono text-xs">{e.path}</td>
                      <td className="px-4 py-2 text-right">{e.requests}</td>
                      <td
                        className={`px-4 py-2 text-right ${e.errorRate > 0.05 ? "text-destructive" : ""}`}
                      >
                        {e.errors} ({Math.round(e.errorRate * 100)}%)
                      </td>
                      <td className="px-4 py-2 text-right">{e.p50}ms</td>
                      <td className="px-4 py-2 text-right">{e.p95}ms</td>
                      <td className="px-4 py-2 text-right">{e.p99}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h3 className="serif text-xl gold-text mt-10 mb-4">Anomalias de pagamento (24h)</h3>
          {data.anomalies.length === 0 ? (
            <p className="text-sm text-muted-foreground">nenhuma anomalia detectada.</p>
          ) : (
            <ul className="space-y-2">
              {data.anomalies.map((a) => (
                <li
                  key={a.id}
                  className="rounded-lg border border-white/5 bg-black/30 px-4 py-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-xs">{a.anomaly_type}</span>
                    <span
                      className={`text-[10px] uppercase tracking-[0.25em] ${
                        a.severity === "high"
                          ? "text-destructive"
                          : a.severity === "medium"
                            ? "text-[var(--gold)]"
                            : "text-muted-foreground"
                      }`}
                    >
                      {a.severity}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(a.detected_at).toLocaleString("pt-BR")} ·{" "}
                    {JSON.stringify(a.details).slice(0, 200)}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <h3 className="serif text-xl gold-text mt-10 mb-4">Tentativas de login admin (1h)</h3>
          {data.loginAttempts.length === 0 ? (
            <p className="text-sm text-muted-foreground">sem tentativas recentes.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/5">
              <table className="w-full text-sm">
                <thead className="bg-black/40 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">Quando</th>
                    <th className="text-left px-4 py-3">Email</th>
                    <th className="text-left px-4 py-3">Resultado</th>
                    <th className="text-left px-4 py-3">IP (hash)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.loginAttempts.map((a, i) => (
                    <tr key={i} className="border-t border-white/5">
                      <td className="px-4 py-2 text-xs">
                        {new Date(a.attempted_at).toLocaleTimeString("pt-BR")}
                      </td>
                      <td className="px-4 py-2 text-xs">{a.email}</td>
                      <td
                        className={`px-4 py-2 text-xs ${a.success ? "text-[var(--gold)]" : "text-destructive"}`}
                      >
                        {a.success ? "sucesso" : "falha"}
                      </td>
                      <td className="px-4 py-2 font-mono text-[10px] text-muted-foreground">
                        {a.ip_hash ? a.ip_hash.slice(0, 12) + "…" : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
