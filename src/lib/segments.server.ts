// Server-only: rule-based user segmentation.
// Reads ai_usage_daily + payment history, writes user_segments rows.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type Segment =
  | "highly_engaged"
  | "dependent"
  | "inactive"
  | "high_cost"
  | "conversion_candidate"
  | "returning"
  | "churn_risk";

type UsageRow = {
  usage_date: string;
  message_count: number;
  total_tokens: number;
  est_cost_usd: number;
};

function daysBetween(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}

async function classifyUser(
  userId: string,
): Promise<{ segment: Segment; score: number; details: Record<string, unknown> }> {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const { data: usage } = await supabaseAdmin
    .from("ai_usage_daily")
    .select("usage_date, message_count, total_tokens, est_cost_usd")
    .eq("user_id", userId)
    .gte("usage_date", since)
    .order("usage_date", { ascending: false });
  const rows = (usage ?? []) as UsageRow[];

  const totalMsgs = rows.reduce((s, r) => s + (r.message_count ?? 0), 0);
  const totalCost = rows.reduce((s, r) => s + Number(r.est_cost_usd ?? 0), 0);
  const activeDays = rows.filter((r) => (r.message_count ?? 0) > 0).length;
  const lastActiveStr = rows.find((r) => (r.message_count ?? 0) > 0)?.usage_date;
  const daysSinceActive = lastActiveStr ? daysBetween(new Date(lastActiveStr), new Date()) : 999;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("plan, created_at")
    .eq("id", userId)
    .maybeSingle();
  const plan = (profile?.plan ?? "free").toLowerCase();
  const accountAgeDays = profile?.created_at
    ? daysBetween(new Date(profile.created_at), new Date())
    : 0;

  const { count: paidCount } = await supabaseAdmin
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "approved");

  const details = {
    totalMsgs,
    totalCostUsd: Number(totalCost.toFixed(4)),
    activeDays,
    daysSinceActive,
    plan,
    accountAgeDays,
    approvedPayments: paidCount ?? 0,
  };

  // Priority order: most actionable first
  if (totalCost >= 5) return { segment: "high_cost", score: totalCost, details };
  if (daysSinceActive > 14 && totalMsgs === 0)
    return { segment: "inactive", score: daysSinceActive, details };
  if (daysSinceActive > 7 && plan !== "free")
    return { segment: "churn_risk", score: daysSinceActive, details };
  if (activeDays >= 20 && plan !== "free")
    return { segment: "dependent", score: activeDays, details };
  if (activeDays >= 15) return { segment: "highly_engaged", score: activeDays, details };
  if (plan === "free" && totalMsgs >= 30)
    return { segment: "conversion_candidate", score: totalMsgs, details };
  if (daysSinceActive <= 3 && accountAgeDays > 14)
    return { segment: "returning", score: 100 - daysSinceActive, details };
  return { segment: "highly_engaged", score: Math.max(activeDays, totalMsgs / 10), details };
}

export async function recomputeSegments(userId?: string): Promise<{ updated: number }> {
  let userIds: string[] = [];
  if (userId) {
    userIds = [userId];
  } else {
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
    const { data } = await supabaseAdmin
      .from("ai_usage_daily")
      .select("user_id")
      .gte("usage_date", since);
    userIds = Array.from(new Set((data ?? []).map((r) => r.user_id as string)));
  }

  let updated = 0;
  for (const uid of userIds) {
    try {
      const { segment, score, details } = await classifyUser(uid);
      await supabaseAdmin.from("user_segments").insert({
        user_id: uid,
        segment,
        score,
        details: details as never,
      });
      updated++;
    } catch (err) {
      console.error("[segments] classify failed", { uid, err });
    }
  }
  console.log("[segments] recomputed", { updated });
  return { updated };
}

/**
 * Find users whose subscription grace period has expired and trigger
 * recompute (which will downgrade them to free if no active sub remains).
 */
export async function expireGracePeriods(): Promise<{ downgraded: number }> {
  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select("user_id, grace_period_until, status")
    .eq("status", "past_due")
    .not("grace_period_until", "is", null)
    .lt("grace_period_until", new Date().toISOString());
  const ids = Array.from(new Set((data ?? []).map((r) => r.user_id as string)));

  const { recomputeEntitlement } = await import("@/lib/entitlement.server");
  let downgraded = 0;
  for (const uid of ids) {
    try {
      await recomputeEntitlement(uid, "grace_period_expired");
      downgraded++;
    } catch (err) {
      console.error("[grace-expiry] failed", { uid, err });
    }
  }
  console.log("[grace-expiry] processed", { downgraded });
  return { downgraded };
}
