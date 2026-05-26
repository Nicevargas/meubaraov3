import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { mpFetch, resolveEnv, getWebhookSecret } from "@/lib/mercadopago.server";
import { recomputeEntitlement } from "@/lib/entitlement.server";

/**
 * Mercado Pago notification webhook.
 * Source of truth for billing: subscriptions.pricing_plan_id, payments.pricing_plan_id.
 */
export const Route = createFileRoute("/api/public/webhooks/mercadopago")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const rawBody = await request.text();
        let body: { type?: string; action?: string; data?: { id?: string | number } } = {};
        try {
          body = rawBody ? JSON.parse(rawBody) : {};
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const eventType = body.type ?? body.action ?? "unknown";
        const dataId =
          (body.data?.id !== undefined && String(body.data.id)) ||
          url.searchParams.get("data.id") ||
          url.searchParams.get("id") ||
          "";
        if (!dataId) {
          console.warn("[MP webhook] missing data.id", { body });
          return new Response("ok");
        }

        // ---- signature verification --------------------------------
        const signatureHeader = request.headers.get("x-signature");
        const xRequestId = request.headers.get("x-request-id") ?? "";
        let signatureValid = false;
        let tsSkewSeconds = Number.POSITIVE_INFINITY;
        try {
          const secret = getWebhookSecret();
          const parts = Object.fromEntries(
            (signatureHeader ?? "")
              .split(",")
              .map((p) => p.trim().split("=") as [string, string])
              .filter((p) => p.length === 2),
          );
          const ts = parts["ts"];
          const v1 = parts["v1"];
          if (ts && v1) {
            const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
            const expected = createHmac("sha256", secret).update(manifest).digest("hex");
            const a = Buffer.from(v1, "hex");
            const b = Buffer.from(expected, "hex");
            signatureValid = a.length === b.length && timingSafeEqual(a, b);
            const tsNum = Number(ts);
            if (Number.isFinite(tsNum)) tsSkewSeconds = Math.abs(Date.now() - tsNum) / 1000;
          }
        } catch (e) {
          console.error("[MP webhook] signature parse error", e);
        }

        if (!signatureValid) {
          console.warn("[MP webhook] invalid signature", { eventType, dataId, xRequestId });
          return new Response("Invalid signature", { status: 401 });
        }
        if (tsSkewSeconds > 300) {
          console.warn("[MP webhook] timestamp out of window", {
            eventType,
            dataId,
            tsSkewSeconds,
          });
          return new Response("Stale timestamp", { status: 401 });
        }

        console.log("[MP webhook] received", {
          eventType,
          dataId,
          xRequestId,
          tsSkewSeconds: Math.round(tsSkewSeconds),
        });

        // ---- idempotent insert -------------------------------------
        const { data: existing } = await supabaseAdmin
          .from("webhook_events")
          .select("id, processed_at")
          .eq("provider", "mercadopago")
          .eq("event_type", eventType)
          .eq("external_id", dataId)
          .maybeSingle();

        if (existing?.processed_at) return new Response("ok");

        const eventRow = existing
          ? existing
          : (
              await supabaseAdmin
                .from("webhook_events")
                .insert({
                  provider: "mercadopago",
                  event_type: eventType,
                  external_id: dataId,
                  payload: body,
                } as never)
                .select("id")
                .single()
            ).data;

        try {
          const env = resolveEnv();
          if (eventType === "payment" || eventType.startsWith("payment")) {
            await handlePaymentEvent(env, dataId);
          } else if (eventType === "merchant_order" || eventType.startsWith("merchant_order")) {
            await handleMerchantOrderEvent(env, dataId);
          } else if (
            eventType === "subscription_preapproval" ||
            eventType.startsWith("preapproval") ||
            eventType.startsWith("subscription")
          ) {
            await handlePreapprovalEvent(env, dataId);
          } else {
            console.log("[MP webhook] ignored event", { eventType, dataId });
          }

          if (eventRow?.id) {
            await supabaseAdmin
              .from("webhook_events")
              .update({ processed_at: new Date().toISOString() } as never)
              .eq("id", eventRow.id);
          }
          return new Response("ok");
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error("[MP webhook] handler error", { eventType, dataId, message });
          if (eventRow?.id) {
            await supabaseAdmin
              .from("webhook_events")
              .update({ error_text: message } as never)
              .eq("id", eventRow.id);
          }
          return new Response("Handler error", { status: 500 });
        }
      },
    },
  },
});

/**
 * Resolve pricing_plan_id from MP metadata or external_reference.
 * external_reference format: `<userId>:<pricing_plan_id>`.
 * Returns null when the chain cannot be resolved (caller decides).
 */
