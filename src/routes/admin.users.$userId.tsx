import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ShieldAlert, Pin, PinOff, Trash2 } from "lucide-react";
import {
  getUserDetailForAdmin,
  adminUpdateProfile,
  adminDeleteUser,
  adminSuspendUser,
  adminReactivateUser,
  adminVerifyEmail,
  adminTriggerPasswordReset,
  adminForcePasswordReset,
  adminExtendSubscription,
  adminAddNote,
  adminDeleteNote,
  adminToggleNotePin,
  adminChangeRole,
} from "@/lib/admin-users.functions";
import { SectionTitle } from "@/components/admin/SectionTitle";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { PlanAssignmentFlow } from "@/components/admin/PlanAssignmentFlow";

export const Route = createFileRoute("/admin/users/$userId")({
  component: UserDetailPage,
});

type Tab = "overview" | "billing" | "usage" | "roles" | "notes" | "audit" | "risk" | "debug";
type UserDetailData = Awaited<ReturnType<typeof getUserDetailForAdmin>>;

function UserDetailPage() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const { user: me } = useAdminAuth();
  const qc = useQueryClient();
  const fetchDetail = useServerFn(getUserDetailForAdmin);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "user-detail", userId],
    queryFn: () => fetchDetail({ data: { userId } }),
  });

  const [tab, setTab] = useState<Tab>("overview");
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "user-detail", userId] });

  if (isLoading) return <p className="italic text-muted-foreground">carregando…</p>;
  if (error || !data)
    return <p className="text-red-300">{error instanceof Error ? error.message : "erro"}</p>;

  const isSuperTarget = data.roles.some((r) => r.role === "super_admin");
  const isSelf = me?.id === userId;

  return (
    <div className="space-y-6">
      <Link
        to="/admin/users"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> voltar
      </Link>

      <SectionTitle
        eyebrow={data.profile.email ?? userId.slice(0, 8)}
        title={data.profile.display_name ?? data.profile.alias ?? "Usuário"}
        description={`Criado em ${new Date(data.profile.created_at).toLocaleString()} · Plano ${data.profile.plan}`}
      />

      {isSuperTarget && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/5 px-4 py-3 text-sm text-red-300">
          <ShieldAlert className="h-4 w-4" /> Esta conta é super_admin. Use a página de
          Administradores para gerenciá-la.
        </div>
      )}

      <nav className="flex flex-wrap gap-1 border-b border-border/30 text-xs uppercase tracking-widest">
        {(
          [
            "overview",
            "billing",
            "usage",
            "roles",
            "notes",
            "audit",
            "risk",
            ...(data.entitlementDebug ? ["debug" as const] : []),
          ] as Tab[]
        ).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 ${tab === t ? "border-b-2 border-[var(--gold)] text-[var(--gold)]" : "text-muted-foreground hover:text-foreground"}`}
          >
            {tabLabel(t)}
          </button>
        ))}
      </nav>

      {tab === "overview" && (
        <OverviewTab
          data={data}
          userId={userId}
          disabled={isSuperTarget || isSelf}
          onChange={invalidate}
        />
      )}
      {tab === "billing" && (
        <BillingTab data={data} userId={userId} disabled={isSuperTarget} onChange={invalidate} />
      )}
      {tab === "usage" && <UsageTab data={data} />}
      {tab === "roles" && (
        <RolesTab
          data={data}
          userId={userId}
          disabled={isSuperTarget || isSelf}
          onChange={invalidate}
        />
      )}
      {tab === "notes" && <NotesTab data={data} userId={userId} onChange={invalidate} />}
      {tab === "audit" && <AuditTab data={data} />}
      {tab === "risk" && <RiskTab data={data} />}
      {tab === "debug" && <DebugTab data={data} />}
    </div>
  );
}

function tabLabel(t: Tab) {
  return {
    overview: "Visão geral",
    billing: "Plano & cobrança",
    usage: "Uso & custo",
    roles: "Papéis",
    notes: "Notas",
    audit: "Auditoria",
    risk: "Risco",
    debug: "Debug",
  }[t];
}

// ── Overview ──────────────────────────────────────────────────────
function OverviewTab({
  data,
  userId,
  disabled,
  onChange,
}: {
  data: UserDetailData;
  userId: string;
  disabled: boolean;
  onChange: () => void;
}) {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(data.profile.display_name ?? "");
  const [alias, setAlias] = useState(data.profile.alias ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState("");
  const [deleteReason, setDeleteReason] = useState("");

  const update = useMutation({
    mutationFn: useServerFn(adminUpdateProfile),
    onSuccess: () => {
      toast.success("perfil atualizado");
      onChange();
    },
  });
  const suspend = useMutation({
    mutationFn: useServerFn(adminSuspendUser),
    onSuccess: () => {
      toast.success("usuário suspenso");
      onChange();
    },
  });
  const reactivate = useMutation({
    mutationFn: useServerFn(adminReactivateUser),
    onSuccess: () => {
      toast.success("reativado");
      onChange();
    },
  });
  const verify = useMutation({
    mutationFn: useServerFn(adminVerifyEmail),
    onSuccess: () => {
      toast.success("email verificado");
      onChange();
    },
  });
  const triggerReset = useMutation({
    mutationFn: useServerFn(adminTriggerPasswordReset),
    onSuccess: () => toast.success("email de reset enviado"),
  });
  const forceReset = useMutation({
    mutationFn: useServerFn(adminForcePasswordReset),
    onSuccess: () => {
      toast.success("reset forçado no próximo login");
      onChange();
    },
  });
  const del = useMutation({
    mutationFn: useServerFn(adminDeleteUser),
    onSuccess: () => {
      toast.success("usuário deletado");
      navigate({ to: "/admin/users" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "erro"),
  });

  const isSuspended = !!data.profile.blocked;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="glass space-y-3 rounded-xl p-5 lg:col-span-2">
        <h3 className="text-sm uppercase tracking-widest text-muted-foreground">Conta</h3>
        <Field label="Email">
          {data.profile.email ?? "—"}{" "}
          {data.profile.emailConfirmed && (
            <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">
              verificado
            </span>
          )}
        </Field>
        <Field label="ID">{userId}</Field>
        <Field label="Criado em">{new Date(data.profile.created_at).toLocaleString()}</Field>
        <Field label="Último login">
          {data.profile.lastSignInAt ? new Date(data.profile.lastSignInAt).toLocaleString() : "—"}
        </Field>
        <Field label="Última atividade">
          {data.profile.last_activity_at
            ? new Date(data.profile.last_activity_at).toLocaleString()
            : "—"}
        </Field>
        <Field label="Status">
          {isSuspended ? (
            <span className="text-red-300">Bloqueado — {data.profile.blockReason ?? "—"}</span>
          ) : (
            <span className="text-emerald-300">Ativo</span>
          )}
        </Field>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs">
            <span className="mb-1 block uppercase tracking-widest text-muted-foreground">
              Display name
            </span>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={disabled}
            />
          </label>
          <label className="text-xs">
            <span className="mb-1 block uppercase tracking-widest text-muted-foreground">
              Alias
            </span>
            <Input value={alias} onChange={(e) => setAlias(e.target.value)} disabled={disabled} />
          </label>
        </div>
        <button
          disabled={disabled || update.isPending}
          onClick={() => update.mutate({ data: { userId, displayName, alias: alias || null } })}
          className="mt-2 rounded-full bg-[var(--gold)]/15 px-4 py-2 text-xs uppercase tracking-widest text-[var(--gold)] hover:bg-[var(--gold)]/25 disabled:opacity-40"
        >
          salvar perfil
        </button>
      </div>

      <div className="glass space-y-2 rounded-xl p-5">
        <h3 className="text-sm uppercase tracking-widest text-muted-foreground">Ações</h3>
        <ActionBtn
          label={isSuspended ? "Reativar" : "Suspender"}
          disabled={disabled}
          variant={isSuspended ? "primary" : "danger"}
          onClick={() => {
            const reason = window.prompt(`Motivo:`);
            if (!reason || reason.length < 2) return;
            if (isSuspended) reactivate.mutate({ data: { userId, reason } });
            else {
              const dur = window.prompt("Duração em minutos (vazio = revisão manual):");
              suspend.mutate({
                data: { userId, reason, durationMinutes: dur ? Number(dur) : null },
              });
            }
          }}
        />
        <ActionBtn
          label="Verificar email manualmente"
          disabled={disabled || data.profile.emailConfirmed}
          onClick={() => verify.mutate({ data: { userId } })}
        />
        <ActionBtn
          label="Enviar email de reset"
          disabled={disabled}
          onClick={() => triggerReset.mutate({ data: { userId } })}
        />
        <ActionBtn
          label="Forçar troca de senha (admin)"
          disabled={disabled}
          onClick={() => forceReset.mutate({ data: { userId } })}
        />
        <ActionBtn
          label="Deletar usuário"
          disabled={disabled}
          variant="danger"
          onClick={() => setConfirmDelete(true)}
        />
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Deletar usuário definitivamente"
        description={`Digite o email "${data.profile.email}" e o motivo para confirmar. Esta ação é irreversível.`}
        destructive
        confirmLabel={del.isPending ? "deletando…" : "DELETAR"}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (!deleteEmail || !deleteReason) return toast.error("preencha email + motivo");
          del.mutate({ data: { userId, confirmEmail: deleteEmail, reason: deleteReason } });
        }}
      />
      {confirmDelete && (
        <div className="fixed inset-x-0 bottom-24 z-[60] mx-auto max-w-md space-y-2 rounded-xl bg-background/95 p-4 shadow-2xl">
          <Input
            placeholder={`digite ${data.profile.email}`}
            value={deleteEmail}
            onChange={(e) => setDeleteEmail(e.target.value)}
          />
          <Input
            placeholder="motivo"
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}

// ── Billing ──────────────────────────────────────────────────────
function BillingTab({
  data,
  userId,
  disabled,
  onChange,
}: {
  data: UserDetailData;
  userId: string;
  disabled: boolean;
  onChange: () => void;
}) {
  const [days, setDays] = useState("30");
  const extend = useMutation({
    mutationFn: useServerFn(adminExtendSubscription),
    onSuccess: () => {
      toast.success("assinatura estendida");
      onChange();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "erro"),
  });

  const sub = data.subscription;
  const currentTier: string = data.profile.plan ?? "free";
  const currentCycle: string | null = sub?.billing_cycle ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Current subscription snapshot */}
      <div className="glass space-y-4 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm uppercase tracking-widest text-muted-foreground">
            Assinatura atual
          </h3>
          <SubscriptionStatusPill status={sub?.status} />
        </div>

        <div className="rounded-xl border border-[var(--gold)]/30 bg-[var(--gold)]/5 px-4 py-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Tier · Ciclo
          </p>
          <p className="serif mt-1 text-2xl">
            <span className="capitalize">{currentTier}</span>
            <span className="text-muted-foreground">
              {" "}
              · {currentCycle ? cycleLabel(currentCycle) : "—"}
            </span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <Mini
            label="Período até"
            value={
              sub?.current_period_end
                ? new Date(sub.current_period_end).toLocaleDateString("pt-BR")
                : "—"
            }
          />
          <Mini
            label="Próximo pagto"
            value={
              sub?.next_payment_date
                ? new Date(sub.next_payment_date).toLocaleDateString("pt-BR")
                : "—"
            }
          />
          <Mini label="Provedor" value={sub?.provider ?? "—"} />
          <Mini
            label="Cancelado em"
            value={sub?.canceled_at ? new Date(sub.canceled_at).toLocaleDateString("pt-BR") : "—"}
          />
        </div>

        <div className="space-y-2 border-t border-border/30 pt-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Estender período
          </p>
          <div className="flex items-center gap-2">
            <input
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="w-20 rounded bg-white/5 px-2 py-1.5 text-xs"
              placeholder="dias"
            />
            <button
              disabled={disabled || !sub}
              onClick={() => {
                const r = window.prompt("Motivo da extensão:");
                if (!r || r.length < 2) return;
                extend.mutate({ data: { userId, days: Number(days), reason: r } });
              }}
              className="rounded-full bg-white/5 px-3 py-1.5 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              estender {days} dias
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Para cancelar/reativar no provedor, use o painel do Mercado Pago.
          </p>
        </div>
      </div>

      {/* Inline assignment flow */}
      <div className="glass space-y-3 rounded-xl p-5">
        <h3 className="text-sm uppercase tracking-widest text-muted-foreground">
          Gerenciar assinatura
        </h3>
        <p className="text-[11px] text-muted-foreground">
          Upgrade, downgrade, mudar ciclo ou voltar para Free — tudo aqui.
        </p>
        <div className="pt-2">
          <PlanAssignmentFlow
            userId={userId}
            userLabel={data.profile.display_name ?? data.profile.email ?? userId.slice(0, 8)}
            currentTier={currentTier}
            currentCycle={currentCycle}
            disabled={disabled}
            onApplied={onChange}
          />
        </div>
      </div>

      <div className="glass rounded-xl p-5 lg:col-span-2">
        <h3 className="text-sm uppercase tracking-widest text-muted-foreground">
          Histórico de pagamentos (20 últimos)
        </h3>
        <table className="mt-3 w-full text-xs">
          <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="py-2 text-left">Data</th>
              <th className="text-left">Status</th>
              <th className="text-left">Método</th>
              <th className="text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {data.payments.map((p) => (
              <tr key={p.id} className="border-t border-border/20">
                <td className="py-2">{new Date(p.created_at).toLocaleString()}</td>
                <td>{p.status}</td>
                <td>{p.payment_method}</td>
                <td className="text-right">
                  {p.currency} {Number(p.amount).toFixed(2)}
                </td>
              </tr>
            ))}
            {data.payments.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center italic text-muted-foreground">
                  sem pagamentos
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="glass rounded-xl p-5 lg:col-span-2">
        <h3 className="text-sm uppercase tracking-widest text-muted-foreground">
          Histórico de assinaturas
        </h3>
        <table className="mt-3 w-full text-xs">
          <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="py-2 text-left">Data</th>
              <th className="text-left">Produto</th>
              <th className="text-left">Ciclo</th>
              <th className="text-left">Status</th>
              <th className="text-left">Período</th>
            </tr>
          </thead>
          <tbody>
            {(data.subscriptionHistory ?? []).map((a) => (
              <tr key={a.id} className="border-t border-border/20">
                <td className="py-2">{new Date(a.created_at).toLocaleString()}</td>
                <td>
                  {a.product_name ?? a.product_slug ?? "—"}
                  {a.tier ? ` · ${a.tier}` : ""}
                </td>
                <td>{cycleLabel(a.billing_cycle)}</td>
                <td>{a.status}</td>
                <td>
                  {a.current_period_end ? new Date(a.current_period_end).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
            {(data.subscriptionHistory ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center italic text-muted-foreground">
                  sem assinaturas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border/30 bg-black/20 px-3 py-2">
      <p className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-foreground">{value}</p>
    </div>
  );
}

function SubscriptionStatusPill({ status }: { status: string | null | undefined }) {
  if (!status)
    return (
      <span className="rounded-full border border-border/40 px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
        sem assinatura
      </span>
    );
  const map: Record<string, { tone: string; label: string }> = {
    active: { tone: "text-emerald-300 border-emerald-500/30 bg-emerald-500/5", label: "Ativa" },
    authorized: { tone: "text-emerald-300 border-emerald-500/30 bg-emerald-500/5", label: "Ativa" },
    trialing: { tone: "text-emerald-300 border-emerald-500/30 bg-emerald-500/5", label: "Trial" },
    grace: { tone: "text-amber-300 border-amber-500/30 bg-amber-500/5", label: "Em graça" },
    past_due: { tone: "text-amber-300 border-amber-500/30 bg-amber-500/5", label: "Atrasada" },
    failed: { tone: "text-red-300 border-red-500/30 bg-red-500/5", label: "Falhou" },
    canceled: { tone: "text-muted-foreground border-border/40", label: "Cancelada" },
    cancelled: { tone: "text-muted-foreground border-border/40", label: "Cancelada" },
    revoked: { tone: "text-muted-foreground border-border/40", label: "Revogada" },
    expired: { tone: "text-muted-foreground border-border/40", label: "Expirada" },
  };
  const e = map[status] ?? { tone: "text-muted-foreground border-border/40", label: status };
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${e.tone}`}
    >
      {e.label}
    </span>
  );
}

