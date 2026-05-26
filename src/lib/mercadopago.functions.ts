// Public + authenticated server fns for Mercado Pago checkout.
// Source of truth: pricing_plans (UUID) → products. Legacy `plans` is gone.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { mpFetch, resolveEnv, getPublicKey } from "@/lib/mercadopago.server";
import { recomputeEntitlement, resolveUserEntitlement } from "@/lib/entitlement.server";
import { z } from "zod";

const PricingPlanId = z.string().uuid();
const CYCLE_VALUES = ["monthly", "quarterly", "semiannual", "annual"] as const;
const TierSchema = z.enum(["premium", "elite"]);
const CycleSchema = z.enum(CYCLE_VALUES);

type ResolvedPlan = {
  pricing_plan_id: string;
  product_id: string;
  product_slug: string;
  product_name: string;
  tier: string;
  billing_cycle: string;
  price_brl: number;
  currency: string;
};

/** Public: returns the publishable key for the MP browser SDK. */
export const getMpPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  const env = resolveEnv();
  return { publicKey: getPublicKey(env), env };
});

async function loadPricingPlan(pricingPlanId: string): Promise<ResolvedPlan> {
  const { data, error } = await supabaseAdmin
    .from("pricing_plans")
    .select(
      "id, product_id, billing_cycle, price_brl, currency, active, products(id, slug, name, tier, active)",
    )
    .eq("id", pricingPlanId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`pricing_plan ${pricingPlanId} not found`);
  if (!data.active) throw new Error(`pricing_plan ${pricingPlanId} is inactive`);
  const prod = (
    data as unknown as {
      products: { id: string; slug: string; name: string; tier: string; active: boolean } | null;
    }
  ).products;
  if (!prod) throw new Error(`pricing_plan ${pricingPlanId} has no product`);
  if (!prod.active) throw new Error(`product ${prod.slug} is inactive`);
  return {
    pricing_plan_id: data.id,
    product_id: prod.id,
    product_slug: prod.slug,
    product_name: prod.name,
    tier: prod.tier,
    billing_cycle: data.billing_cycle,
    price_brl: Number(data.price_brl),
    currency: data.currency,
  };
}

function cycleToFrequency(cycle: string): { frequency: number; frequency_type: "months" } {
  if (cycle === "monthly") return { frequency: 1, frequency_type: "months" };
  if (cycle === "quarterly") return { frequency: 3, frequency_type: "months" };
  if (cycle === "semiannual") return { frequency: 6, frequency_type: "months" };
  if (cycle === "annual") return { frequency: 12, frequency_type: "months" };
  throw new Error(`Unsupported billing cycle: ${cycle}`);
}