async function resolveSubscriptionTarget(opts: {
  userId?: string;
  pricingPlanId?: string;
  preapprovalId?: string;
  externalReference?: string;
}): Promise<{
  userId: string;
  pricingPlanId: string;
  productId: string;
  billingCycle: string;
} | null> {
  let userId = opts.userId;
  let pricingPlanId = opts.pricingPlanId;

  if ((!userId || !pricingPlanId) && opts.externalReference?.includes(":")) {
    const [u, p] = opts.externalReference.split(":");
    userId ||= u;
    pricingPlanId ||= p;
  }

  if (!pricingPlanId && opts.preapprovalId) {
    const { data: existingSub } = await supabaseAdmin
      .from("subscriptions")
      .select("user_id, pricing_plan_id")
      .eq("mp_preapproval_id", opts.preapprovalId)
      .maybeSingle();
    if (existingSub) {
      userId ||= existingSub.user_id;
      pricingPlanId ||= existingSub.pricing_plan_id ?? undefined;
    }
  }

  if (!userId || !pricingPlanId) return null;

  const { data: pp } = await supabaseAdmin
    .from("pricing_plans")
    .select("id, product_id, billing_cycle, active")
    .eq("id", pricingPlanId)
    .maybeSingle();
  if (!pp || !pp.active) return null;

  return {
    userId,
    pricingPlanId: pp.id,
    productId: pp.product_id,
    billingCycle: pp.billing_cycle,
  };
}

async function handlePaymentEvent(env: "sandbox" | "prod", paymentId: string) {
  const payment = await mpFetch<{
    id: number;
    status: string;
    status_detail: string;
    transaction_amount: number;
    currency_id: string;
    payment_method_id: string;
    payment_type_id: string;
    date_approved?: string;
    external_reference?: string;
    metadata?: { user_id?: string; pricing_plan_id?: string; product_id?: string };
    preapproval_id?: string;
  }>(env, `/v1/payments/${paymentId}`);

  const target = await resolveSubscriptionTarget({
    userId: payment.metadata?.user_id,
    pricingPlanId: payment.metadata?.pricing_plan_id,
    preapprovalId: payment.preapproval_id,
    externalReference: payment.external_reference,
  });
  if (!target) {
    throw new Error(`[MP webhook] payment ${paymentId} could not be resolved to a pricing_plan`);
  }

  const method =
    payment.payment_method_id === "pix"
      ? "pix"
      : payment.payment_type_id === "debit_card"
        ? "debit_card"
        : payment.payment_type_id === "credit_card"
          ? "credit_card"
          : "other";

  await supabaseAdmin.from("payments").upsert(
    {
      user_id: target.userId,
      pricing_plan_id: target.pricingPlanId,
      provider: "mercadopago",
      mp_payment_id: String(payment.id),
      mp_preapproval_id: payment.preapproval_id ?? null,
      payment_method: method,
      payment_type: payment.preapproval_id ? "subscription_renewal" : "subscription_initial",
      status: payment.status,
      status_detail: payment.status_detail,
      amount: payment.transaction_amount,
      currency: payment.currency_id ?? "BRL",
      paid_at: payment.date_approved ?? null,
      raw: JSON.parse(JSON.stringify(payment)),
    } as never,
    { onConflict: "mp_payment_id" },
  );

  console.log("[MP webhook] payment recorded", {
    paymentId,
    userId: target.userId,
    pricingPlanId: target.pricingPlanId,
    method,
    status: payment.status,
    amount: payment.transaction_amount,
  });

  if (
    payment.status === "approved" ||
    ["rejected", "cancelled", "refunded", "charged_back"].includes(payment.status)
  ) {
    await recomputeEntitlement(target.userId);
  }
}

async function handleMerchantOrderEvent(env: "sandbox" | "prod", orderId: string) {
  const order = await mpFetch<{
    id: number;
    status: string;
    order_status?: string;
    payments?: Array<{ id: number; status: string }>;
  }>(env, `/merchant_orders/${orderId}`);

  console.log("[MP webhook] merchant_order", {
    orderId,
    status: order.status,
    orderStatus: order.order_status,
    paymentCount: order.payments?.length ?? 0,
  });

  for (const p of order.payments ?? []) {
    try {
      await handlePaymentEvent(env, String(p.id));
    } catch (e) {
      console.error("[MP webhook] merchant_order payment sync failed", {
        orderId,
        paymentId: p.id,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
}

async function handlePreapprovalEvent(env: "sandbox" | "prod", preapprovalId: string) {
  const pre = await mpFetch<{
    id: string;
    status: string;
    payer_id?: string | number;
    external_reference?: string;
    next_payment_date?: string;
    preapproval_plan_id?: string;
  }>(env, `/preapproval/${preapprovalId}`);

  const target = await resolveSubscriptionTarget({
    preapprovalId: pre.id,
    externalReference: pre.external_reference,
  });
  if (!target) {
    throw new Error(
      `[MP webhook] preapproval ${preapprovalId} could not be resolved to a pricing_plan (external_reference=${pre.external_reference ?? "—"})`,
    );
  }

  await supabaseAdmin.from("subscriptions").upsert(
    {
      user_id: target.userId,
      provider: "mercadopago",
      pricing_plan_id: target.pricingPlanId,
      product_id: target.productId,
      billing_cycle: target.billingCycle,
      mp_preapproval_id: pre.id,
      mp_payer_id: pre.payer_id ? String(pre.payer_id) : null,
      status: pre.status,
      next_payment_date: pre.next_payment_date ?? null,
      environment: env === "prod" ? "live" : "sandbox",
    } as never,
    { onConflict: "mp_preapproval_id" },
  );

  console.log("[MP webhook] preapproval synced", {
    preapprovalId,
    userId: target.userId,
    pricingPlanId: target.pricingPlanId,
    status: pre.status,
  });

  await recomputeEntitlement(target.userId);
}
