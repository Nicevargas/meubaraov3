// Server-only: retention engine + ops jobs.
// Idempotent helpers that build the reengagement queue, retry failed payments,
// detect inactive users, clean stale data, and produce daily ops snapshots.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function dayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

async function enqueue(args: {
  userId: string;
  reason: string;
  channel?: string;
  dedupeKey: string;
  payload?: Record<string, unknown>;
  scheduledAt?: Date;
}) {
  // ON CONFLICT (dedupe_key) DO NOTHING via upsert ignoreDuplicates
  const { error } = await supabaseAdmin.from("reengagement_queue").upsert(
    {
      user_id: args.userId,
      reason: args.reason,
      channel: args.channel ?? "email",
      dedupe_key: args.dedupeKey,
      payload: (args.payload ?? {}) as never,
      scheduled_at: (args.scheduledAt ?? new Date()).toISOString(),
      status: "pending",
    },
    { onConflict: "dedupe_key", ignoreDuplicates: true },
  );
  if (error) console.error("[retention:enqueue]", error.message);
}

// ── 1. Failed payment retry ──────────────────────────────────────────────
// Looks at recent failed/rejected payments, queues a recovery message,
// and logs the attempt. Caps at 3 attempts/payment.
export async function retryFailedPayments(): Promise<{ queued: number }> {
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data: failed } = await supabaseAdmin
    .from("payments")
    .select("id, user_id, status, created_at, plan_id")
    .in("status", ["rejected", "cancelled", "in_process"])
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(200);

  let queued = 0;
  for (const p of failed ?? []) {
    const { count } = await supabaseAdmin
      .from("payment_retry_attempts")
      .select("id", { count: "exact", head: true })
      .eq("payment_id", p.id);
    if ((count ?? 0) >= 3) continue;

    await supabaseAdmin.from("payment_retry_attempts").insert({
      payment_id: p.id,
      user_id: p.user_id,
      attempt_number: (count ?? 0) + 1,
      status: "queued",
      details: { reason: "auto_retry", original_status: p.status } as never,
    });

    await enqueue({
      userId: p.user_id,
      reason: "payment_failed",
      dedupeKey: `payment_failed:${p.id}:${(count ?? 0) + 1}`,
      payload: { payment_id: p.id, plan_id: p.plan_id, original_status: p.status },
    });
    queued++;
  }
  console.log("[retention:retry] queued", { queued });
  return { queued };
}

// ── 2. Inactive user detection ───────────────────────────────────────────
// Users with no chat activity in N days get a re-engagement message.
// Thresholds:
//  - 7d inactive → soft reminder
//  - 30d inactive → comeback message
//  - paid users in churn risk (7d inactive) get premium_renewal nudge
export async function detectInactiveUsers(): Promise<{ queued: number }> {
  const today = dayKey();
  const since7 = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);

  // Pull active users in last 7 days (still engaged → skip)
  const { data: recent } = await supabaseAdmin
    .from("ai_usage_daily")
    .select("user_id")
    .gte("usage_date", since7);
  const activeIds = new Set((recent ?? []).map((r) => r.user_id as string));

  // Candidate pool: profiles older than 7d
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, plan, created_at")
    .lt("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString())
    .limit(1000);

  let queued = 0;
  for (const p of profiles ?? []) {
    if (activeIds.has(p.id)) continue;

    const reason = (p.plan ?? "free") !== "free" ? "churn_risk" : "inactive";
    await enqueue({
      userId: p.id,
      reason,
      dedupeKey: `${reason}:${p.id}:${today}`,
      payload: { plan: p.plan },
    });
    queued++;
  }
  console.log("[retention:inactive] queued", { queued });
  return { queued };
}

// ── 3. Stale session cleanup ─────────────────────────────────────────────
// Removes guest_sessions older than 30 days and old rate_limit_buckets.
export async function cleanupStaleSessions(): Promise<{ guests: number; buckets: number }> {
  const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const bucketCutoff = new Date(Date.now() - 2 * 86_400_000).toISOString();

  const { count: guests } = await supabaseAdmin
    .from("guest_sessions")
    .delete({ count: "exact" })
    .lt("last_activity", cutoff);

  const { count: buckets } = await supabaseAdmin
    .from("rate_limit_buckets")
    .delete({ count: "exact" })
    .lt("updated_at", bucketCutoff);

  console.log("[retention:cleanup]", { guests, buckets });
  return { guests: guests ?? 0, buckets: buckets ?? 0 };
}

