import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listAdminActions } from "@/lib/admin-advanced.functions";
import { SectionTitle } from "@/components/admin/SectionTitle";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/actions")({
  component: ActionsPage,
});

function ActionsPage() {
  const fn = useServerFn(listAdminActions);
  const [page, setPage] = useState(0);
  const [actorEmail, setActorEmail] = useState("");
  const [actionType, setActionType] = useState("");
  const [status, setStatus] = useState<"all" | "success" | "error">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "actions", page, actorEmail, actionType, status],
    queryFn: () =>
      fn({
        data: {
          page,
          pageSize: 25,
          actorEmail: actorEmail || undefined,
          actionType: actionType || undefined,
          status,
        },
      }),
  });

  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 25));

  return (
    <div>
      <SectionTitle
        eyebrow="auditoria"
        title="Ações administrativas"
        description="Log de cada ação realizada por administradores (lock, plano, kill switch, etc.)."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Input
          placeholder="email do admin…"
          value={actorEmail}
          onChange={(e) => {
            setActorEmail(e.target.value);
            setPage(0);
          }}
          className="bg-background/40"
        />
        <Input
          placeholder="tipo de ação (ex: lock_user)"
          value={actionType}
          onChange={(e) => {
            setActionType(e.target.value);
            setPage(0);
          }}
          className="bg-background/40"
        />
        <div className="flex gap-2">
          {(["all", "success", "error"] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatus(s);
                setPage(0);
              }}
              className={`flex-1 rounded-full px-3 py-1.5 text-xs uppercase tracking-widest ${
                status === s
                  ? s === "error"
                    ? "bg-red-500/15 text-red-300 ring-1 ring-red-500/40"
                    : "bg-[var(--gold)]/15 text-[var(--gold)] ring-1 ring-[var(--gold)]/40"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="glass overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 text-left text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                <th className="px-4 py-3 font-normal">Quando</th>
                <th className="px-4 py-3 font-normal">Admin</th>
                <th className="px-4 py-3 font-normal">Ação</th>
                <th className="px-4 py-3 font-normal">Alvo</th>
                <th className="px-4 py-3 font-normal">Status</th>
                <th className="px-4 py-3 font-normal">Payload</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center italic text-muted-foreground">
                    carregando…
                  </td>
                </tr>
              )}
              {!isLoading && data?.rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center italic text-muted-foreground">
                    sem registros
                  </td>
                </tr>
              )}
              {data?.rows.map((r) => (
                <tr key={r.id} className="border-b border-border/20 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-[11px] text-muted-foreground tabular-nums">
                    {new Date(r.occurred_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {r.actor_email ?? (
                      <span className="italic text-muted-foreground">{r.actor_id.slice(0, 8)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[11px] uppercase tracking-widest text-[var(--gold)]/80">
                    {r.action_type}
                  </td>
                  <td className="px-4 py-3 text-[11px] text-muted-foreground">
                    {r.target_type ? `${r.target_type}:${(r.target_id ?? "").slice(0, 8)}` : "—"}
                  </td>
                  <td
                    className={`px-4 py-3 text-[11px] uppercase tracking-widest ${r.status === "error" ? "text-red-300" : "text-emerald-300"}`}
                  >
                    {r.status}
                  </td>
                  <td className="px-4 py-3 max-w-[200px] truncate text-[10px] text-muted-foreground">
                    {r.payload ? JSON.stringify(r.payload) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border/30 px-4 py-3 text-xs text-muted-foreground">
          <span>{total} registros</span>
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
    </div>
  );
}
