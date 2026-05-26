// Shared admin UX: assign a subscription via product + billing cycle.
// Backend resolves pricing_plan_id from (productSlug, billingCycle).
// Never exposes IDs or DB terminology to the operator.
import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Crown, Sparkles, User, AlertTriangle, Loader2 } from "lucide-react";
import { adminAssignSubscription } from "@/lib/admin-users.functions";
import { Textarea } from "@/components/ui/textarea";

export type Tier = "free" | "premium" | "elite";
export type Cycle = "monthly" | "quarterly" | "semiannual" | "annual";

const TIERS: { id: Tier; label: string; sub: string; icon: typeof User; tone: string }[] = [
  {
    id: "free",
    label: "Free",
    sub: "Acesso básico, sem cobrança",
    icon: User,
    tone: "border-border/40 text-muted-foreground",
  },
  {
    id: "premium",
    label: "Premium",
    sub: "Plano padrão pago",
    icon: Sparkles,
    tone: "border-[var(--copper)]/40 text-[var(--amber-soft)]",
  },
  {
    id: "elite",
    label: "Elite",
    sub: "Tier mais alto, todos os recursos",
    icon: Crown,
    tone: "border-[var(--gold)]/50 text-[var(--gold)]",
  },
];

const CYCLES: { id: Cycle; label: string; hint: string }[] = [
  { id: "monthly", label: "Mensal", hint: "1 mês" },
  { id: "quarterly", label: "Trimestral", hint: "3 meses" },
  { id: "semiannual", label: "Semestral", hint: "6 meses" },
  { id: "annual", label: "Anual", hint: "12 meses" },
];

export interface PlanAssignmentFlowProps {
  userId: string;
  userLabel: string;
  currentTier: Tier | string | null | undefined;
  currentCycle: Cycle | string | null | undefined;
  disabled?: boolean;
  onApplied?: () => void;
  /** When provided, applying calls onCancel() after success (for modal dismissal). */
  onCancel?: () => void;
  compact?: boolean;
}

