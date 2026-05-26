import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  auditUserMemory,
  clearUserIdentityFn,
  getMemoryV2Stats,
  recalculateUserIdentityFn,
  runMemoryConsolidationNow,
  runMemoryTtlSweepNow,
} from "@/lib/admin-memory.functions";
import { StatCard } from "@/components/admin/StatCard";
import { SectionTitle } from "@/components/admin/SectionTitle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/memory")({
  component: MemoryPage,
});

function MemoryPage() {
  const statsFn = useServerFn(getMemoryV2Stats);
  const ttlFn = useServerFn(runMemoryTtlSweepNow);
  const consFn = useServerFn(runMemoryConsolidationNow);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["admin", "memory-v2"],
    queryFn: () => statsFn({ data: undefined as never }),
    refetchInterval: 30_000,
  });

  const ttl = useMutation({
    mutationFn: () => ttlFn({ data: undefined as never }),
    onSuccess: (r) => {
      toast.success(`TTL sweep: ${r.status}`);
      qc.invalidateQueries({ queryKey: ["admin", "memory-v2"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const cons = useMutation({
    mutationFn: () => consFn({ data: undefined as never }),
    onSuccess: (r) => {
      toast.success(`Consolidação: ${r.status}`);
      qc.invalidateQueries({ queryKey: ["admin", "memory-v2"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const layers = data?.layers;
  const exp = data?.expiredPendingCleanup;
  const pipe = data?.pipeline;

  return (
    <div>
      <SectionTitle
        eyebrow="memória v2"
        title="Arquitetura emocional em camadas"
        description="Métricas operacionais reais — TTL, decay, identidade probabilística."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Chunks temp" value={layers?.temporaryChunks ?? 0} hint="TTL 24h" />
        <StatCard label="Eventos" value={layers?.events ?? 0} hint="30–90d" />
        <StatCard label="Summaries" value={layers?.summaries ?? 0} />
        <StatCard label="Identidades" value={layers?.identities ?? 0} tone="gold" />
        <StatCard label="Estados emocionais" value={layers?.emotionalStates ?? 0} />
        <StatCard label="Arquivadas" value={layers?.archived ?? 0} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Chunks expirados"
          value={exp?.chunks ?? 0}
          hint="aguardando sweep"
          tone={(exp?.chunks ?? 0) > 100 ? "warn" : "default"}
        />
        <StatCard
          label="Eventos expirados"
          value={exp?.events ?? 0}
          hint="aguardando sweep"
          tone={(exp?.events ?? 0) > 100 ? "warn" : "default"}
        />
        <StatCard
          label="Duplicatas consolidadas"
          value={pipe?.consolidatedEvents ?? 0}
          hint="reinforcement_count > 1"
        />
        <StatCard
          label="Colisões dedup"
          value={pipe?.duplicateCollisions ?? 0}
          hint="canonical_key colidiu"
        />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Compressões 24h"
          value={data?.operational?.compressedToday ?? 0}
          hint="eventos agrupados em summaries"
        />
        <StatCard
          label="Decay 24h"
          value={data?.operational?.archivedOrDeletedToday ?? 0}
          hint="arquivadas + deletadas"
        />
        <StatCard
          label="Economia tokens"
          value={`~${(data?.operational?.estTokenSavingsToday ?? 0).toLocaleString("pt-BR")}`}
          estimated
          hint="80 tokens/mem evitada"
          tone="gold"
        />
        <StatCard
          label="Média mem/usuária"
          value={data?.operational?.avgMemPerUser ?? 0}
          hint="amostra recente"
        />
        <StatCard
          label="Eficiência dedup"
          value={`${Math.round((data?.operational?.dedupEfficiency ?? 0) * 100)}%`}
          hint="colisões / amostra"
        />
        <StatCard
          label="Taxa de decay"
          value={`${Math.round((data?.operational?.decayRate ?? 0) * 100)}%`}
          hint="rotação diária do pool"
        />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard label="Avg confidence" value={pipe?.avgConfidence ?? 0} />
        <StatCard label="Avg importance" value={pipe?.avgImportance ?? 0} />
        <StatCard label="Avg emotional weight" value={pipe?.avgEmotionalWeight ?? 0} />
      </div>

      {(data?.operational?.excessiveUsers ?? []).length > 0 && (
        <div className="mt-6 glass rounded-xl p-5">
          <h3 className="serif text-lg gold-text">
            Usuárias com memória excessiva (&gt;60 eventos)
          </h3>
          <ul className="mt-3 space-y-1 text-sm">
            {(data?.operational?.excessiveUsers ?? []).map((u) => (
              <li
                key={u.userId}
                className="flex justify-between border-b border-[var(--copper)]/30 py-1"
              >
                <code className="text-xs text-muted-foreground">{u.userId.slice(0, 8)}…</code>
                <span className="text-[var(--copper)]">{u.eventCount} eventos</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 glass rounded-xl p-5">
        <h3 className="serif text-lg gold-text">Distribuição por tipo</h3>
        <div className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-6 text-sm">
          {Object.entries(pipe?.typeCounts ?? {}).map(([k, v]) => (
            <div key={k} className="rounded border border-border/40 p-2">
              <div className="text-xs uppercase text-muted-foreground">{k}</div>
              <div className="serif text-xl">{v as number}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between">
            <h3 className="serif text-lg gold-text">Top usuárias por volume</h3>
          </div>
          <ul className="mt-3 space-y-1 text-sm">
            {(data?.topUsers ?? []).map((u) => (
              <li key={u.userId} className="flex justify-between border-b border-border/30 py-1">
                <code className="text-xs text-muted-foreground">{u.userId.slice(0, 8)}…</code>
                <span>{u.eventCount} eventos</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="glass rounded-xl p-5">
          <h3 className="serif text-lg gold-text">Free com persistência (anomalia)</h3>
          {(data?.freeWithMemory ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Nenhuma free com memória persistente.
            </p>
          ) : (
            <ul className="mt-3 space-y-1 text-sm">
              {(data?.freeWithMemory ?? []).map((u) => (
                <li
                  key={u.userId}
                  className="flex justify-between border-b border-destructive/30 py-1"
                >
                  <code className="text-xs text-destructive">{u.userId.slice(0, 8)}…</code>
                  <span>{u.eventCount}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-6 glass rounded-xl p-5">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => ttl.mutate()} disabled={ttl.isPending}>
            Rodar TTL sweep
          </Button>
          <Button onClick={() => cons.mutate()} disabled={cons.isPending} variant="secondary">
            Rodar consolidation
          </Button>
          <span className="text-xs text-muted-foreground">
            Cooldown: TTL 5min · Consolidação 15min · Idempotente.
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="glass rounded-xl p-5">
          <h3 className="serif text-lg gold-text">Últimos jobs</h3>
          <ul className="mt-3 space-y-1 text-xs">
            {(data?.jobs.recentRuns ?? []).map((r) => (
              <li key={r.id} className="flex justify-between border-b border-border/30 py-1">
                <span>
                  <code>{r.job_name}</code> · {r.status}
                </span>
                <span className="text-muted-foreground">
                  {new Date(r.started_at).toLocaleString("pt-BR")}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="glass rounded-xl p-5">
          <h3 className="serif text-lg gold-text">Erros recentes do pipeline</h3>
          {(data?.jobs.recentErrors ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Sem erros recentes.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-xs">
              {(data?.jobs.recentErrors ?? []).map((r) => (
                <li key={r.id} className="rounded border border-destructive/40 p-2">
                  <div className="font-mono">{r.job_name}</div>
                  <div className="text-destructive">{r.error}</div>
                  <div className="text-muted-foreground">
                    {new Date(r.started_at).toLocaleString("pt-BR")}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <IdentityAuditPanel />

      <div className="mt-6 glass rounded-xl p-5">
        <h3 className="serif text-lg gold-text">Histórico recente de identidade</h3>
        <ul className="mt-3 space-y-1 text-xs">
          {(data?.identityHistorySample ?? []).map((h) => (
            <li key={h.id} className="border-b border-border/30 py-1">
              <code className="text-muted-foreground">{h.user_id.slice(0, 8)}…</code> ·{" "}
              <strong>{h.key}</strong>: {h.prev_value ?? "—"} → {h.new_value ?? "—"} ({h.status},{" "}
              {Math.round(Number(h.confidence) * 100)}%)
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function IdentityAuditPanel() {
  const [userId, setUserId] = useState("");
  const auditFn = useServerFn(auditUserMemory);
  const clearFn = useServerFn(clearUserIdentityFn);
  const recalcFn = useServerFn(recalculateUserIdentityFn);

  const audit = useMutation({
    mutationFn: (uid: string) => auditFn({ data: { userId: uid } }),
    onError: (e: Error) => toast.error(e.message),
  });
  const clear = useMutation({
    mutationFn: (uid: string) => clearFn({ data: { userId: uid } }),
    onSuccess: () => {
      toast.success("Identidade limpa");
      if (userId) audit.mutate(userId);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const recalc = useMutation({
    mutationFn: (uid: string) => recalcFn({ data: { userId: uid } }),
    onSuccess: (r) => {
      toast.success(`Identidade recalculada (${r.updated})`);
      if (userId) audit.mutate(userId);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const a = audit.data;
  const identityProfile = a?.identity?.profile as
    | {
        patterns?: Array<{
          key: string;
          value: string;
          confidence: number;
          evidence_count: number;
          status: string;
        }>;
        last_refreshed_at?: string;
      }
    | undefined;

  return (
    <div className="mt-6 glass rounded-xl p-5">
      <h3 className="serif text-lg gold-text">Auditoria por usuário (identidade v2.1)</h3>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Input
          placeholder="user_id (uuid)"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="max-w-sm"
        />
        <Button
          onClick={() => userId && audit.mutate(userId)}
          disabled={!userId || audit.isPending}
        >
          Auditar
        </Button>
        <Button
          variant="secondary"
          onClick={() => userId && recalc.mutate(userId)}
          disabled={!userId || recalc.isPending}
        >
          Recalcular identidade
        </Button>
        <Button
          variant="destructive"
          onClick={() => userId && clear.mutate(userId)}
          disabled={!userId || clear.isPending}
        >
          Limpar identidade
        </Button>
      </div>

      {a && (
        <div className="mt-4 grid gap-4 md:grid-cols-2 text-sm">
          <div>
            <div className="text-xs uppercase text-muted-foreground">Perfil</div>
            <div>
              {a.profile?.display_name ?? "—"} · plano {a.profile?.plan ?? "—"}
            </div>
            <div className="text-xs text-muted-foreground">
              chunks: {a.chunkCount} · eventos: {a.events.length} · summaries: {a.summaries.length}{" "}
              · arquivadas: {a.archived.length}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">Estado emocional</div>
            <div>
              {a.state?.primary_emotion ?? "—"}{" "}
              {a.state?.intensity ? `(${Number(a.state.intensity).toFixed(2)})` : ""}
            </div>
            <div className="text-xs text-muted-foreground">{a.state?.context_summary ?? ""}</div>
          </div>

          <div className="md:col-span-2">
            <div className="text-xs uppercase text-muted-foreground">Padrões probabilísticos</div>
            {identityProfile?.patterns?.length ? (
              <ul className="mt-2 space-y-1">
                {identityProfile.patterns.map((p) => (
                  <li key={p.key} className="rounded border border-border/40 p-2">
                    <div>
                      <strong>{p.key}</strong>: {p.value}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      confiança {Math.round(p.confidence * 100)}% · evidências {p.evidence_count} ·{" "}
                      {p.status}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">Sem identidade calculada ainda.</p>
            )}
            {identityProfile?.last_refreshed_at && (
              <div className="text-xs text-muted-foreground mt-1">
                Última atualização:{" "}
                {new Date(identityProfile.last_refreshed_at).toLocaleString("pt-BR")}
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <div className="text-xs uppercase text-muted-foreground">Histórico de identidade</div>
            <ul className="mt-2 space-y-1 text-xs">
              {a.identityHistory.map((h) => (
                <li key={h.id} className="border-b border-border/30 py-1">
                  <strong>{h.key}</strong>: {h.prev_value ?? "—"} → {h.new_value ?? "—"} ·{" "}
                  {Math.round(Number(h.confidence) * 100)}% · {h.status} ·{" "}
                  <span className="text-muted-foreground">
                    {new Date(h.recorded_at).toLocaleString("pt-BR")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
