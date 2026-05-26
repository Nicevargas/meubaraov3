// Operational admin server functions.
// All require super_admin role and log every call to admin_actions_log.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getRequestHeader } from "@tanstack/react-start/server";
import { hashIp, lockUser, unlockUser, logAdminAction } from "@/lib/ops.server";

async function assertSuperAdmin(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role, disabled_at")
    .eq("user_id", userId);
  const active = (data ?? []).filter((r) => !r.disabled_at);
  if (!active.some((r) => r.role === "super_admin")) {
    throw new Error("Forbidden: super_admin only");
  }
  const { data: u } = await supabaseAdmin.auth.admin.getUserById(userId);
  return u?.user?.email ?? null;
}

async function reqContext() {
  const ipRaw = getRequestHeader("x-forwarded-for") ?? getRequestHeader("cf-connecting-ip") ?? "";
  const ua = getRequestHeader("user-agent") ?? "";
  const ipHash = await hashIp(ipRaw.split(",")[0]?.trim() || null);
  return { ipHash, ua };
}

// ── Overview dashboard metrics ────────────────────────────────────────────
export const getAdminOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const actorEmail = await assertSuperAdmin(context.userId);
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;
    const since30 = new Date(now.getTime() - 30 * day).toISOString();
    const since7 = new Date(now.getTime() - 7 * day).toISOString();
    const sinceYesterday = new Date(now.getTime() - day).toISOString();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

    const [
      totalUsersRes,
      premiumUsersRes,
      newUsers30Res,
      newUsers7Res,
      paid30Res,
      paid7Res,
      lockedRes,
      paymentsLastMonthRes,
      activeSubsRes,
      cancelledSubsMonthRes,
      activeSubsPrevMonthRes,
      usageMonthRes,
      heavyUsersRes,
      failedPayments24hRes,
      webhookFailures24hRes,
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .in("plan", ["premium", "elite"]),
      supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since30),
      supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since7),
      supabaseAdmin.from("payments").select("amount, status").gte("created_at", since30),
      supabaseAdmin
        .from("payments")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since7)
        .eq("status", "approved"),
      supabaseAdmin
        .from("account_locks")
        .select("id", { count: "exact", head: true })
        .is("unlocked_at", null),
      supabaseAdmin.from("payments").select("status, amount").gte("created_at", since30),
      supabaseAdmin
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabaseAdmin
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("status", "cancelled")
        .gte("canceled_at", startOfMonth),
      supabaseAdmin
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .lt("created_at", startOfMonth)
        .gte("created_at", startOfPrevMonth),
      supabaseAdmin
        .from("ai_usage_daily")
        .select("user_id, message_count, est_cost_usd, total_tokens")
        .gte("usage_date", startOfMonth.slice(0, 10)),
      supabaseAdmin
        .from("ai_usage_daily")
        .select("user_id, message_count, est_cost_usd")
        .gte("usage_date", since30.slice(0, 10))
        .order("est_cost_usd", { ascending: false })
        .limit(20),
      supabaseAdmin
        .from("payments")
        .select("id", { count: "exact", head: true })
        .in("status", ["rejected", "failed", "cancelled"])
        .gte("created_at", sinceYesterday),
      supabaseAdmin
        .from("webhook_events")
        .select("id", { count: "exact", head: true })
        .not("error_text", "is", null)
        .gte("created_at", sinceYesterday),
    ]);

    // Payment approval rate (last 30d)
    const payments30 = paymentsLastMonthRes.data ?? [];
    const approved30 = payments30.filter((p) => p.status === "approved");
    const approvalRate = payments30.length > 0 ? approved30.length / payments30.length : 0;

    // MRR estimate = sum of approved payments in current month, normalized to monthly
    const monthPayments = (paid30Res.data ?? []) as { amount: number | string; status: string }[];
    const mrr = approved30.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);

    // ARPU = mrr / active premium users
    const premium = premiumUsersRes.count ?? 0;
    const arpu = premium > 0 ? mrr / premium : 0;

    // Conversion: paid users (30d) / new signups (30d)
    const newUsers30 = newUsers30Res.count ?? 0;
    const paidUserIds = new Set(approved30.map((p: { status: string }) => p));
    const conversionRate = newUsers30 > 0 ? paidUserIds.size / newUsers30 : 0;

    // Churn: cancelled this month / active at start of month
    const activePrev = activeSubsPrevMonthRes.count ?? 0;
    const cancelledThisMonth = cancelledSubsMonthRes.count ?? 0;
    const churnRate = activePrev > 0 ? cancelledThisMonth / activePrev : 0;

    // Usage aggregates
    const usageRows = usageMonthRes.data ?? [];
    const totalMsgs = usageRows.reduce(
      (s: number, r: { message_count: number }) => s + r.message_count,
      0,
    );
    const totalCost = usageRows.reduce(
      (s: number, r: { est_cost_usd: number | string }) => s + Number(r.est_cost_usd ?? 0),
      0,
    );
    const uniqueActiveUsers = new Set(usageRows.map((r: { user_id: string }) => r.user_id)).size;
    const avgMsgsPerUser = uniqueActiveUsers > 0 ? totalMsgs / uniqueActiveUsers : 0;

    // Heavy users
    const heavyMap = new Map<string, { msgs: number; cost: number }>();
    (heavyUsersRes.data ?? []).forEach(
      (r: { user_id: string; message_count: number; est_cost_usd: number | string }) => {
        const cur = heavyMap.get(r.user_id) ?? { msgs: 0, cost: 0 };
        cur.msgs += r.message_count;
        cur.cost += Number(r.est_cost_usd ?? 0);
        heavyMap.set(r.user_id, cur);
      },
    );
    const heavyUsers = Array.from(heavyMap.entries())
      .sort((a, b) => b[1].cost - a[1].cost)
      .slice(0, 20)
      .map(([userId, v]) => ({ userId, messages: v.msgs, costUsd: v.cost }));

    await logAdminAction({
      actorId: context.userId,
      actorEmail,
      actionType: "view_admin_overview",
    });

    return {
      totals: {
        users: totalUsersRes.count ?? 0,
        premiumUsers: premium,
        newUsers30d: newUsers30,
        newUsers7d: newUsers7Res.count ?? 0,
        lockedUsers: lockedRes.count ?? 0,
        activeSubscriptions: activeSubsRes.count ?? 0,
      },
      revenue: {
        mrrBrl: mrr,
        arpuBrl: arpu,
        paymentsApproved7d: paid7Res.count ?? 0,
        approvalRate,
      },
      retention: {
        conversionRate,
        churnRate,
        cancelledThisMonth,
        activeAtMonthStart: activePrev,
      },
      usage: {
        messagesThisMonth: totalMsgs,
        estCostUsdThisMonth: totalCost,
        activeUsersThisMonth: uniqueActiveUsers,
        avgMessagesPerUser: avgMsgsPerUser,
      },
      alerts: {
        failedPayments24h: failedPayments24hRes.count ?? 0,
        webhookFailures24h: webhookFailures24hRes.count ?? 0,
      },
      heavyUsers,
    };
  });