export function PlanAssignmentFlow({
  userId,
  userLabel,
  currentTier,
  currentCycle,
  disabled,
  onApplied,
  onCancel,
  compact,
}: PlanAssignmentFlowProps) {
  const assign = useServerFn(adminAssignSubscription);
  const initialTier = (TIERS.find((t) => t.id === currentTier)?.id ?? "premium") as Tier;
  const initialCycle = (CYCLES.find((c) => c.id === currentCycle)?.id ?? "monthly") as Cycle;
  const [tier, setTier] = useState<Tier>(initialTier);
  const [cycle, setCycle] = useState<Cycle>(initialCycle);
  const [reason, setReason] = useState("");

  useEffect(() => {
    setTier(initialTier);
    setCycle(initialCycle);
  }, [initialCycle, initialTier, userId]); // reset on target change

  const mutation = useMutation({
    mutationFn: () =>
      assign({
        data: {
          userId,
          productSlug: tier,
          billingCycle: tier === "free" ? undefined : cycle,
          reason: reason.trim() || "Ajuste manual via painel admin",
        },
      }),
    onSuccess: () => {
      toast.success(
        tier === "free"
          ? "Assinatura cancelada — usuário voltou ao Free"
          : "Plano aplicado com sucesso",
      );
      setReason("");
      onApplied?.();
      onCancel?.();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao aplicar plano"),
  });

  const noChange = useMemo(() => {
    if (!currentTier) return false;
    if (tier === "free") return currentTier === "free";
    return tier === currentTier && cycle === currentCycle;
  }, [tier, cycle, currentTier, currentCycle]);

  return (
    <div className={`space-y-5 ${compact ? "" : ""}`}>
      {/* current snapshot */}
      <div className="rounded-lg border border-border/40 bg-black/30 px-4 py-3 text-[11px]">
        <p className="uppercase tracking-widest text-muted-foreground">Atual</p>
        <p className="mt-0.5 text-sm text-foreground">
          <span className="font-medium">{userLabel}</span>
          {" · "}
          <span className="text-[var(--gold)]">{(currentTier as string) ?? "—"}</span>
          {currentCycle ? (
            <span className="text-muted-foreground"> · {cycleLabel(currentCycle as Cycle)}</span>
          ) : null}
        </p>
      </div>

      {/* step 1 — product */}
      <Step n={1} title="Escolha o tier">
        <div className="grid grid-cols-3 gap-2">
          {TIERS.map((t) => {
            const Icon = t.icon;
            const selected = tier === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTier(t.id)}
                disabled={disabled}
                className={`group relative flex flex-col items-start gap-1.5 rounded-xl border px-3 py-3 text-left transition ${
                  selected
                    ? "border-[var(--gold)] bg-[var(--gold)]/10 ring-1 ring-[var(--gold)]/40"
                    : "border-border/30 bg-white/[0.02] hover:border-border/60"
                } disabled:opacity-40`}
              >
                <div className="flex w-full items-center justify-between">
                  <Icon className={`h-4 w-4 ${selected ? "text-[var(--gold)]" : t.tone}`} />
                  {selected && <Check className="h-3.5 w-3.5 text-[var(--gold)]" />}
                </div>
                <span
                  className={`text-sm font-medium ${selected ? "text-foreground" : "text-foreground/90"}`}
                >
                  {t.label}
                </span>
                <span className="text-[10px] leading-tight text-muted-foreground">{t.sub}</span>
              </button>
            );
          })}
        </div>
      </Step>

      {/* step 2 — billing cycle */}
      {tier !== "free" ? (
        <Step n={2} title="Ciclo de cobrança">
          <div className="grid grid-cols-4 gap-2">
            {CYCLES.map((c) => {
              const selected = cycle === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setCycle(c.id)}
                  disabled={disabled}
                  className={`rounded-lg border px-2 py-2 text-center transition ${
                    selected
                      ? "border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold)] ring-1 ring-[var(--gold)]/40"
                      : "border-border/30 bg-white/[0.02] text-muted-foreground hover:text-foreground hover:border-border/60"
                  } disabled:opacity-40`}
                >
                  <p className="text-xs font-medium">{c.label}</p>
                  <p className="text-[9px] uppercase tracking-widest opacity-70">{c.hint}</p>
                </button>
              );
            })}
          </div>
        </Step>
      ) : (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-xs text-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Aplicar <strong>Free</strong> cancela todas as assinaturas ativas e devolve o usuário ao
            tier gratuito. Pagamentos já feitos não são reembolsados.
          </span>
        </div>
      )}

      {/* step 3 — reason + apply */}
      <Step n={3} title="Motivo (auditoria — opcional)">
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="ex.: cortesia VIP, ajuste suporte, teste interno"
          className="min-h-[60px] text-xs"
          disabled={disabled}
        />
      </Step>

      <div className="flex items-center justify-end gap-2 pt-1">
        {onCancel && (
          <button
            onClick={onCancel}
            className="rounded-full px-4 py-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            cancelar
          </button>
        )}
        <button
          onClick={() => mutation.mutate()}
          disabled={disabled || mutation.isPending || noChange}
          title={noChange ? "Já está nesse plano e ciclo" : undefined}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs uppercase tracking-widest ring-1 transition ${
            tier === "free"
              ? "bg-amber-500/15 text-amber-200 ring-amber-500/40 hover:bg-amber-500/25"
              : "bg-[var(--gold)]/15 text-[var(--gold)] ring-[var(--gold)]/40 hover:bg-[var(--gold)]/25"
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {mutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
          {tier === "free" ? "Voltar para Free" : "Aplicar assinatura"}
        </button>
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--gold)]/15 text-[10px] font-semibold text-[var(--gold)] ring-1 ring-[var(--gold)]/30">
          {n}
        </span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function cycleLabel(c: Cycle): string {
  return CYCLES.find((x) => x.id === c)?.label ?? c;
}
