import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAuditLog } from "@/lib/admin-audit.functions";
import { SectionTitle } from "@/components/admin/SectionTitle";

export const Route = createFileRoute("/admin/audit")({
  component: AuditPage,
});

const ACTION_COLOR: Record<string, string> = {
  role_granted: "text-emerald-300",
  role_revoked: "text-red-300",
  role_disabled: "text-amber-300",
  role_enabled: "text-sky-300",
  role_updated: "text-muted-foreground",
};

function AuditPage() {
  const fn = useServerFn(listAuditLog);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "audit"],
    queryFn: () => fn({ data: { limit: 200 } }),
  });

  return (
    <div>
      <SectionTitle
        eyebrow="auditoria"
        title="Trilha de auditoria"
        description="Cada concessão, revogação e mudança de papel administrativo. Apenas super admins podem ler."
      />

      <div className="glass overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 text-left text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                <th className="px-4 py-3 font-normal">Quando</th>
                <th className="px-4 py-3 font-normal">Ator</th>
                <th className="px-4 py-3 font-normal">Alvo</th>
                <th className="px-4 py-3 font-normal">Ação</th>
                <th className="px-4 py-3 font-normal">Papel anterior</th>
                <th className="px-4 py-3 font-normal">Papel novo</th>
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
                    {r.actor_email ?? <span className="text-muted-foreground italic">sistema</span>}
                  </td>
                  <td className="px-4 py-3">{r.target_email ?? "—"}</td>
                  <td
                    className={`px-4 py-3 uppercase tracking-widest text-[11px] ${ACTION_COLOR[r.action] ?? "text-foreground"}`}
                  >
                    {r.action.replace("role_", "")}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.old_role ?? "—"}</td>
                  <td className="px-4 py-3 text-foreground">{r.new_role ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