// ── Failed payment alerts ─────────────────────────────────────────────────
export const getFailedPaymentAlerts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.userId);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabaseAdmin
      .from("payments")
      .select("id, user_id, amount, status, status_detail, payment_method, created_at")
      .in("status", ["rejected", "failed", "cancelled"])
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return { payments: data ?? [] };
  });

// ── Webhook failure alerts ────────────────────────────────────────────────
export const getWebhookFailureAlerts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.userId);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabaseAdmin
      .from("webhook_events")
      .select("id, event_type, error_text, created_at, processed_at")
      .not("error_text", "is", null)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return { events: data ?? [] };
  });

// ── User detail (operations view) ─────────────────────────────────────────
export const getUserDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.userId);
    const [profile, subs, history, locks, signals, usage] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("id", data.userId).maybeSingle(),
      supabaseAdmin
        .from("subscriptions")
        .select("*")
        .eq("user_id", data.userId)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("premium_history")
        .select("*")
        .eq("user_id", data.userId)
        .order("occurred_at", { ascending: false })
        .limit(50),
      supabaseAdmin
        .from("account_locks")
        .select("*")
        .eq("user_id", data.userId)
        .order("locked_at", { ascending: false })
        .limit(20),
      supabaseAdmin
        .from("abuse_signals")
        .select("*")
        .eq("user_id", data.userId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseAdmin
        .from("ai_usage_daily")
        .select("*")
        .eq("user_id", data.userId)
        .order("usage_date", { ascending: false })
        .limit(60),
    ]);
    return {
      profile: profile.data,
      subscriptions: subs.data ?? [],
      premiumHistory: history.data ?? [],
      locks: locks.data ?? [],
      abuseSignals: signals.data ?? [],
      usageDaily: usage.data ?? [],
    };
  });