// ── 4. Daily ops report snapshot ─────────────────────────────────────────
export async function generateDailyOpsReport(): Promise<{ report_date: string }> {
  const yesterday = new Date(Date.now() - 86_400_000);
  const day = dayKey(yesterday);
  const dayStart = `${day}T00:00:00Z`;
  const dayEnd = `${day}T23:59:59Z`;

  const [signups, usage, paid, failedPay, webhookErr, activeSubs] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd),
    supabaseAdmin
      .from("ai_usage_daily")
      .select("user_id, message_count, est_cost_usd")
      .eq("usage_date", day),
    supabaseAdmin
      .from("payments")
      .select("amount", { count: "exact" })
      .eq("status", "approved")
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd),
    supabaseAdmin
      .from("payments")
      .select("id", { count: "exact", head: true })
      .in("status", ["rejected", "cancelled"])
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd),
    supabaseAdmin
      .from("webhook_events")
      .select("id", { count: "exact", head: true })
      .not("error_text", "is", null)
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd),
    supabaseAdmin
      .from("subscriptions")
      .select("id, pricing_plan_id", { count: "exact" })
      .eq("status", "active"),
  ]);

  const usageRows = (usage.data ?? []) as {
    user_id: string;
    message_count: number;
    est_cost_usd: number;
  }[];
  const activeUsers = new Set(usageRows.map((r) => r.user_id)).size;
  const messages = usageRows.reduce((s, r) => s + (r.message_count ?? 0), 0);
  const aiCost = usageRows.reduce((s, r) => s + Number(r.est_cost_usd ?? 0), 0);
  const approvedAmount = (paid.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0);

  // MRR proxy: sum of active subs × their pricing_plan price, normalized to monthly.
  const planIds = Array.from(
    new Set(
      ((activeSubs.data ?? []) as { pricing_plan_id: string | null }[])
        .map((s) => s.pricing_plan_id)
        .filter(Boolean) as string[],
    ),
  );
  const { data: pricingRows } = planIds.length
    ? await supabaseAdmin
        .from("pricing_plans")
        .select("id, price_brl, billing_cycle")
        .in("id", planIds)
    : { data: [] as Array<{ id: string; price_brl: number; billing_cycle: string }> };
  const planMap = new Map((pricingRows ?? []).map((p) => [p.id as string, p]));
  const cycleDivisor: Record<string, number> = {
    monthly: 1,
    quarterly: 3,
    semiannual: 6,
    annual: 12,
    lifetime: 24,
    trial: 1,
  };
  const mrr = ((activeSubs.data ?? []) as { pricing_plan_id: string | null }[]).reduce((s, sub) => {
    const pp = sub.pricing_plan_id ? planMap.get(sub.pricing_plan_id) : null;
    if (!pp) return s;
    const divisor = cycleDivisor[pp.billing_cycle] ?? 1;
    return s + Number(pp.price_brl) / divisor;
  }, 0);

  const row = {
    report_date: day,
    new_signups: signups.count ?? 0,
    active_users: activeUsers,
    messages_sent: messages,
    ai_cost_usd: Number(aiCost.toFixed(4)),
    payments_approved: paid.count ?? 0,
    payments_failed: failedPay.count ?? 0,
    webhook_errors: webhookErr.count ?? 0,
    mrr_brl: Number(mrr.toFixed(2)),
    active_subscriptions: activeSubs.count ?? 0,
    details: { approved_amount_brl: Number(approvedAmount.toFixed(2)) } as never,
  };

  await supabaseAdmin.from("daily_ops_reports").upsert(row, { onConflict: "report_date" });
  console.log("[retention:daily-report]", row);
  return { report_date: day };
}

// ── 5. Orphan payment reconciliation ─────────────────────────────────────
// Approved payments without a matching active subscription → flag for review.
// Conversely, active subs without recent payments → log gap.
export async function reconcileOrphanPayments(): Promise<{ orphans: number; subGaps: number }> {
  const since = new Date(Date.now() - 60 * 86_400_000).toISOString();

  const { data: approved } = await supabaseAdmin
    .from("payments")
    .select("id, user_id, plan_id, subscription_id, created_at, amount")
    .eq("status", "approved")
    .gte("created_at", since)
    .is("subscription_id", null)
    .limit(500);

  let orphans = 0;
  for (const p of approved ?? []) {
    // Check if user has an active sub for that plan
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("id")
      .eq("user_id", p.user_id)
      .eq("status", "active")
      .maybeSingle();
    if (sub?.id) continue; // not orphan, can be auto-attached later

    await supabaseAdmin.from("admin_actions_log").insert({
      actor_id: "00000000-0000-0000-0000-000000000000",
      action_type: "orphan_payment_detected",
      target_type: "payment",
      target_id: p.id,
      payload: { user_id: p.user_id, amount: p.amount, created_at: p.created_at } as never,
      status: "success",
    });
    orphans++;
  }

  // Sub gaps: active subs with no payment in last 35 days
  const cutoff35 = new Date(Date.now() - 35 * 86_400_000).toISOString();
  const { data: activeSubs } = await supabaseAdmin
    .from("subscriptions")
    .select("id, user_id, current_period_end")
    .eq("status", "active")
    .limit(500);

  let subGaps = 0;
  for (const s of activeSubs ?? []) {
    const { count } = await supabaseAdmin
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", s.user_id)
      .eq("status", "approved")
      .gte("created_at", cutoff35);
    if ((count ?? 0) === 0) {
      await supabaseAdmin.from("admin_actions_log").insert({
        actor_id: "00000000-0000-0000-0000-000000000000",
        action_type: "subscription_payment_gap",
        target_type: "subscription",
        target_id: s.id,
        payload: { user_id: s.user_id, period_end: s.current_period_end } as never,
        status: "success",
      });
      subGaps++;
    }
  }

  console.log("[retention:reconcile]", { orphans, subGaps });
  return { orphans, subGaps };
}
