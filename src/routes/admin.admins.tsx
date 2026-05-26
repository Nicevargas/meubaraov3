import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  listAdminAccounts,
  createAdminAccount,
  setAdminDisabled,
  changeAdminRole,
} from "@/lib/admin-management.functions";
import { SectionTitle } from "@/components/admin/SectionTitle";
import { AdminRoleBadge } from "@/components/admin/AdminRoleBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Input } from "@/components/ui/input";
import { Plus, Copy, ShieldOff, ShieldCheck, ArrowUp, ArrowDown } from "lucide-react";

export const Route = createFileRoute("/admin/admins")({
  component: AdminsPage,
});

const ASSIGNABLE = [
  "super_admin",
  "admin",
  "moderator",
  "support",
  "finance",
  "analytics",
] as const;

type PendingAction =
  | { kind: "promote_super"; targetUserId: string; email: string | null }
  | { kind: "demote_super"; targetUserId: string; email: string | null }
  | { kind: "disable"; targetUserId: string; email: string | null }
  | { kind: "enable"; targetUserId: string; email: string | null };

function AdminsPage() {
  const qc = useQueryClient();
  const fnList = useServerFn(listAdminAccounts);
  const fnCreate = useServerFn(createAdminAccount);
  const fnToggle = useServerFn(setAdminDisabled);
  const fnRole = useServerFn(changeAdminRole);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "admins"],
    queryFn: () => fnList({ data: undefined as unknown as never }),
  });

  const [showCreate, setShowCreate] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<(typeof ASSIGNABLE)[number]>("admin");
  const [createdInvite, setCreatedInvite] = useState<{
    email: string;
    ok: boolean;
    error: string | null;
  } | null>(null);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: () => fnCreate({ data: { email, displayName, role } }),
    onSuccess: (res) => {
      setCreatedInvite({ email: res.email, ok: res.inviteSent, error: res.inviteError ?? null });
      setEmail("");
      setDisplayName("");
      setRole("admin");
      setShowCreate(false);
      qc.invalidateQueries({ queryKey: ["admin", "admins"] });
    },
    onError: (e: Error) => setCreateErr(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: (vars: { targetUserId: string; disabled: boolean }) => fnToggle({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "admins"] }),
    onError: (e: Error) => setActionErr(e.message),
  });

  const roleMut = useMutation({
    mutationFn: (vars: {
      targetUserId: string;
      addRole?: (typeof ASSIGNABLE)[number];
      removeRole?: (typeof ASSIGNABLE)[number];
    }) => fnRole({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "admins"] }),
    onError: (e: Error) => setActionErr(e.message),
  });

  function runPending() {
    if (!pending) return;
    setActionErr(null);
    if (pending.kind === "promote_super")
      roleMut.mutate({ targetUserId: pending.targetUserId, addRole: "super_admin" });
    else if (pending.kind === "demote_super")
      roleMut.mutate({ targetUserId: pending.targetUserId, removeRole: "super_admin" });
    else if (pending.kind === "disable")
      toggleMut.mutate({ targetUserId: pending.targetUserId, disabled: true });
    else if (pending.kind === "enable")
      toggleMut.mutate({ targetUserId: pending.targetUserId, disabled: false });
    setPending(null);
  }

  return (
    <div>
      <SectionTitle
        eyebrow="gestão de admins"
        title="Administradores"
        description="Quem opera o backoffice. Acessível apenas para super admins."
        action={
          <button
            onClick={() => {
              setShowCreate((s) => !s);
              setCreateErr(null);
            }}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-[var(--gold)] hover:bg-[var(--gold)]/20"
          >
            <Plus className="h-3.5 w-3.5" />
            novo admin
          </button>
        }
      />

      {showCreate && (
        <div className="glass mb-6 rounded-xl p-6">
          <h3 className="serif text-lg">Convidar administrador</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Uma senha temporária será gerada. O admin será obrigado a trocá-la no primeiro acesso.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <Input
              placeholder="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              placeholder="nome"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as (typeof ASSIGNABLE)[number])}
              className="rounded-md border border-border/40 bg-background/40 px-3 text-sm"
            >
              {ASSIGNABLE.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          {createErr && <p className="mt-3 text-sm text-red-400 italic">{createErr}</p>}
          <div className="mt-4 flex gap-2">
            <button
              disabled={createMut.isPending || !email || !displayName}
              onClick={() => createMut.mutate()}
              className="rounded-full bg-[var(--gold)]/15 px-4 py-2 text-xs uppercase tracking-[0.2em] text-[var(--gold)] disabled:opacity-50"
            >
              {createMut.isPending ? "criando…" : "criar admin"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em] text-muted-foreground"
            >
              cancelar
            </button>
          </div>
        </div>
      )}

      {createdInvite && (
        <div
          className={`mb-6 rounded-xl border p-5 ${createdInvite.ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/40 bg-red-500/5"}`}
        >
          <p
            className={`text-[10px] uppercase tracking-[0.3em] ${createdInvite.ok ? "text-emerald-300" : "text-red-300"}`}
          >
            {createdInvite.ok ? "convite enviado" : "convite falhou"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {createdInvite.ok ? (
              <>
                Enviamos um link de definição de senha para{" "}
                <span className="text-foreground">{createdInvite.email}</span>. O admin definirá a
                própria senha.
              </>
            ) : (
              <>
                Não foi possível enviar para{" "}
                <span className="text-foreground">{createdInvite.email}</span>:{" "}
                <span className="text-red-300">{createdInvite.error}</span>. Use “reenviar convite”
                na lista abaixo.
              </>
            )}
          </p>
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => setCreatedInvite(null)}
              className="rounded px-3 py-2 text-xs text-muted-foreground"
            >
              fechar
            </button>
          </div>
        </div>
      )}

      <div className="glass overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 text-left text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                <th className="px-4 py-3 font-normal">Admin</th>
                <th className="px-4 py-3 font-normal">Funções</th>
                <th className="px-4 py-3 font-normal">Último acesso</th>
                <th className="px-4 py-3 font-normal">Status</th>
                <th className="px-4 py-3 font-normal text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground italic">
                    carregando…
                  </td>
                </tr>
              )}
              {data?.accounts.map((a) => {
                const isSuper = a.roles.some((r) => r.role === "super_admin" && !r.disabled);
                const allDisabled = a.roles.every((r) => r.disabled);
                const mustChange = a.roles.some((r) => r.mustChangePassword);
                return (
                  <tr key={a.userId} className="border-b border-border/20 hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <p className="text-foreground">{a.displayName ?? "—"}</p>
                      <p className="text-[11px] text-muted-foreground">{a.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {a.roles.map((r) => (
                          <AdminRoleBadge
                            key={r.role}
                            role={r.role}
                            className={r.disabled ? "opacity-40 line-through" : ""}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {a.lastSignInAt ? new Date(a.lastSignInAt).toLocaleString() : "nunca"}
                    </td>
                    <td className="px-4 py-3">
                      {allDisabled ? (
                        <span className="text-[11px] uppercase tracking-widest text-red-400">
                          desativado
                        </span>
                      ) : mustChange ? (
                        <span className="text-[11px] uppercase tracking-widest text-amber-300">
                          trocar senha
                        </span>
                      ) : (
                        <span className="text-[11px] uppercase tracking-widest text-emerald-300">
                          ativo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {!isSuper && (
                          <button
                            title="Promover a super_admin"
                            onClick={() =>
                              setPending({
                                kind: "promote_super",
                                targetUserId: a.userId,
                                email: a.email,
                              })
                            }
                            className="rounded p-1.5 text-muted-foreground hover:text-[var(--gold)] hover:bg-white/5"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {isSuper && (
                          <button
                            title="Remover super_admin"
                            onClick={() =>
                              setPending({
                                kind: "demote_super",
                                targetUserId: a.userId,
                                email: a.email,
                              })
                            }
                            className="rounded p-1.5 text-muted-foreground hover:text-amber-300 hover:bg-white/5"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {allDisabled ? (
                          <button
                            title="Reativar"
                            onClick={() =>
                              setPending({ kind: "enable", targetUserId: a.userId, email: a.email })
                            }
                            className="rounded p-1.5 text-emerald-300 hover:bg-white/5"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            title="Desativar"
                            onClick={() =>
                              setPending({
                                kind: "disable",
                                targetUserId: a.userId,
                                email: a.email,
                              })
                            }
                            className="rounded p-1.5 text-muted-foreground hover:text-red-400 hover:bg-white/5"
                          >
                            <ShieldOff className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!isLoading && data?.accounts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground italic">
                    nenhum admin cadastrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {actionErr && (
        <div className="mt-4 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {actionErr}
        </div>
      )}

      <ConfirmDialog
        open={!!pending}
        title={
          pending?.kind === "promote_super"
            ? "Conceder privilégios administrativos?"
            : pending?.kind === "demote_super"
              ? "Remover privilégios de super admin?"
              : pending?.kind === "disable"
                ? "Desativar conta administrativa?"
                : "Reativar conta administrativa?"
        }
        description={
          pending?.kind === "promote_super"
            ? `Você está prestes a promover ${pending.email ?? "este usuário"} a SUPER ADMIN. Esta função tem acesso irrestrito ao backoffice. Tem certeza?`
            : pending?.kind === "demote_super"
              ? `Você está prestes a remover o papel SUPER ADMIN de ${pending?.email ?? "este usuário"}. O último super admin ativo não pode ser removido.`
              : pending?.kind === "disable"
                ? `Você está prestes a desativar o acesso de ${pending?.email ?? "este usuário"} ao backoffice.`
                : `Reativar o acesso administrativo de ${pending?.email ?? "este usuário"}?`
        }
        confirmLabel={
          pending?.kind === "promote_super"
            ? "promover"
            : pending?.kind === "demote_super"
              ? "remover"
              : pending?.kind === "disable"
                ? "desativar"
                : "reativar"
        }
        destructive={pending?.kind === "demote_super" || pending?.kind === "disable"}
        onConfirm={runPending}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
