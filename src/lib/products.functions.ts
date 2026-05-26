// Products / Pricing / Features API.
// Normalized layer on top of the legacy `plans` table.
// - Public: catalog grouped by product with auto-derived discount per cycle.
// - Admin (super_admin only): manage products, pricing plans, features, entitlements.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ──────────────────────────────────────────────────────────────────
// Shared
// ──────────────────────────────────────────────────────────────────
const CYCLES = ["monthly", "quarterly", "semiannual", "annual"] as const;
const CYCLE_MONTHS: Record<(typeof CYCLES)[number], number> = {
  monthly: 1,
  quarterly: 3,
  semiannual: 6,
  annual: 12,
};
const CycleSchema = z.enum(CYCLES);
const VisibilitySchema = z.enum(["public", "internal", "hidden"]);

async function requireSuper(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .is("disabled_at", null);
  const roles = (data ?? []).map((r) => r.role as string);
  if (!roles.includes("super_admin")) throw new Error("Forbidden: super_admin only");
}

type Cycle = (typeof CYCLES)[number];

export type PublicCatalog = {
  products: Array<{
    id: string;
    slug: string;
    name: string;
    description: string | null;
    features: string[];
    plans: Array<{
      id: string;
      billing_cycle: Cycle;
      price_brl: number;
      promo_price_brl: number | null;
      currency: string;
      months: number;
      per_month_brl: number;
      discount_pct: number;
    }>;
  }>;
};

// ──────────────────────────────────────────────────────────────────
// PUBLIC: catalog for the pricing page
// ──────────────────────────────────────────────────────────────────
export const listPublicCatalog = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicCatalog> => {
    const [{ data: products, error: pe }, { data: prices, error: pre }, { data: pf, error: fe }] =
      await Promise.all([
        supabaseAdmin
          .from("products")
          .select("id, slug, name, description, sort_order")
          .eq("active", true)
          .eq("visibility", "public")
          .order("sort_order", { ascending: true }),
        supabaseAdmin
          .from("pricing_plans")
          .select("id, product_id, billing_cycle, price_brl, promo_price_brl, currency, sort_order")
          .eq("active", true)
          .eq("visibility", "public"),
        supabaseAdmin
          .from("product_features")
          .select("product_id, feature_key, enabled, features(name)")
          .eq("enabled", true),
      ]);
    if (pe) throw new Error(pe.message);
    if (pre) throw new Error(pre.message);
    if (fe) throw new Error(fe.message);

    return {
      products: (products ?? []).map((prod) => {
        const productPrices = (prices ?? []).filter((p) => p.product_id === prod.id);
        const monthlyBase = productPrices.find((p) => p.billing_cycle === "monthly");
        const monthlyPerMonth = monthlyBase ? Number(monthlyBase.price_brl) : null;

        const plans = productPrices
          .filter((p) => (CYCLES as readonly string[]).includes(p.billing_cycle))
          .map((p) => {
            const cycle = p.billing_cycle as Cycle;
            const months = CYCLE_MONTHS[cycle];
            const price = Number(p.price_brl);
            const perMonth = price / months;
            const discount =
              monthlyPerMonth && months > 1 && monthlyPerMonth > 0
                ? Math.max(0, Math.round((1 - perMonth / monthlyPerMonth) * 100))
                : 0;
            return {
              id: p.id,
              billing_cycle: cycle,
              price_brl: price,
              promo_price_brl: p.promo_price_brl != null ? Number(p.promo_price_brl) : null,
              currency: p.currency,
              months,
              per_month_brl: perMonth,
              discount_pct: discount,
            };
          })
          .sort((a, b) => CYCLE_MONTHS[a.billing_cycle] - CYCLE_MONTHS[b.billing_cycle]);

        const features = (pf ?? [])
          .filter((f) => f.product_id === prod.id)
          .map((f) => {
            const feat = f.features as unknown as { name?: string } | null;
            return feat?.name ?? f.feature_key;
          });

        return {
          id: prod.id,
          slug: prod.slug,
          name: prod.name,
          description: prod.description,
          features,
          plans,
        };
      }),
    };
  },
);

