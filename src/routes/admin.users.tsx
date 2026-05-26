import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { MoreHorizontal, Plus, LogIn } from "lucide-react";
import { toast } from "sonner";
import { searchUsersAdvanced } from "@/lib/admin-advanced.functions";
import {
  adminCreateUser,
  adminBlockUser,
  adminUnblockUser,
  adminDeleteUser,
  adminTriggerPasswordReset,
  adminImpersonateUser,
} from "@/lib/admin-users.functions";
import { getMyAdminRoles } from "@/lib/admin.functions";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { SectionTitle } from "@/components/admin/SectionTitle";
import { PlanAssignmentFlow } from "@/components/admin/PlanAssignmentFlow";

import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/admin/users")({ component: UsersPage });

const STATUS_FILTERS = ["all", "active", "blocked"] as const;
const PLAN_FILTERS = ["all", "free", "premium", "elite"] as const;

type Row = Awaited<ReturnType<typeof searchUsersAdvanced>>["rows"][number];

function UsersPage() {
  const fn = useServerFn(searchUsersAdvanced);
  const qc = useQueryClient();
  const { user } = useAdminAuth();
  const fetchRoles = useServerFn(getMyAdminRoles);

  // Reuse the cache key populated by AdminShell so this is essentially free.
  const { data: rolesData } = useQuery({
    queryKey: ["admin-roles", user?.id],
    queryFn: () => fetchRoles({ data: undefined }),
    enabled: !!user?.id,
    staleTime: 60_000,
  });
  const isCallerSuper = !!rolesData?.roles?.includes("super_admin");

  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [planFilter, setPlanFilter] = useState<(typeof PLAN_FILTERS)[number]>("all");

  const queryArgs = useMemo(
    () => ({
      page,
      pageSize: 25,
      search,
      plan: planFilter,
      status: statusFilter,
      role: "all" as const,
    }),
    [page, search, planFilter, statusFilter],
  );

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users-ops", queryArgs],
    queryFn: () => fn({ data: queryArgs }),
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 25));

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "users-ops"] });

  const [createOpen, setCreateOpen] = useState(false);

  const [activeUser, setActiveUser] = useState<Row | null>(null);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [impersonateOpen, setImpersonateOpen] = useState(false);

  return (
    <div>
      <SectionTitle
        eyebrow="centro de controle"
        title="Usuários"
        description="Operações essenciais — criar, bloquear, ajustar plano e excluir. Tudo com persistência real."
      />

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <Input
          placeholder="Buscar por nome ou email…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="max-w-sm bg-background/40"
        />
        <FilterGroup
          label="status"
          options={STATUS_FILTERS}
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v);
            setPage(0);
          }}
        />
        <FilterGroup
          label="plano"
          options={PLAN_FILTERS}
          value={planFilter}
          onChange={(v) => {
            setPlanFilter(v);
            setPage(0);
          }}
        />

        <button
          onClick={() => setCreateOpen(true)}
          className="ml-auto inline-flex items-center gap-2 rounded-full bg-[var(--gold)]/15 px-4 py-1.5 text-xs uppercase tracking-widest text-[var(--gold)] ring-1 ring-[var(--gold)]/40 hover:bg-[var(--gold)]/25"
        >
          <Plus className="h-3.5 w-3.5" /> Criar usuário
        </button>
      </div>

      <div className="glass overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 text-left text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                <th className="px-4 py-3 font-normal">Usuário</th>
                <th className="px-4 py-3 font-normal">Plano</th>
                <th className="px-4 py-3 font-normal">Assinatura</th>
                <th className="px-4 py-3 font-normal">Conta</th>
                <th className="px-4 py-3 font-normal text-right">Custo IA / mês</th>
                <th className="px-4 py-3 font-normal">Criado</th>
                <th className="px-4 py-3 font-normal">Último login</th>
                <th className="px-4 py-3 font-normal w-10"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center italic text-muted-foreground">
                    carregando…
                  </td>
                </tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center italic text-muted-foreground">
                    nenhum usuário encontrado
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/20 hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.04] text-[11px] text-muted-foreground">
                        {(r.displayName ?? r.email ?? "?").slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-foreground">{r.displayName ?? r.alias ?? "—"}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {r.email ?? r.id.slice(0, 8)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <PlanBadge plan={r.plan} />
                      <span className="text-[10px] text-muted-foreground">
                        {cycleLabelPt(r.billingCycle)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <SubscriptionStatusBadge status={r.subscriptionStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge blocked={r.blocked} role={r.role} />
                  </td>
                  <td className="px-4 py-3 text-right text-[11px] text-muted-foreground tabular-nums">
                    {fmtUsd(r.estMonthlyCostUsd)}
                  </td>
                  <td className="px-4 py-3 text-[11px] text-muted-foreground">
                    {fmtDate(r.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-[11px] text-muted-foreground">
                    {fmtDate(r.lastSignInAt)}
                  </td>
                  <td className="px-4 py-3">
                    <RowMenu
                      row={r}
                      isCallerSuper={isCallerSuper}
                      onChangePlan={() => {
                        setActiveUser(r);
                        setPlanModalOpen(true);
                      }}
                      onDelete={() => {
                        setActiveUser(r);
                        setDeleteModalOpen(true);
                      }}
                      onImpersonate={() => {
                        setActiveUser(r);
                        setImpersonateOpen(true);
                      }}
                      onAfterAction={invalidate}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

      <CreateUserDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={invalidate}
      />

      <PlanModal
        user={activeUser}
        open={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        onSaved={invalidate}
      />

      <DeleteUserModal
        user={activeUser}
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onDeleted={invalidate}
      />

      <ImpersonateModal
        user={activeUser}
        open={impersonateOpen}
        onClose={() => setImpersonateOpen(false)}
      />
    </div>
  );
}

// ── Filter chips ───────────────────────────────────────────────────────────
function FilterGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-widest ${
              value === o
                ? "bg-[var(--gold)]/15 text-[var(--gold)] ring-1 ring-[var(--gold)]/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {o === "all" ? "todos" : o === "super_admin" ? "super admin" : o}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Row action menu — essential actions ────────────────────────────────────
function RowMenu({
  row,
  isCallerSuper,
  onChangePlan,
  onDelete,
  onImpersonate,
  onAfterAction,
}: {
  row: Row;
  isCallerSuper: boolean;
  onChangePlan: () => void;
  onDelete: () => void;
  onImpersonate: () => void;
  onAfterAction: () => void;
}) {
  const block = useServerFn(adminBlockUser);
  const unblock = useServerFn(adminUnblockUser);
  const sendReset = useServerFn(adminTriggerPasswordReset);

  const run = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
      toast.success(label);
      onAfterAction();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "erro");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full p-1.5 text-muted-foreground hover:bg-white/[0.04] hover:text-foreground">
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onSelect={onChangePlan}>Alterar plano…</DropdownMenuItem>
        {row.blocked ? (
          <DropdownMenuItem
            onSelect={() =>
              run("Usuário desbloqueado", () =>
                unblock({ data: { userId: row.id, reason: "Admin unblock" } }),
              )
            }
          >
            Desbloquear
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onSelect={() =>
              run("Usuário bloqueado", () =>
                block({ data: { userId: row.id, reason: "Admin block" } }),
              )
            }
          >
            Bloquear acesso
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onSelect={() =>
            run("Email de recuperação enviado", () => sendReset({ data: { userId: row.id } }))
          }
        >
          Enviar link de recuperação
        </DropdownMenuItem>
        {isCallerSuper && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={onImpersonate}
              className="text-[var(--gold)] focus:text-[var(--gold)]"
            >
              <LogIn className="mr-2 h-3.5 w-3.5" /> Entrar na conta
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onDelete} className="text-red-300 focus:text-red-300">
          Excluir usuário…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Status badge ────────────────────────────────────────────────────────────
function StatusBadge({ blocked, role }: { blocked: boolean; role: "user" | "super_admin" }) {
  return (
    <div className="flex flex-wrap gap-1">
      {blocked ? <Badge tone="danger">Blocked</Badge> : <Badge tone="ok">Active</Badge>}
      {role === "super_admin" && <Badge tone="info">Super admin</Badge>}
    </div>
  );
}

function Badge({ tone, children }: { tone: "ok" | "danger" | "info"; children: React.ReactNode }) {
  const map = {
    ok: "text-emerald-300 border-emerald-500/30 bg-emerald-500/5",
    danger: "text-red-300 border-red-500/30 bg-red-500/5",
    info: "text-sky-300 border-sky-500/30 bg-sky-500/5",
  } as const;
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${map[tone]}`}
    >
      {children}
    </span>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const map: Record<string, string> = {
    free: "text-muted-foreground border-border/40",
    premium: "text-[var(--amber-soft)] border-[var(--copper)]/40",
    elite: "text-[var(--gold)] border-[var(--gold)]/50 bg-[var(--gold)]/5",
  };
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${map[plan] ?? map.free}`}
    >
      {plan}
    </span>
  );
}

function SubscriptionStatusBadge({ status }: { status: string | null | undefined }) {
  if (!status)
    return <span className="text-[11px] italic text-muted-foreground">sem assinatura</span>;
  const map: Record<string, { tone: "ok" | "warn" | "danger" | "muted"; label: string }> = {
    active: { tone: "ok", label: "Ativa" },
    authorized: { tone: "ok", label: "Ativa" },
    trialing: { tone: "ok", label: "Trial" },
    grace: { tone: "warn", label: "Em graça" },
    past_due: { tone: "warn", label: "Atrasada" },
    failed: { tone: "danger", label: "Falhou" },
    canceled: { tone: "muted", label: "Cancelada" },
    cancelled: { tone: "muted", label: "Cancelada" },
    revoked: { tone: "muted", label: "Revogada" },
    expired: { tone: "muted", label: "Expirada" },
  };
  const e = map[status] ?? { tone: "muted" as const, label: status };
  const tones = {
    ok: "text-emerald-300 border-emerald-500/30 bg-emerald-500/5",
    warn: "text-amber-300   border-amber-500/30   bg-amber-500/5",
    danger: "text-red-300     border-red-500/30     bg-red-500/5",
    muted: "text-muted-foreground border-border/40",
  };
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${tones[e.tone]}`}
    >
      {e.label}
    </span>
  );
}

function cycleLabelPt(c: string | null | undefined): string {
  if (!c) return "—";
  return (
    {
      monthly: "Mensal",
      quarterly: "Trimestral",
      semiannual: "Semestral",
      annual: "Anual",
      lifetime: "Vitalício",
      trial: "Trial",
    }[c] ?? c
  );
}

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

function fmtUsd(n: number) {
  if (!n) return "—";
  return `US$ ${n.toFixed(2)}`;
}

// ── Create user modal ───────────────────────────────────────────────────────
function CreateUserDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const create = useServerFn(adminCreateUser);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");

  const mutation = useMutation({
    mutationFn: () => create({ data: { email, displayName, reason: "admin create from panel" } }),
    onSuccess: (res) => {
      if (res.inviteSent) {
        toast.success(`Convite enviado para ${res.email}`);
      } else {
        toast.warning(
          `Usuário criado, mas o convite falhou: ${res.inviteError ?? "erro desconhecido"}`,
        );
      }
      onCreated();
      onClose();
      setEmail("");
      setDisplayName("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "erro"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass border-border/40 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="serif text-lg">Criar usuário</DialogTitle>
          <DialogDescription>
            Email auto-confirmado · convite de senha enviado por email · começa como Free.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Nome completo">
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Maria Silva"
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="maria@exemplo.com"
            />
          </Field>
          <p className="rounded-md border border-border/30 bg-white/[0.02] px-3 py-2 text-[11px] text-muted-foreground">
            O usuário receberá um email para definir a própria senha. Para atribuir Premium ou
            Elite, use <span className="text-foreground">Alterar plano</span> no menu de ações
            depois.
          </p>
        </div>
        <DialogFooter>
          <button
            onClick={onClose}
            className="rounded-full px-4 py-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            cancelar
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !email || !displayName}
            className="rounded-full bg-[var(--gold)]/15 px-4 py-2 text-xs uppercase tracking-widest text-[var(--gold)] ring-1 ring-[var(--gold)]/40 hover:bg-[var(--gold)]/25 disabled:opacity-50"
          >
            {mutation.isPending ? "criando…" : "criar"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Plan change modal ───────────────────────────────────────────────────────
// ── Plan change modal — clean 3-step flow (product → cycle → apply) ────────
function PlanModal({
  user,
  open,
  onClose,
  onSaved,
}: {
  user: Row | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  if (!user) return null;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass border-border/40 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="serif text-lg">Gerenciar assinatura</DialogTitle>
          <DialogDescription>
            Upgrade, downgrade, mudança de ciclo ou retorno ao Free — tudo em um único fluxo.
          </DialogDescription>
        </DialogHeader>
        <PlanAssignmentFlow
          userId={user.id}
          userLabel={user.displayName ?? user.email ?? user.id.slice(0, 8)}
          currentTier={user.plan}
          currentCycle={user.billingCycle}
          onApplied={onSaved}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}

// ── Delete modal — single hard-delete with confirm ─────────────────────────
function DeleteUserModal({
  user,
  open,
  onClose,
  onDeleted,
}: {
  user: Row | null;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const hard = useServerFn(adminDeleteUser);
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");

  const reset = () => {
    setReason("");
    setConfirm("");
    setConfirmEmail("");
  };

  const mutation = useMutation({
    mutationFn: () =>
      hard({ data: { userId: user!.id, confirmEmail, reason: reason || "admin delete" } }),
    onSuccess: () => {
      toast.success("Usuário removido");
      onDeleted();
      reset();
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "erro"),
  });

  if (!user) return null;
  const enabled =
    confirm === "DELETE" && confirmEmail.toLowerCase() === (user.email ?? "").toLowerCase();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && (reset(), onClose())}>
      <DialogContent className="glass border-red-500/30 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="serif text-lg text-red-300">Excluir usuário</DialogTitle>
          <DialogDescription>{user.displayName ?? user.email}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Remove a conta de autenticação, perfil, mensagens, memórias, pagamentos e todos os dados
            pessoais. Irreversível.
          </p>
          <Field label="Motivo (audit)">
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="auditoria interna"
            />
          </Field>
          <Field label={`Confirmar email (${user.email})`}>
            <Input
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder={user.email ?? ""}
            />
          </Field>
          <Field label='Digite "DELETE" para confirmar'>
            <Input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="DELETE"
            />
          </Field>
        </div>
        <DialogFooter>
          <button
            onClick={() => {
              reset();
              onClose();
            }}
            className="rounded-full px-4 py-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            cancelar
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !enabled}
            className="rounded-full bg-red-500/15 px-4 py-2 text-xs uppercase tracking-widest text-red-300 ring-1 ring-red-500/40 hover:bg-red-500/25 disabled:opacity-30"
          >
            {mutation.isPending ? "removendo…" : "excluir permanentemente"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Tiny helpers ───────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function chip(active: boolean) {
  return `rounded-full px-3 py-1 text-[11px] uppercase tracking-widest transition ${
    active
      ? "bg-[var(--gold)]/15 text-[var(--gold)] ring-1 ring-[var(--gold)]/40"
      : "bg-white/[0.03] text-muted-foreground hover:text-foreground"
  }`;
}

// ── Impersonation modal — super_admin only ────────────────────────────────
// Asks for the caller's master password, generates a one-time magic link
// for the target customer, and opens it in a new tab. The user's password
// is never read or modified, and the admin's session is preserved (the
// admin client uses an isolated localStorage key from the customer app).
function ImpersonateModal({
  user,
  open,
  onClose,
}: {
  user: Row | null;
  open: boolean;
  onClose: () => void;
}) {
  const impersonate = useServerFn(adminImpersonateUser);
  const [password, setPassword] = useState("");

  const mutation = useMutation({
    mutationFn: () => impersonate({ data: { userId: user!.id, masterPassword: password } }),
    onSuccess: (res) => {
      if (!res.actionLink) {
        toast.error("Link não gerado");
        return;
      }
      window.open(res.actionLink, "_blank", "noopener,noreferrer");
      toast.success(`Abrindo conta de ${res.email} em nova aba`);
      setPassword("");
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "erro"),
  });

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && (setPassword(""), onClose())}>
      <DialogContent className="glass border-[var(--gold)]/40 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="serif text-lg">Entrar na conta</DialogTitle>
          <DialogDescription>
            Acesso temporário à conta de{" "}
            <span className="text-foreground">{user.displayName ?? user.email}</span>. Será aberto
            em uma nova aba sem afetar sua sessão de administrador.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <p className="rounded-md border border-[var(--gold)]/30 bg-[var(--gold)]/5 px-3 py-2 text-[11px] text-muted-foreground">
            Esta ação é registrada na auditoria. A senha do usuário nunca é exposta nem modificada.
          </p>
          <Field label="Sua senha mestra (super admin)">
            <Input
              type="password"
              value={password}
              autoFocus
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && password) mutation.mutate();
              }}
              placeholder="••••••••"
            />
          </Field>
        </div>
        <DialogFooter>
          <button
            onClick={() => {
              setPassword("");
              onClose();
            }}
            className="rounded-full px-4 py-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            cancelar
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !password}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--gold)]/15 px-4 py-2 text-xs uppercase tracking-widest text-[var(--gold)] ring-1 ring-[var(--gold)]/40 hover:bg-[var(--gold)]/25 disabled:opacity-40"
          >
            <LogIn className="h-3.5 w-3.5" />
            {mutation.isPending ? "verificando…" : "entrar"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