/** Public: resolve pricing_plan_id from (tier, billing_cycle). */
export const resolvePlanByTierCycle = createServerFn({ method: "POST" })
  .inputValidator((data: { tier: string; billingCycle: string }) => ({
    tier: TierSchema.parse(data.tier),
    billingCycle: CycleSchema.parse(data.billingCycle),
  }))
  .handler(async ({ data }) => {
    const { data: prod } = await supabaseAdmin
      .from("products")
      .select("id, slug, name")
      .eq("tier", data.tier)
      .eq("active", true)
      .maybeSingle();
    if (!prod) throw new Error(`No active product for tier ${data.tier}`);

    const { data: pp, error } = await supabaseAdmin
      .from("pricing_plans")
      .select("id, billing_cycle, price_brl, currency")
      .eq("product_id", prod.id)
      .eq("billing_cycle", data.billingCycle)
      .eq("active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!pp) throw new Error(`Plan variant ${data.tier}/${data.billingCycle} not configured`);
    return {
      pricing_plan_id: pp.id,
      product_slug: prod.slug,
      product_name: prod.name,
      billing_cycle: pp.billing_cycle,
      price_brl: Number(pp.price_brl),
      currency: pp.currency,
    };
  });

/* ------------------------------------------------------------------ */
/* Pix payment (single charge).                                        */
/* ------------------------------------------------------------------ */

export const createPixPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { pricingPlanId: string }) => ({
    pricingPlanId: PricingPlanId.parse(data.pricingPlanId),
  }))
  .handler(async ({ data, context }) => {
    const { userId, claims } = context;
    const email = (claims as { email?: string })?.email ?? `user-${userId}@meubarao.com`;
    const env = resolveEnv();
    const plan = await loadPricingPlan(data.pricingPlanId);

    const idempotencyKey = `pix-${userId}-${plan.pricing_plan_id}-${Date.now()}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const mpPayment = await mpFetch<{
      id: number;
      status: string;
      status_detail: string;
      point_of_interaction?: {
        transaction_data?: { qr_code?: string; qr_code_base64?: string; ticket_url?: string };
      };
    }>(env, "/v1/payments", {
      method: "POST",
      idempotencyKey,
      body: {
        transaction_amount: plan.price_brl,
        description: plan.product_name,
        payment_method_id: "pix",
        payer: { email },
        date_of_expiration: expiresAt.toISOString().replace("Z", "-03:00"),
        external_reference: `${userId}:${plan.pricing_plan_id}`,
        notification_url: undefined,
        metadata: {
          user_id: userId,
          pricing_plan_id: plan.pricing_plan_id,
          product_id: plan.product_id,
          product_slug: plan.product_slug,
        },
      },
    });

    const qr = mpPayment.point_of_interaction?.transaction_data;

    const { data: payment, error: insertErr } = await supabaseAdmin
      .from("payments")
      .insert({
        user_id: userId,
        pricing_plan_id: plan.pricing_plan_id,
        provider: "mercadopago",
        mp_payment_id: String(mpPayment.id),
        payment_method: "pix",
        payment_type: "subscription_initial",
        status: mpPayment.status,
        status_detail: mpPayment.status_detail,
        amount: plan.price_brl,
        currency: plan.currency,
        pix_qr_code: qr?.qr_code ?? null,
        pix_qr_code_base64: qr?.qr_code_base64 ?? null,
        pix_expires_at: expiresAt.toISOString(),
        raw: JSON.parse(JSON.stringify(mpPayment)),
      } as never)
      .select()
      .single();
    if (insertErr) throw new Error(insertErr.message);

    return {
      paymentId: payment.id,
      mpPaymentId: String(mpPayment.id),
      status: mpPayment.status,
      qrCode: qr?.qr_code ?? null,
      qrCodeBase64: qr?.qr_code_base64 ?? null,
      ticketUrl: qr?.ticket_url ?? null,
      expiresAt: expiresAt.toISOString(),
      amount: plan.price_brl,
      planName: plan.product_name,
    };
  });

/* ------------------------------------------------------------------ */
/* Card subscription via Preapproval.                                  */
/* ------------------------------------------------------------------ */

export const createCardSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { pricingPlanId: string; returnUrl: string }) => ({
    pricingPlanId: PricingPlanId.parse(data.pricingPlanId),
    returnUrl: z.string().url().max(2000).parse(data.returnUrl),
  }))
  .handler(async ({ data, context }) => {
    const { userId, claims } = context;
    const email = (claims as { email?: string })?.email ?? `user-${userId}@meubarao.com`;
    const env = resolveEnv();
    const plan = await loadPricingPlan(data.pricingPlanId);
    const freq = cycleToFrequency(plan.billing_cycle);

    const preapproval = await mpFetch<{
      id: string;
      init_point: string;
      status: string;
      next_payment_date?: string;
    }>(env, "/preapproval", {
      method: "POST",
      body: {
        reason: plan.product_name,
        external_reference: `${userId}:${plan.pricing_plan_id}`,
        payer_email: email,
        back_url: data.returnUrl,
        auto_recurring: {
          frequency: freq.frequency,
          frequency_type: freq.frequency_type,
          transaction_amount: plan.price_brl,
          currency_id: plan.currency,
        },
        status: "pending",
      },
    });

    const { error: subErr } = await supabaseAdmin.from("subscriptions").insert({
      user_id: userId,
      provider: "mercadopago",
      pricing_plan_id: plan.pricing_plan_id,
      product_id: plan.product_id,
      mp_preapproval_id: preapproval.id,
      billing_cycle: plan.billing_cycle,
      status: preapproval.status,
      environment: env === "prod" ? "live" : "sandbox",
      next_payment_date: preapproval.next_payment_date ?? null,
    } as never);
    if (subErr) console.error("[MP] failed to insert pending subscription", subErr);

    return {
      preapprovalId: preapproval.id,
      checkoutUrl: preapproval.init_point,
      status: preapproval.status,
    };
  });

/* ------------------------------------------------------------------ */
/* Pix status poll.                                                    */
/* ------------------------------------------------------------------ */

export const getPaymentStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { paymentId: string }) =>
    z.object({ paymentId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: payment, error } = await supabaseAdmin
      .from("payments")
      .select("id, mp_payment_id, status, status_detail, paid_at, amount, pricing_plan_id")
      .eq("id", data.paymentId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!payment) throw new Error("Payment not found");

    if (payment.mp_payment_id && payment.status !== "approved") {
      try {
        const env = resolveEnv();
        const remote = await mpFetch<{ status: string; status_detail: string }>(
          env,
          `/v1/payments/${payment.mp_payment_id}`,
        );
        if (remote.status !== payment.status) {
          await supabaseAdmin
            .from("payments")
            .update({
              status: remote.status,
              status_detail: remote.status_detail,
              paid_at: remote.status === "approved" ? new Date().toISOString() : payment.paid_at,
            } as never)
            .eq("id", payment.id);
          payment.status = remote.status;
          payment.status_detail = remote.status_detail;
          if (remote.status === "approved") await recomputeEntitlement(userId);
        }
      } catch (e) {
        console.error("[MP] status refresh failed", e);
      }
    }

    return {
      status: payment.status,
      statusDetail: payment.status_detail,
      paidAt: payment.paid_at,
      amount: Number(payment.amount),
    };
  });

/* ------------------------------------------------------------------ */
/* Cancel preapproval.                                                  */
/* ------------------------------------------------------------------ */

export const cancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { subscriptionId: string }) =>
    z.object({ subscriptionId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: sub, error } = await supabaseAdmin
      .from("subscriptions")
      .select("id, mp_preapproval_id, user_id")
      .eq("id", data.subscriptionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!sub || sub.user_id !== userId) throw new Error("Subscription not found");
    if (!sub.mp_preapproval_id) throw new Error("Not a Mercado Pago subscription");

    const env = resolveEnv();
    await mpFetch(env, `/preapproval/${sub.mp_preapproval_id}`, {
      method: "PUT",
      body: { status: "cancelled" },
    });

    await supabaseAdmin
      .from("subscriptions")
      .update({ status: "cancelled", canceled_at: new Date().toISOString() } as never)
      .eq("id", sub.id);

    await recomputeEntitlement(userId);
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Current entitlement (used by the plans page).                       */
/* ------------------------------------------------------------------ */

export const getCurrentEntitlement = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    await recomputeEntitlement(userId, "client_refresh");
    return resolveUserEntitlement(userId);
  });