// ──────────────────────────────────────────────────────────────────
// ADMIN: grouped catalog with revenue stats
// ──────────────────────────────────────────────────────────────────
export type AdminCatalog = {
  products: Array<{
    id: string;
    slug: string;
    name: string;
    tier: string;
    description: string | null;
    active: boolean;
    visibility: "public" | "internal" | "hidden";
    sort_order: number;
    plans: Array<{
      id: string;
      billing_cycle: string;
      price_brl: number;
      currency: string;
      active: boolean;
      visibility: "public" | "internal" | "hidden";
      mp_preapproval_plan_id: string | null;
      active_subs: number;
      mrr_brl: number;
      arr_brl: number;
      revenue_30d_brl: number;
    }>;
    feature_keys: string[];
  }>;
  totals: {
    mrr_brl: number;
    arr_brl: number;
    active_subs: number;
    churn_30d: number;
    revenue_30d_brl: number;
  };
  all_features: Array<{ key: string; name: string; category: string }>;
};

// Truth-source for "paid active subscriber". Mirrors resolve_user_entitlement:
// only confirmed billing states count. `pending` / `in_process` are
// pre-confirmation; `past_due` is gated by grace_period_until in the resolver
// and intentionally excluded from MRR. `paused`, `cancelled`, `canceled`,
// `expired`, `rejected` never count.
const ACTIVE_STATUSES = new Set(["active", "authorized", "trialing"]);

export const adminListCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminCatalog> => {
    await requireSuper(context.userId);

    const [
      { data: products, error: pe },
      { data: prices, error: pre },
      { data: subs },
      { data: pf },
      { data: features },
      { data: payments },
      { data: canceled30 },
    ] = await Promise.all([
      supabaseAdmin
        .from("products")
        .select("id, slug, name, tier, description, active, visibility, sort_order")
        .order("sort_order", { ascending: true }),
      supabaseAdmin
        .from("pricing_plans")
        .select(
          "id, product_id, billing_cycle, price_brl, currency, active, visibility, mp_preapproval_plan_id, sort_order",
        ),
      supabaseAdmin
        .from("subscriptions")
        .select("pricing_plan_id, product_id, status, canceled_at"),
      supabaseAdmin.from("product_features").select("product_id, feature_key, enabled"),
      supabaseAdmin.from("features").select("key, name, category").order("category"),
      supabaseAdmin
        .from("payments")
        .select("amount, pricing_plan_id, paid_at")
        .eq("status", "approved")
        .gte("paid_at", new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()),
      supabaseAdmin
        .from("subscriptions")
        .select("id")
        .in("status", ["cancelled", "canceled"])
        .gte("canceled_at", new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()),
    ]);
    if (pe) throw new Error(pe.message);
    if (pre) throw new Error(pre.message);

    const CYCLE_DIV: Record<string, number> = {
      monthly: 1,
      quarterly: 3,
      semiannual: 6,
      annual: 12,
      lifetime: 60,
    };

    const planStats = new Map<string, { active: number; mrr: number; revenue30: number }>();
    for (const pp of prices ?? []) planStats.set(pp.id, { active: 0, mrr: 0, revenue30: 0 });

    for (const s of subs ?? []) {
      if (!s.pricing_plan_id) continue;
      if (!ACTIVE_STATUSES.has(s.status)) continue;
      const row = planStats.get(s.pricing_plan_id);
      if (!row) continue;
      row.active += 1;
      const plan = (prices ?? []).find((x) => x.id === s.pricing_plan_id);
      if (plan) {
        const div = CYCLE_DIV[plan.billing_cycle] ?? 1;
        row.mrr += Number(plan.price_brl) / div;
      }
    }
    for (const pay of payments ?? []) {
      if (!pay.pricing_plan_id) continue;
      const row = planStats.get(pay.pricing_plan_id);
      if (!row) continue;
      row.revenue30 += Number(pay.amount);
    }

    const productList = (products ?? []).map((prod) => {
      const productPrices = (prices ?? [])
        .filter((p) => p.product_id === prod.id)
        .sort((a, b) => (CYCLE_DIV[a.billing_cycle] ?? 99) - (CYCLE_DIV[b.billing_cycle] ?? 99));
      return {
        id: prod.id,
        slug: prod.slug,
        name: prod.name,
        tier: (prod as { tier?: string }).tier ?? "free",
        description: prod.description,
        active: prod.active,
        visibility: prod.visibility as "public" | "internal" | "hidden",
        sort_order: prod.sort_order,
        plans: productPrices.map((p) => {
          const stats = planStats.get(p.id) ?? { active: 0, mrr: 0, revenue30: 0 };
          return {
            id: p.id,
            billing_cycle: p.billing_cycle,
            price_brl: Number(p.price_brl),
            currency: p.currency,
            active: p.active,
            visibility: p.visibility as "public" | "internal" | "hidden",
            mp_preapproval_plan_id: p.mp_preapproval_plan_id,
            active_subs: stats.active,
            mrr_brl: stats.mrr,
            arr_brl: stats.mrr * 12,
            revenue_30d_brl: stats.revenue30,
          };
        }),
        feature_keys: (pf ?? [])
          .filter((f) => f.product_id === prod.id && f.enabled)
          .map((f) => f.feature_key),
      };
    });

    let totalMrr = 0;
    let totalActive = 0;
    let totalRev30 = 0;
    for (const p of productList) {
      for (const pl of p.plans) {
        totalMrr += pl.mrr_brl;
        totalActive += pl.active_subs;
        totalRev30 += pl.revenue_30d_brl;
      }
    }

    return {
      products: productList,
      totals: {
        mrr_brl: totalMrr,
        arr_brl: totalMrr * 12,
        active_subs: totalActive,
        churn_30d: (canceled30 ?? []).length,
        revenue_30d_brl: totalRev30,
      },
      all_features: (features ?? []).map((f) => ({
        key: f.key,
        name: f.name,
        category: f.category,
      })),
    };
  });

