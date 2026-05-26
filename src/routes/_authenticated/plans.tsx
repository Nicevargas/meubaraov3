import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { listPublicCatalog, type PublicCatalog } from "@/lib/products.functions";
import { getCurrentEntitlement } from "@/lib/mercadopago.functions";

export const Route = createFileRoute("/_authenticated/plans")({
  component: PlansPage,
  head: () => ({ meta: [{ title: "Escolha sua presença · Meu Barão" }] }),
});

type Cycle = "monthly" | "quarterly" | "semiannual" | "annual";

const CYCLE_ORDER: Cycle[] = ["monthly", "quarterly", "semiannual", "annual"];
const CYCLE_LABEL: Record<Cycle, string> = {
  monthly: "Mensal",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  annual: "Anual",
};
const CYCLE_RENEWAL: Record<Cycle, string> = {
  monthly: "Renova todo mês",
  quarterly: "Renova a cada 3 meses",
  semiannual: "Renova a cada 6 meses",
  annual: "Renova uma vez por ano",
};

const TAGLINES: Record<string, string> = {
  premium: "A relação começa de verdade.",
  elite: "Uma intimidade ultra personalizada.",
};

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  }).format(value);
}

function PlansPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fetchCatalog = useServerFn(listPublicCatalog);
  const fetchEntitlement = useServerFn(getCurrentEntitlement);

  const [catalog, setCatalog] = useState<PublicCatalog | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = (await fetchCatalog({ data: undefined as unknown as never })) as PublicCatalog;
        setCatalog(res);
      } catch (e) {
        console.error("listPublicCatalog failed", e);
      }
    })();
  }, [fetchCatalog]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = (await fetchEntitlement({ data: undefined as unknown as never })) as {
          plan?: string;
        };
        if (res?.plan) setCurrentPlan(res.plan);
      } catch (e) {
        console.error("getCurrentEntitlement failed", e);
      }
    })();
  }, [user, fetchEntitlement]);

  const products = useMemo(() => catalog?.products ?? [], [catalog]);

  function choose(planCode: string | null) {
    if (!user || !planCode) return;
    setLoading(planCode);
    navigate({ to: "/checkout/$plan", params: { plan: planCode } });
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-black via-[#0a0606] to-background px-6 py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--gold)_8%,transparent),transparent_60%)]" />

      <div className="relative mx-auto max-w-5xl">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground/60">
            Ritual selado
          </p>
          <h1 className="serif text-4xl md:text-6xl mt-4 leading-[1.05]">
            Escolha o nível da sua <span className="gold-text italic">experiência</span>.
          </h1>
          <p className="serif italic text-muted-foreground mt-4 text-lg max-w-xl mx-auto">
            Dois caminhos. Quatro formas de acesso. Você escolhe a profundidade.
          </p>
          {currentPlan !== "free" && (
            <p className="mt-6 text-[10px] uppercase tracking-[0.3em] gold-text">
              Plano atual: {currentPlan}
            </p>
          )}
        </div>

        <div className="mt-10 flex flex-col items-center gap-3">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60">
            Ciclo de cobrança
          </p>
          <div className="inline-flex flex-wrap justify-center rounded-full border border-[color-mix(in_oklab,var(--gold)_25%,transparent)] p-1 backdrop-blur">
            {CYCLE_ORDER.map((c) => (
              <button
                key={c}
                onClick={() => setCycle(c)}
                className={`px-5 py-2 text-[10px] uppercase tracking-[0.3em] rounded-full transition-colors ${
                  cycle === c
                    ? "bg-gradient-to-r from-[var(--gold)] to-[var(--copper)] text-black"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {CYCLE_LABEL[c]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-12 grid md:grid-cols-2 gap-6">
          {products.map((prod) => {
            const variant = prod.plans.find((p) => p.billing_cycle === cycle) ?? null;
            const featured = prod.slug === "premium";
            const tagline = TAGLINES[prod.slug] ?? prod.description ?? "";
            const features = prod.features.length
              ? prod.features
              : ["Conversas ilimitadas", "Memória emocional contínua"];

            return (
              <div
                key={prod.id}
                className={`relative rounded-3xl p-10 h-full flex flex-col backdrop-blur-xl transition-all duration-700 ${
                  featured
                    ? "border border-[color-mix(in_oklab,var(--gold)_45%,transparent)] -translate-y-2 bg-gradient-to-b from-[color-mix(in_oklab,var(--gold)_10%,transparent)] to-black/60 shadow-[0_30px_80px_-20px_color-mix(in_oklab,var(--gold)_35%,transparent)]"
                    : "border border-[color-mix(in_oklab,var(--gold)_15%,transparent)] bg-black/40 hover:border-[color-mix(in_oklab,var(--gold)_30%,transparent)]"
                }`}
              >
                {variant && variant.discount_pct >= 5 && (
                  <div className="absolute -top-3 right-6 rounded-full bg-gradient-to-r from-[var(--gold)] to-[var(--copper)] px-3 py-1 text-[10px] tracking-[0.3em] uppercase text-black">
                    economize {variant.discount_pct}%
                  </div>
                )}
                <div className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
                  Plano {prod.name}
                </div>
                <p className="mt-3 serif italic text-foreground/80">{tagline}</p>

                <div className="mt-6 flex items-baseline gap-2">
                  <span className="serif text-5xl gold-text">
                    {variant ? formatBRL(variant.price_brl) : "—"}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    /{CYCLE_LABEL[cycle].toLowerCase()}
                  </span>
                </div>
                {variant && cycle !== "monthly" && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    equivale a {formatBRL(variant.per_month_brl)} por mês
                  </p>
                )}
                <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-muted-foreground/50">
                  {CYCLE_RENEWAL[cycle]}
                </p>

                <ul className="mt-8 space-y-4 flex-1">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-foreground/80">
                      <span className="mt-1.5 h-1 w-3 bg-[var(--gold)]/70 shrink-0" />
                      <span className="font-light leading-relaxed">{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => variant && choose(variant.id)}
                  disabled={loading !== null || !variant?.id}
                  className={`mt-10 h-12 rounded-md uppercase tracking-[0.25em] text-xs transition-opacity disabled:opacity-40 ${
                    featured
                      ? "bg-gradient-to-r from-[var(--gold)] to-[var(--copper)] text-black hover:opacity-90"
                      : "border border-[color-mix(in_oklab,var(--gold)_35%,transparent)] text-foreground hover:bg-white/[0.04]"
                  }`}
                >
                  {loading === variant?.id ? "Selando..." : `Entrar no ${prod.name}`}
                </button>
              </div>
            );
          })}
          {!catalog && (
            <div className="col-span-full text-center text-muted-foreground/60 text-sm">
              Carregando planos…
            </div>
          )}
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/app"
            className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60 hover:text-foreground"
          >
            decidir depois →
          </Link>
        </div>
      </div>
    </div>
  );
}
