import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getInsights, getUsersList, forceUserReset } from "@/lib/admin.functions";
import { StatCard } from "@/components/admin/StatCard";
import { SectionTitle } from "@/components/admin/SectionTitle";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/recovery")({
  component: RecoveryPage,
});

function RecoveryPage() {
  const insights = useServerFn(getInsights);
  const users = useServerFn(getUsersList);
  const reset = useServerFn(forceUserReset);
  const qc = useQueryClient();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["admin", "insights"],
    queryFn: () => insights({ data: undefined as unknown as never }),
  });
  const { data: list } = useQuery({
    queryKey: ["admin", "recovery-users"],
    queryFn: () => users({ data: { page: 0, pageSize: 50, search: "", plan: null } }),
  });

  const resetMut = useMutation({
    mutationFn: (targetUserId: string) => reset({ data: { targetUserId } }),
    onSuccess: () => {
      toast.success("Thread arquivada — o usuário verá um novo espaço.");
      qc.invalidateQueries({ queryKey: ["admin"] });
      setConfirmId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const recovered = (list?.rows ?? [])
    .filter((u) => u.recoveryAt)
    .sort((a, b) => (b.recoveryAt! > a.recoveryAt! ? 1 : -1));

  return (
    <div>
      <SectionTitle
        eyebrow="ressurgir"
        title="Recuperação de conversas"
        description="Conversas que precisaram ser reescritas — e como ajudamos elas a renascer."
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Últimos 7 dias" value={data?.recovery.last7d ?? 0} tone="warn" />
        <StatCard label="Últimos 30 dias" value={data?.recovery.last30d ?? 0} />
        <StatCard
          label="Sucesso estimado"
          value={`${Math.round((data?.recovery.successRate ?? 1) * 100)}%`}
          estimated
        />
        <StatCard label="Threads ativas" value={list?.total ?? 0} hint="usuários no espaço atual" />
      </div>

      <div className="mt-8 glass rounded-xl">
        <div className="border-b border-border/30 px-6 py-4">
          <h3 className="serif text-xl gold-text">Usuários com recuperação recente</h3>
          <p className="text-xs text-muted-foreground">
            somente sumários — nunca o conteúdo bruto sem necessidade
          </p>
        </div>
        <div className="divide-y divide-border/20">
          {recovered.length === 0 && (
            <p className="px-6 py-10 text-center text-sm italic text-muted-foreground">
              nenhuma recuperação registrada
            </p>
          )}
          {recovered.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
              <div>
                <p className="text-sm">{u.displayName ?? u.alias ?? u.id.slice(0, 8)}</p>
                <p className="text-[11px] text-muted-foreground">
                  {u.email ?? "—"} · {u.plan} · {u.messagesCount} mensagens
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-widest text-[var(--copper)]">
                  recovery
                </p>
                <p className="text-xs text-muted-foreground">{u.recoveryAt}</p>
              </div>
              <button
                onClick={() => setConfirmId(u.id)}
                className="rounded-full border border-destructive/40 px-3 py-1.5 text-[11px] uppercase tracking-widest text-destructive hover:bg-destructive/10"
              >
                forçar novo espaço
              </button>
            </div>
          ))}
        </div>
      </div>

      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="glass max-w-md rounded-xl p-6 text-center">
            <h3 className="serif text-xl gold-text">Confirmar reinício</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Isso arquiva a conversa atual deste usuário. Ele encontrará um espaço novo na próxima
              abertura. Esta ação é registrada.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={() => setConfirmId(null)}
                className="rounded-full border border-border/40 px-4 py-2 text-xs uppercase tracking-widest text-muted-foreground"
              >
                cancelar
              </button>
              <button
                onClick={() => resetMut.mutate(confirmId)}
                disabled={resetMut.isPending}
                className="rounded-full border border-destructive/50 bg-destructive/10 px-4 py-2 text-xs uppercase tracking-widest text-destructive disabled:opacity-50"
              >
                {resetMut.isPending ? "arquivando…" : "confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
