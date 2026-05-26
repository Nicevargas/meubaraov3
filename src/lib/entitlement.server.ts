// Server-only entitlement resolver.
// Single source of truth: subscriptions → pricing_plans → products.
// profiles.plan is a CACHED display mirror only — never read for access decisions.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { recordPremiumTransition } from "@/lib/ops.server";
import { wipeUserMemory } from "@/lib/memory.server";

export type Tier = "free" | "premium" | "elite";
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type EntitlementLimits = {
  daily_message_limit: number | null;
  monthly_token_limit: number | null;
  max_conversations: number | null;
  memory_context_size: number | null;
  ai_priority: number;
  soft_limit_pct: number;
};

export type UserEntitlement = {
  user_id: string;
  plan: string;
  plan_id: string | null;
  plan_name: string | null;
  tier: string;
  source: "billing_subscription" | "billing_grace" | "default" | "past_due_expired" | string;
  status: "active" | "grace" | "revoked" | string;
  has_premium_access: boolean;
  limits: EntitlementLimits;
  features: {
    premium: Record<string, JsonValue>;
    vip: Record<string, JsonValue>;
  };
  subscription_version: number;
  subscription_synced_at: string;
};

const DEFAULT_LIMITS: EntitlementLimits = {
  daily_message_limit: null,
  monthly_token_limit: null,
  max_conversations: null,
  memory_context_size: null,
  ai_priority: 0,
  soft_limit_pct: 80,
};

function normalize(
  userId: string,
  raw: Partial<UserEntitlement> | null | undefined,
): UserEntitlement {
  const plan = String(raw?.plan ?? "free").toLowerCase();
  return {
    user_id: raw?.user_id ?? userId,
    plan,
    plan_id: (raw as { plan_id?: string | null } | null | undefined)?.plan_id ?? null,
    plan_name: (raw as { plan_name?: string | null } | null | undefined)?.plan_name ?? null,
    tier: String(raw?.tier ?? plan),
    source: raw?.source ?? "default",
    status: raw?.status ?? (plan === "free" ? "revoked" : "active"),
    has_premium_access: Boolean(raw?.has_premium_access ?? plan !== "free"),
    limits: { ...DEFAULT_LIMITS, ...(raw?.limits ?? {}) },
    features: {
      premium: raw?.features?.premium ?? {},
      vip: raw?.features?.vip ?? {},
    },
    subscription_version: Number(raw?.subscription_version ?? 0),
    subscription_synced_at: raw?.subscription_synced_at ?? new Date().toISOString(),
  };
}

/**
 * Single source of truth for plan/permission state. Always derives from
 * `subscriptions → pricing_plans → products`. Free is virtual (no subscription).
 * Throws if the chain is broken — never silently downgrades.
 */
export async function resolveUserEntitlement(userId: string): Promise<UserEntitlement> {
  const { data, error } = await supabaseAdmin.rpc("resolve_user_entitlement", {
    _user_id: userId,
  });
  if (error) {
    console.error("[entitlement:resolver] rpc failed", { userId, error });
    throw new Error(error.message);
  }
  return normalize(userId, data as Partial<UserEntitlement> | null);
}

export async function resolveUserEntitlements(userId: string): Promise<UserEntitlement> {
  return resolveUserEntitlement(userId);
}

export async function getUserPlan(userId: string): Promise<string> {
  return (await resolveUserEntitlement(userId)).tier;
}

export async function getUserLimits(userId: string): Promise<EntitlementLimits> {
  return (await resolveUserEntitlement(userId)).limits;
}

export async function hasPremiumAccess(userId: string): Promise<boolean> {
  return (await resolveUserEntitlement(userId)).has_premium_access;
}

export async function hasFeature(userId: string, featureKey: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc("user_has_feature", {
    _user_id: userId,
    _feature_key: featureKey,
  });
  if (error) {
    console.error("[entitlement:hasFeature] rpc failed", { userId, featureKey, error });
    return false;
  }
  return Boolean(data);
}

/**
 * Re-mirror cached `profiles.plan` and bump `subscription_version` if the
 * resolved tier moved. The resolver is the truth — this only updates the
 * display cache and records a transition row.
 */
export async function recomputeEntitlement(userId: string, reason = "recompute"): Promise<Tier> {
  const { data: prevProfile } = await supabaseAdmin
    .from("profiles")
    .select("plan, subscription_version")
    .eq("id", userId)
    .maybeSingle();
  const prevPlan = (prevProfile?.plan ?? "free") as Tier;

  const entitlement = await resolveUserEntitlement(userId);
  const tier = String(entitlement.tier ?? "free").toLowerCase();
  const nextPlan = (tier === "elite" ? "elite" : tier === "premium" ? "premium" : "free") as Tier;

  if (prevPlan !== nextPlan) {
    await supabaseAdmin
      .from("profiles")
      .update({
        plan: nextPlan,
        subscription_version: (prevProfile?.subscription_version ?? 0) + 1,
        subscription_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", userId);

    // Downgrade to free → wipe all persistent memory layers (premium-only feature).
    if (nextPlan === "free" && prevPlan !== "free") {
      try {
        await wipeUserMemory(userId);
        console.info("[entitlement:downgrade] memory layers wiped", { userId });
      } catch (err) {
        console.error("[entitlement:downgrade] memory wipe threw", { userId, err });
      }
    }

    await recordPremiumTransition({
      userId,
      planId: entitlement.plan_id,
      planCode: null,
      status: entitlement.status === "grace" ? "grace" : nextPlan === "free" ? "revoked" : "active",
      actor: "system",
      reason,
      details: {
        previous: prevPlan,
        next: nextPlan,
        source: entitlement.source,
        version: entitlement.subscription_version,
      },
    });
  }

  console.info("[entitlement:recompute]", {
    userId,
    previous: prevPlan,
    next: nextPlan,
    source: entitlement.source,
    status: entitlement.status,
  });

  return nextPlan;
}