function cycleLabel(c: string | null | undefined): string {
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

// ── Usage ──────────────────────────────────────────────────────
function UsageTab({ data }: { data: UserDetailData }) {
  const t = data.usage.totals;
  return (
    <div className="grid gap-4 lg:grid-cols-4">
      <Stat label="Mensagens (30d)" value={t.messages.toLocaleString()} />
      <Stat label="Tokens entrada" value={t.inputTokens.toLocaleString()} />
      <Stat label="Tokens saída" value={t.outputTokens.toLocaleString()} />
      <Stat label="Custo estimado (USD)" value={`$${t.cost.toFixed(4)}`} />
      <Stat label="Mensagens (lifetime)" value={data.usage.messagesAllTime.toLocaleString()} />

      <div className="glass rounded-xl p-5 lg:col-span-4">
        <h3 className="text-sm uppercase tracking-widest text-muted-foreground">Uso diário</h3>
        <table className="mt-3 w-full text-xs">
          <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="py-2 text-left">Data</th>
              <th className="text-right">Msgs</th>
              <th className="text-right">Tokens entrada</th>
              <th className="text-right">Tokens saída</th>
              <th className="text-right">Custo</th>
            </tr>
          </thead>
          <tbody>
            {data.usage.daily.map((d) => (
              <tr key={d.usage_date} className="border-t border-border/20">
                <td className="py-1">{d.usage_date}</td>
                <td className="text-right">{d.message_count}</td>
                <td className="text-right">{Number(d.input_tokens).toLocaleString()}</td>
                <td className="text-right">{Number(d.output_tokens).toLocaleString()}</td>
                <td className="text-right">${Number(d.est_cost_usd).toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Roles ──────────────────────────────────────────────────────
function RolesTab({
  data,
  userId,
  disabled,
  onChange,
}: {
  data: UserDetailData;
  userId: string;
  disabled: boolean;
  onChange: () => void;
}) {
  const change = useMutation({
    mutationFn: useServerFn(adminChangeRole),
    onSuccess: () => {
      toast.success("papéis atualizados");
      onChange();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "erro"),
  });
  const ROLES = ["admin", "moderator", "support", "finance", "analytics"] as const;
  const active = new Set(data.roles.filter((r) => !r.disabled_at).map((r) => r.role));

  return (
    <div className="glass space-y-3 rounded-xl p-5">
      <h3 className="text-sm uppercase tracking-widest text-muted-foreground">
        Papéis administrativos
      </h3>
      <div className="flex flex-wrap gap-2">
        {ROLES.map((r) => (
          <button
            key={r}
            disabled={disabled}
            onClick={() => {
              const reason = window.prompt(
                `Motivo para ${active.has(r) ? "remover" : "adicionar"} ${r}:`,
              );
              if (!reason) return;
              const payload = active.has(r)
                ? { userId, removeRole: r, reason }
                : { userId, addRole: r, reason };
              change.mutate({ data: payload });
            }}
            className={`rounded-full px-3 py-1.5 text-xs uppercase tracking-widest ${active.has(r) ? "bg-[var(--gold)]/15 text-[var(--gold)] ring-1 ring-[var(--gold)]/40" : "bg-white/5 text-muted-foreground hover:text-foreground"} disabled:opacity-40`}
          >
            {r}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Para criar/remover super_admin, use a página de Administradores.
      </p>
    </div>
  );
}

// ── Notes ──────────────────────────────────────────────────────
function NotesTab({
  data,
  userId,
  onChange,
}: {
  data: UserDetailData;
  userId: string;
  onChange: () => void;
}) {
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<
    "general" | "vip" | "payment" | "abuse" | "support" | "billing"
  >("general");
  const [pinned, setPinned] = useState(false);

  const add = useMutation({
    mutationFn: useServerFn(adminAddNote),
    onSuccess: () => {
      setContent("");
      setPinned(false);
      toast.success("nota adicionada");
      onChange();
    },
  });
  const del = useMutation({
    mutationFn: useServerFn(adminDeleteNote),
    onSuccess: () => {
      toast.success("removida");
      onChange();
    },
  });
  const togglePin = useMutation({
    mutationFn: useServerFn(adminToggleNotePin),
    onSuccess: onChange,
  });

  return (
    <div className="space-y-4">
      <div className="glass space-y-3 rounded-xl p-5">
        <h3 className="text-sm uppercase tracking-widest text-muted-foreground">Nova nota</h3>
        <Textarea
          placeholder="Conteúdo da nota interna…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[80px]"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={category}
            onChange={setCategory}
            options={["general", "vip", "payment", "abuse", "support", "billing"]}
            label="categoria"
          />
          <label className="text-xs">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="mr-1 accent-[var(--gold)]"
            />{" "}
            fixar
          </label>
          <button
            disabled={content.length < 2 || add.isPending}
            onClick={() => add.mutate({ data: { userId, content, category, pinned } })}
            className="ml-auto rounded-full bg-[var(--gold)]/15 px-4 py-2 text-xs uppercase tracking-widest text-[var(--gold)] disabled:opacity-40"
          >
            adicionar
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {data.notes.map((n) => (
          <div
            key={n.id}
            className={`glass rounded-xl p-4 ${n.pinned ? "ring-1 ring-[var(--gold)]/40" : ""}`}
          >
            <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
              <span>
                {n.author_email} · {n.category} · {new Date(n.created_at).toLocaleString()}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => togglePin.mutate({ data: { noteId: n.id, pinned: !n.pinned } })}
                  className="hover:text-foreground"
                >
                  {n.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                </button>
                <button
                  onClick={() => {
                    if (window.confirm("Remover nota?")) del.mutate({ data: { noteId: n.id } });
                  }}
                  className="hover:text-red-300"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm">{n.content}</p>
          </div>
        ))}
        {data.notes.length === 0 && (
          <p className="italic text-muted-foreground">sem notas internas</p>
        )}
      </div>
    </div>
  );
}

// ── Audit ──────────────────────────────────────────────────────
function AuditTab({ data }: { data: UserDetailData }) {
  return (
    <div className="glass rounded-xl p-5">
      <h3 className="text-sm uppercase tracking-widest text-muted-foreground">
        Trilha de auditoria (100 eventos)
      </h3>
      <ul className="mt-3 space-y-2 text-xs">
        {data.auditTrail.map((e, i) => (
          <li key={i} className="border-t border-border/20 py-2">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
              <span>
                {new Date(e.occurredAt).toLocaleString()} · {e.actorEmail ?? "—"}
              </span>
              <span>{e.kind}</span>
            </div>
            <p className="font-mono">
              <span className="text-[var(--gold)]">{e.action}</span>{" "}
              {e.oldValue && (
                <>
                  · {e.oldValue} → {e.newValue}
                </>
              )}
            </p>
            {e.details && Object.keys(e.details).length > 0 && (
              <pre className="mt-1 overflow-x-auto rounded bg-black/40 p-2 text-[10px] text-muted-foreground">
                {JSON.stringify(e.details, null, 2)}
              </pre>
            )}
          </li>
        ))}
        {data.auditTrail.length === 0 && (
          <li className="italic text-muted-foreground">sem eventos</li>
        )}
      </ul>
    </div>
  );
}

// ── Risk ──────────────────────────────────────────────────────
function RiskTab({ data }: { data: UserDetailData }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="glass rounded-xl p-5">
        <h3 className="text-sm uppercase tracking-widest text-muted-foreground">Bloqueios</h3>
        <ul className="mt-2 space-y-2 text-xs">
          {data.locks.map((l) => (
            <li key={l.id} className="border-t border-border/20 py-2">
              <p>
                {l.reason} · <span className="text-muted-foreground">{l.severity}</span>
              </p>
              <p className="text-[10px] text-muted-foreground">
                {new Date(l.locked_at).toLocaleString()} →{" "}
                {l.unlocked_at
                  ? `desbloqueado ${new Date(l.unlocked_at).toLocaleString()}`
                  : l.expires_at
                    ? `expira ${new Date(l.expires_at).toLocaleString()}`
                    : "ativo"}
              </p>
            </li>
          ))}
          {data.locks.length === 0 && (
            <li className="italic text-muted-foreground">nunca bloqueado</li>
          )}
        </ul>
      </div>
      <div className="glass rounded-xl p-5">
        <h3 className="text-sm uppercase tracking-widest text-muted-foreground">
          Sinais de abuso (20)
        </h3>
        <ul className="mt-2 space-y-2 text-xs">
          {data.abuseSignals.map((s) => (
            <li key={s.id} className="border-t border-border/20 py-2">
              <p>
                {s.signal_type} · <span className="text-muted-foreground">{s.severity}</span>
              </p>
              <p className="text-[10px] text-muted-foreground">
                {new Date(s.created_at).toLocaleString()}
              </p>
            </li>
          ))}
          {data.abuseSignals.length === 0 && (
            <li className="italic text-muted-foreground">sem sinais</li>
          )}
        </ul>
      </div>
      <div className="glass rounded-xl p-5 lg:col-span-2">
        <h3 className="text-sm uppercase tracking-widest text-muted-foreground">
          Histórico premium
        </h3>
        <ul className="mt-2 space-y-1 text-xs">
          {data.premiumHistory.map((p) => (
            <li key={p.id} className="border-t border-border/20 py-1">
              <span className="text-muted-foreground">
                {new Date(p.occurred_at).toLocaleString()}
              </span>{" "}
              · {p.plan_code ?? "—"} · {p.status} ·{" "}
              <span className="text-muted-foreground">
                {p.actor} {p.reason ? `· ${p.reason}` : ""}
              </span>
            </li>
          ))}
          {data.premiumHistory.length === 0 && (
            <li className="italic text-muted-foreground">sem transições</li>
          )}
        </ul>
      </div>
    </div>
  );
}

function DebugTab({ data }: { data: UserDetailData }) {
  const d = data.entitlementDebug ?? null;
  const rows: Array<[string, React.ReactNode]> = [
    ["user ID", d?.userId ?? "—"],
    ["email", d?.email ?? "—"],
    ["plan_id subscriptions", d?.subscriptionsPricingPlanId ?? "—"],
    ["plan name", d?.resolverPlanName ?? d?.frontendPlan ?? "—"],
    ["subscription status", d?.subscriptionStatus ?? "—"],
    ["current role", Array.isArray(d?.currentRole) ? d.currentRole.join(", ") : "—"],
    ["frontend/profile plan", d?.frontendPlan ?? "—"],
    ["resolver tier", d?.resolverTier ?? "—"],
    ["usage-limiter plan", d?.frontendPlan ?? "—"],
    [
      "daily message limit",
      d?.currentDailyMessageLimit == null ? "unlimited" : d.currentDailyMessageLimit,
    ],
    [
      "monthly message limit",
      d?.currentMonthlyMessageLimit == null ? "—" : d.currentMonthlyMessageLimit,
    ],
    ["today message count", d?.currentMessageCount ?? 0],
    ["usage row plan", d?.usageRowSubscriptionType ?? "—"],
    ["resolver source", d?.resolverSource ?? "—"],
    ["resolver status", d?.resolverStatus ?? "—"],
    ["subscription version", d?.subscriptionVersion ?? "—"],
    [
      "synced at",
      d?.subscriptionSyncedAt ? new Date(d.subscriptionSyncedAt).toLocaleString() : "—",
    ],
  ];

  return (
    <div className="space-y-4">
      <div className="glass rounded-xl p-5">
        <h3 className="text-sm uppercase tracking-widest text-muted-foreground">
          Entitlement forensic snapshot
        </h3>
        <div className="mt-4 grid gap-2 lg:grid-cols-2">
          {rows.map(([label, value]) => (
            <Field key={label} label={label}>
              {value ?? "—"}
            </Field>
          ))}
        </div>
      </div>
      <div className="glass rounded-xl p-5">
        <h3 className="text-sm uppercase tracking-widest text-muted-foreground">
          Feature access flags
        </h3>
        <pre className="mt-3 overflow-x-auto rounded bg-black/40 p-3 text-[11px] text-muted-foreground">
          {JSON.stringify(d?.featureAccessFlags ?? {}, null, 2)}
        </pre>
      </div>
    </div>
  );
}

// ── small UI ────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-baseline gap-2 text-sm">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <span>{children}</span>
    </div>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-xl p-5">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="serif mt-2 text-2xl">{value}</p>
    </div>
  );
}
function ActionBtn({
  label,
  onClick,
  disabled,
  variant = "neutral",
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "danger" | "neutral";
}) {
  const cls =
    variant === "danger"
      ? "bg-red-500/15 text-red-300 hover:bg-red-500/25"
      : variant === "primary"
        ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
        : "bg-white/5 text-muted-foreground hover:text-foreground";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-full px-3 py-2 text-left text-xs uppercase tracking-widest ${cls} disabled:opacity-30`}
    >
      {label}
    </button>
  );
}
function Select<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly T[];
  label: string;
}) {
  return (
    <label className="text-xs">
      <span className="mb-1 block uppercase tracking-widest text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full rounded bg-white/5 px-2 py-1.5 text-sm"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