// ── Admin actions: lock / unlock / set plan ───────────────────────────────
export const adminLockUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        reason: z.string().min(2).max(200),
        durationMinutes: z
          .number()
          .int()
          .min(1)
          .max(60 * 24 * 30)
          .nullable()
          .optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const actorEmail = await assertSuperAdmin(context.userId);
    const ctx = await reqContext();
    const expiresAt = data.durationMinutes
      ? new Date(Date.now() + data.durationMinutes * 60_000)
      : null;
    await lockUser({
      userId: data.userId,
      reason: data.reason,
      severity: expiresAt ? "temp" : "permanent",
      expiresAt,
      lockedBy: context.userId,
    });
    await logAdminAction({
      actorId: context.userId,
      actorEmail,
      actionType: "lock_user",
      targetType: "user",
      targetId: data.userId,
      ipHash: ctx.ipHash,
      userAgent: ctx.ua,
      payload: { reason: data.reason, durationMinutes: data.durationMinutes ?? null },
    });
    return { ok: true };
  });

export const adminUnlockUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const actorEmail = await assertSuperAdmin(context.userId);
    const ctx = await reqContext();
    await unlockUser(data.userId, context.userId);
    await logAdminAction({
      actorId: context.userId,
      actorEmail,
      actionType: "unlock_user",
      targetType: "user",
      targetId: data.userId,
      ipHash: ctx.ipHash,
      userAgent: ctx.ua,
    });
    return { ok: true };
  });

// Assign a subscription by tier (defaults to monthly). Tier "free" cancels active subs.
async function resolvePricingPlanIdByTier(
  tier: "premium" | "elite",
  billingCycle = "monthly",
): Promise<string> {
  const { data: prod } = await supabaseAdmin
    .from("products")
    .select("id, active")
    .eq("tier", tier)
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!prod) throw new Error(`No active product for tier "${tier}"`);
  const { data: pp } = await supabaseAdmin
    .from("pricing_plans")
    .select("id")
    .eq("product_id", prod.id)
    .eq("billing_cycle", billingCycle)
    .eq("active", true)
    .maybeSingle();
  if (!pp) throw new Error(`No active pricing_plan for tier ${tier} / cycle ${billingCycle}`);
  return pp.id;
}

export const adminSetPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        plan: z.enum(["free", "premium", "elite"]),
        reason: z.string().min(2).max(200),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const actorEmail = await assertSuperAdmin(context.userId);
    const ctx = await reqContext();

    if (data.plan === "free") {
      const { error: cancelErr } = await supabaseAdmin
        .from("subscriptions")
        .update({
          status: "canceled",
          canceled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as never)
        .eq("user_id", data.userId)
        .in("status", ["active", "authorized", "trialing", "past_due"]);
      if (cancelErr) throw new Error(cancelErr.message);
    } else {
      const pricingPlanId = await resolvePricingPlanIdByTier(data.plan);
      const { error } = await supabaseAdmin.rpc("admin_assign_subscription", {
        _user_id: data.userId,
        _pricing_plan_id: pricingPlanId,
        _expires_at: null as unknown as string,
        _reason: data.reason,
        _actor_id: context.userId,
      });
      if (error) throw new Error(error.message);
    }

    await logAdminAction({
      actorId: context.userId,
      actorEmail,
      actionType: "set_plan",
      targetType: "user",
      targetId: data.userId,
      ipHash: ctx.ipHash,
      userAgent: ctx.ua,
      payload: { plan: data.plan, reason: data.reason },
    });
    return { ok: true };
  });

// ── Kill switch read/write ────────────────────────────────────────────────
export const getKillSwitch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.userId);
    const { data } = await supabaseAdmin
      .from("app_settings")
      .select("value, updated_at, updated_by")
      .eq("key", "kill_switch")
      .maybeSingle();
    const v = (data?.value ?? {}) as {
      enabled?: boolean;
      scope?: "all" | "free_only";
      message?: string;
    };
    return {
      enabled: !!v.enabled,
      scope: (v.scope ?? "free_only") as "all" | "free_only",
      message: v.message ?? "",
      updatedAt: data?.updated_at ?? null,
      updatedBy: data?.updated_by ?? null,
    };
  });

export const adminSetKillSwitch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        enabled: z.boolean(),
        scope: z.enum(["all", "free_only"]).default("free_only"),
        message: z.string().max(280).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const actorEmail = await assertSuperAdmin(context.userId);
    const ctx = await reqContext();
    await supabaseAdmin.from("app_settings").upsert({
      key: "kill_switch",
      value: {
        enabled: data.enabled,
        scope: data.scope,
        message: data.message ?? "Service temporarily unavailable",
      } as never,
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
    });
    await logAdminAction({
      actorId: context.userId,
      actorEmail,
      actionType: "set_kill_switch",
      ipHash: ctx.ipHash,
      userAgent: ctx.ua,
      payload: { ...data },
    });
    return { ok: true };
  });
