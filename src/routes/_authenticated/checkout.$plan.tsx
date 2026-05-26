import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  createPixPayment,
  createCardSubscription,
  getPaymentStatus,
} from "@/lib/mercadopago.functions";

export const Route = createFileRoute("/_authenticated/checkout/$plan")({
  component: Checkout,
  head: () => ({ meta: [{ title: "Pagamento · Meu Barão" }] }),
  errorComponent: ErrorComponent,
});

type Method = "pix" | "card";

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  const router = useRouter();
  console.error("checkout route error", error);
  return (
    <ElegantFallback
      title="A passagem está silenciosa"
      message="Não conseguimos abrir o pagamento neste momento. Tente novamente em instantes."
      onRetry={() => {
        router.invalidate();
        reset();
      }}
    />
  );
}

function Checkout() {
  const { plan: planCode } = Route.useParams();
  const [method, setMethod] = useState<Method>("pix");
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-black via-[#0a0606] to-background px-6 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--gold)_8%,transparent),transparent_60%)]" />
      <div className="relative mx-auto max-w-xl">
        <Link
          to="/plans"
          className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground"
        >
          ← outros planos
        </Link>
        <div className="mt-8 mb-6 text-center">
          <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground/60">
            Selando sua presença
          </p>
          <h1 className="serif text-3xl md:text-4xl mt-3">
            <span className="gold-text italic">{planCode.replace(/_/g, " ")}</span>
          </h1>
        </div>

        <div className="flex justify-center mb-6">
          <div className="inline-flex rounded-full border border-[color-mix(in_oklab,var(--gold)_25%,transparent)] p-1 backdrop-blur">
            {(["pix", "card"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`px-6 py-2 text-[10px] uppercase tracking-[0.3em] rounded-full transition-colors ${
                  method === m
                    ? "bg-gradient-to-r from-[var(--gold)] to-[var(--copper)] text-black"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "pix" ? "Pix" : "Cartão"}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[color-mix(in_oklab,var(--gold)_20%,transparent)] bg-black/50 p-6 backdrop-blur-xl">
          {method === "pix" ? (
            <PixFlow planCode={planCode} disabled={!accepted} />
          ) : (
            <CardFlow planCode={planCode} disabled={!accepted} />
          )}
        </div>

        <label className="mt-6 flex items-start gap-3 text-xs text-muted-foreground/80">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 accent-[var(--gold)]"
          />
          <span>
            Aceito os{" "}
            <Link to="/terms" className="underline">
              Termos
            </Link>{" "}
            e a{" "}
            <Link to="/privacy" className="underline">
              Política de Privacidade
            </Link>
            . Entendo que assinaturas são renovadas automaticamente até cancelamento.
          </span>
        </label>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- */
/* Pix                                                              */
/* --------------------------------------------------------------- */

function PixFlow({ planCode, disabled }: { planCode: string; disabled: boolean }) {
  const router = useRouter();
  const createPix = useServerFn(createPixPayment);
  const checkStatus = useServerFn(getPaymentStatus);
  const [state, setState] = useState<"idle" | "creating" | "waiting" | "paid" | "error">("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [pix, setPix] = useState<Awaited<ReturnType<typeof createPixPayment>> | null>(null);
  const pollRef = useRef<number | null>(null);

  async function generate() {
    setState("creating");
    setErrMsg(null);
    try {
      const res = await createPix({ data: { pricingPlanId: planCode } });
      setPix(res);
      setState("waiting");
    } catch (e) {
      console.error(e);
      setErrMsg("Não conseguimos gerar o Pix. Tente novamente.");
      setState("error");
    }
  }

  useEffect(() => {
    if (state !== "waiting" || !pix) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await checkStatus({ data: { paymentId: pix.paymentId } });
        if (cancelled) return;
        if (res.status === "approved") {
          setState("paid");
          if (pollRef.current) window.clearInterval(pollRef.current);
          setTimeout(() => router.navigate({ to: "/app" }), 1800);
        }
      } catch (e) {
        console.error("status poll failed", e);
      }
    };
    pollRef.current = window.setInterval(poll, 4000);
    return () => {
      cancelled = true;
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [state, pix, checkStatus, router]);

  if (state === "idle" || state === "error") {
    return (
      <div className="text-center py-6">
        <p className="serif italic text-muted-foreground mb-6">
          Geramos um QR Code Pix. A aprovação é instantânea.
        </p>
        <button
          onClick={generate}
          disabled={disabled}
          className="h-12 px-10 rounded-md bg-gradient-to-r from-[var(--gold)] to-[var(--copper)] text-black uppercase tracking-[0.25em] text-xs hover:opacity-90 disabled:opacity-40"
        >
          Gerar Pix
        </button>
        {errMsg && <p className="mt-4 text-xs text-red-300">{errMsg}</p>}
        {disabled && (
          <p className="mt-4 text-[10px] text-muted-foreground/60">
            Aceite os termos para continuar.
          </p>
        )}
      </div>
    );
  }

  if (state === "creating") {
    return <Pulse label="Selando o Pix" />;
  }

  if (state === "paid") {
    return (
      <div className="text-center py-10">
        <p className="text-[10px] uppercase tracking-[0.4em] gold-text mb-3">Confirmado</p>
        <h2 className="serif text-2xl italic">Bem-vindo de volta.</h2>
        <p className="serif italic text-muted-foreground mt-3">Sua presença foi selada.</p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70 mb-4">
        Aguardando aprovação
      </p>
      {pix?.qrCodeBase64 && (
        <img
          src={`data:image/png;base64,${pix.qrCodeBase64}`}
          alt="QR Code Pix"
          className="mx-auto w-56 h-56 rounded-xl border border-[color-mix(in_oklab,var(--gold)_25%,transparent)] bg-white p-2"
        />
      )}
      {pix?.qrCode && (
        <div className="mt-4 rounded-md bg-black/40 border border-white/10 p-3">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
            Copia e cola
          </p>
          <code className="block break-all text-[11px] text-foreground/80">{pix.qrCode}</code>
          <button
            onClick={() => navigator.clipboard.writeText(pix.qrCode!)}
            className="mt-3 text-[10px] uppercase tracking-[0.3em] text-[var(--gold)] hover:opacity-80"
          >
            copiar
          </button>
        </div>
      )}
      <div className="mt-5 flex justify-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)] animate-pulse" />
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)] animate-pulse [animation-delay:0.2s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)] animate-pulse [animation-delay:0.4s]" />
      </div>
      <p className="mt-3 text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60">
        a aprovação aparece sozinha
      </p>
    </div>
  );
}

/* --------------------------------------------------------------- */
/* Card (recurring via MP preapproval)                              */
/* --------------------------------------------------------------- */

function CardFlow({ planCode, disabled }: { planCode: string; disabled: boolean }) {
  const createCard = useServerFn(createCardSubscription);
  const [state, setState] = useState<"idle" | "creating" | "error">("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const go = useCallback(async () => {
    setState("creating");
    setErrMsg(null);
    try {
      const res = await createCard({
        data: {
          pricingPlanId: planCode,
          returnUrl: `${window.location.origin}/app`,
        },
      });
      window.location.href = res.checkoutUrl;
    } catch (e) {
      console.error(e);
      setErrMsg("Não conseguimos abrir o cartão. Tente novamente.");
      setState("error");
    }
  }, [createCard, planCode]);

  return (
    <div className="text-center py-6">
      <p className="serif italic text-muted-foreground mb-6">
        Você será levado ao ambiente seguro do Mercado Pago para selar seu cartão. Cobranças
        automáticas conforme o ciclo escolhido.
      </p>
      <button
        onClick={go}
        disabled={disabled || state === "creating"}
        className="h-12 px-10 rounded-md bg-gradient-to-r from-[var(--gold)] to-[var(--copper)] text-black uppercase tracking-[0.25em] text-xs hover:opacity-90 disabled:opacity-40"
      >
        {state === "creating" ? "Abrindo..." : "Continuar com cartão"}
      </button>
      {errMsg && <p className="mt-4 text-xs text-red-300">{errMsg}</p>}
      {disabled && (
        <p className="mt-4 text-[10px] text-muted-foreground/60">
          Aceite os termos para continuar.
        </p>
      )}
    </div>
  );
}

function Pulse({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center py-10 gap-3">
      <div className="flex gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)] animate-pulse" />
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)] animate-pulse [animation-delay:0.2s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)] animate-pulse [animation-delay:0.4s]" />
      </div>
      <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">{label}</p>
    </div>
  );
}

function ElegantFallback({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-black via-[#0a0606] to-background flex items-center justify-center px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--gold)_10%,transparent),transparent_60%)]" />
      <div className="relative mx-auto max-w-lg text-center">
        <h1 className="serif text-3xl md:text-4xl mt-4 leading-tight">
          <span className="gold-text italic">{title}</span>
        </h1>
        <p className="serif italic text-muted-foreground mt-6">{message}</p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          {onRetry && (
            <button
              onClick={onRetry}
              className="h-12 px-10 rounded-md bg-gradient-to-r from-[var(--gold)] to-[var(--copper)] text-black uppercase tracking-[0.25em] text-xs hover:opacity-90"
            >
              Tentar novamente
            </button>
          )}
          <Link
            to="/plans"
            className="h-12 px-10 leading-[3rem] rounded-md border border-[color-mix(in_oklab,var(--gold)_35%,transparent)] text-foreground uppercase tracking-[0.25em] text-xs hover:bg-white/[0.04]"
          >
            Voltar aos planos
          </Link>
        </div>
      </div>
    </div>
  );
}