// ──────────────────────────────────────────────────────────────────
// ADMIN: mutations
// ──────────────────────────────────────────────────────────────────
export const adminUpdateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().min(1).max(120).optional(),
        description: z.string().max(500).nullable().optional(),
        active: z.boolean().optional(),
        visibility: VisibilitySchema.optional(),
        sort_order: z.number().int().min(0).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireSuper(context.userId);
    const { id, ...patch } = data;
    const { error } = await supabaseAdmin.from("products").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpdatePricingPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        price_brl: z.number().min(0).max(1000000).optional(),
        promo_price_brl: z.number().min(0).max(1000000).nullable().optional(),
        active: z.boolean().optional(),
        visibility: VisibilitySchema.optional(),
        mp_preapproval_plan_id: z.string().max(255).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireSuper(context.userId);
    const { id, ...patch } = data;
    const { error } = await supabaseAdmin.from("pricing_plans").update(patch).eq("id", id);
    if (error) throw new Error(error.message);

    return { ok: true };
  });

export const adminToggleProductFeature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        product_id: z.string().uuid(),
        feature_key: z.string().min(1).max(80),
        enabled: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireSuper(context.userId);
    if (data.enabled) {
      const { error } = await supabaseAdmin
        .from("product_features")
        .upsert(
          { product_id: data.product_id, feature_key: data.feature_key, enabled: true },
          { onConflict: "product_id,feature_key" },
        );
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("product_features")
        .delete()
        .eq("product_id", data.product_id)
        .eq("feature_key", data.feature_key);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// ──────────────────────────────────────────────────────────────────
// Feature gate helper (callable from any authenticated server fn)
// ──────────────────────────────────────────────────────────────────
export async function userHasFeature(userId: string, featureKey: string): Promise<boolean> {
  const { data, error } = await (
    supabaseAdmin as never as {
      rpc: (
        name: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: unknown }>;
    }
  ).rpc("user_has_feature", { _user_id: userId, _feature_key: featureKey });
  if (error) {
    console.error("[products] user_has_feature failed", error);
    return false;
  }
  return Boolean(data);
}
