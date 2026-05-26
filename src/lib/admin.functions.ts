import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

export type AdminRole = "super_admin" | "admin" | "moderator" | "support" | "finance" | "analytics";

async function loadRoles(supabase: SupabaseClient<Database>, userId: string): Promise<AdminRole[]> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role, disabled_at")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? [])
    .filter((r: { disabled_at: string | null }) => !r.disabled_at)
    .map((r: { role: string }) => r.role as AdminRole);
}

function assertAny(roles: AdminRole[], allowed: AdminRole[]) {
  if (roles.includes("super_admin")) return;
  if (roles.includes("admin")) return;
  if (!roles.some((r) => allowed.includes(r))) {
    throw new Error("Forbidden: insufficient admin role");
  }
}

function assertSuperAdmin(roles: AdminRole[]) {
  if (!roles.includes("super_admin")) {
    throw new Error("Forbidden: super_admin only");
  }
}

// ── Current admin's roles ────────────────────────────────────────────────
export const getMyAdminRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role, disabled_at, must_change_password");
    if (error) throw new Error(error.message);
    const active = (data ?? []).filter((r) => !r.disabled_at);
    const roles = active.map((r) => r.role as AdminRole);
    const mustChangePassword = active.some((r) => r.must_change_password);
    const allDisabled = (data?.length ?? 0) > 0 && active.length === 0;
    console.info("[admin-auth] role validation", {
      userId: context.userId,
      roles,
      mustChangePassword,
      allDisabled,
    });
    return { roles, isAdmin: roles.length > 0, mustChangePassword, allDisabled };
  });

// ── Overview ─────────────────────────────────────────────────────────────
export const getOverviewStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await loadRoles(context.supabase, context.userId);
    assertAny(roles, ["analytics", "support", "finance"]);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      totalUsers,
      premiumUsers,
      eliteUsers,
      msgsToday,
      activeUsers24h,
      activeSubs,
      recoveryEvents7d,
      memoryEvents,
      memoryIdentities,
      memoryExpiringSoon,
      ritualUsers,
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { head: true, count: "exact" }),
      supabaseAdmin
        .from("profiles")
        .select("id", { head: true, count: "exact" })
        .eq("plan", "premium"),
      supabaseAdmin
        .from("profiles")
        .select("id", { head: true, count: "exact" })
        .eq("plan", "elite"),
      supabaseAdmin
        .from("chat_messages")
        .select("id", { head: true, count: "exact" })
        .gte("created_at", today),
      supabaseAdmin
        .from("chat_messages")
        .select("user_id", { count: "exact" })
        .gte("created_at", dayAgo),
      supabaseAdmin
        .from("subscriptions")
        .select("id", { head: true, count: "exact" })
        .in("status", ["active", "trialing"]),
      supabaseAdmin
        .from("profiles")
        .select("id", { head: true, count: "exact" })
        .gte("chat_reset_at", weekAgo),
      supabaseAdmin.from("user_memory_events").select("id", { head: true, count: "exact" }),
      supabaseAdmin.from("user_identity_memory").select("user_id", { head: true, count: "exact" }),
      supabaseAdmin
        .from("user_memory_events")
        .select("id", { head: true, count: "exact" })
        .lt("expires_at", new Date(Date.now() + 24 * 3600_000).toISOString()),
      supabaseAdmin
        .from("emotional_assessments")
        .select("user_id", { head: true, count: "exact" })
        .not("completed_at", "is", null),
    ]);

    // Approx token usage today: estimate 80 tokens/message average × messages
    const estTokensToday = (msgsToday.count ?? 0) * 80;
    const estCostUsdToday = estTokensToday * 0.00000014; // deepseek ~$0.14/M input

    // Unique active users in 24h
    const uniqueIds = new Set((activeUsers24h.data ?? []).map((r) => r.user_id));

    // Stability score: 1 - (recoveries / max(1, totalUsers))
    const stability = Math.max(
      0,
      Math.min(1, 1 - (recoveryEvents7d.count ?? 0) / Math.max(1, totalUsers.count ?? 1)),
    );

    return {
      users: {
        total: totalUsers.count ?? 0,
        premium: premiumUsers.count ?? 0,
        elite: eliteUsers.count ?? 0,
        activeLast24h: uniqueIds.size,
      },
      conversations: {
        messagesToday: msgsToday.count ?? 0,
        recoveryEvents7d: recoveryEvents7d.count ?? 0,
      },
      billing: {
        activeSubscriptions: activeSubs.count ?? 0,
      },
      memory: {
        activeEvents: memoryEvents.count ?? 0,
        usersWithIdentity: memoryIdentities.count ?? 0,
        eventsExpiringSoon: memoryExpiringSoon.count ?? 0,
        usersWithRitual: ritualUsers.count ?? 0,
      },
      cost: {
        estTokensToday,
        estCostUsdToday,
      },
      health: {
        stabilityScore: stability,
      },
    };
  });

// ── Users management ─────────────────────────────────────────────────────
export const getUsersList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { page?: number; pageSize?: number; search?: string; plan?: string | null }) => d,
  )
  .handler(async ({ data, context }) => {
    const roles = await loadRoles(context.supabase, context.userId);
    assertAny(roles, ["support", "analytics", "finance"]);

    const page = Math.max(0, data.page ?? 0);
    const pageSize = Math.min(100, Math.max(1, data.pageSize ?? 25));
    const from = page * pageSize;
    const to = from + pageSize - 1;

    let q = supabaseAdmin
      .from("profiles")
      .select(
        "id, display_name, alias, plan, created_at, chat_reset_at, conversation_summary, summary_message_count",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (data.plan && data.plan !== "all") q = q.eq("plan", data.plan);
    if (data.search?.trim()) q = q.ilike("display_name", `%${data.search.trim()}%`);

    const { data: profiles, count, error } = await q;
    if (error) throw new Error(error.message);

    const ids = (profiles ?? []).map((p) => p.id);
    if (ids.length === 0) return { rows: [], total: count ?? 0 };

    // Augment with message counts + last activity in parallel
    const [{ data: msgAgg }, { data: ritualAgg }, { data: authUsers }] = await Promise.all([
      supabaseAdmin
        .from("chat_messages")
        .select("user_id, created_at")
        .in("user_id", ids)
        .order("created_at", { ascending: false })
        .limit(5000),
      supabaseAdmin
        .from("emotional_assessments")
        .select("user_id, intention, emotional_weight")
        .in("user_id", ids),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

    const msgCount = new Map<string, number>();
    const lastActivity = new Map<string, string>();
    for (const m of msgAgg ?? []) {
      msgCount.set(m.user_id, (msgCount.get(m.user_id) ?? 0) + 1);
      if (!lastActivity.has(m.user_id)) lastActivity.set(m.user_id, m.created_at);
    }
    const ritualMap = new Map<string, { intention: string | null; weight: number | null }>();
    for (const r of ritualAgg ?? [])
      ritualMap.set(r.user_id, { intention: r.intention, weight: r.emotional_weight });
    const emailMap = new Map<string, string>();
    for (const u of authUsers?.users ?? []) if (u.email) emailMap.set(u.id, u.email);

    const rows = (profiles ?? []).map((p) => ({
      id: p.id,
      displayName: p.display_name,
      alias: p.alias,
      email: emailMap.get(p.id) ?? null,
      plan: p.plan,
      createdAt: p.created_at,
      lastActivity: lastActivity.get(p.id) ?? null,
      messagesCount: msgCount.get(p.id) ?? 0,
      recoveryAt: p.chat_reset_at,
      hasSummary: !!p.conversation_summary,
      summaryMessageCount: p.summary_message_count ?? 0,
      ritualIntention: ritualMap.get(p.id)?.intention ?? null,
      emotionalWeight: ritualMap.get(p.id)?.weight ?? null,
    }));

    return { rows, total: count ?? 0 };
  });

// ── Billing ──────────────────────────────────────────────────────────────
export const getBillingStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await loadRoles(context.supabase, context.userId);
    assertSuperAdmin(roles);

    const { data: subs, error } = await supabaseAdmin
      .from("subscriptions")
      .select(
        "status, cancel_at_period_end, current_period_end, created_at, environment, billing_cycle, pricing_plan:pricing_plans(price_brl, billing_cycle, product:products(slug, tier))",
      );
    if (error) throw new Error(error.message);

    type Row = {
      status: string;
      cancel_at_period_end: boolean | null;
      current_period_end: string | null;
      billing_cycle: string | null;
      pricing_plan: {
        price_brl: number;
        billing_cycle: string;
        product: { slug: string; tier: string } | null;
      } | null;
    };
    const rows = (subs ?? []) as unknown as Row[];

    const byStatus: Record<string, number> = {};
    const byPlan: Record<string, number> = { premium: 0, elite: 0, other: 0 };
    let pendingRenewals = 0;
    const soon = Date.now() + 7 * 24 * 60 * 60 * 1000;
    for (const s of rows) {
      byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
      const tier = s.pricing_plan?.product?.tier ?? "other";
      const key = tier === "premium" ? "premium" : tier === "elite" ? "elite" : "other";
      byPlan[key] = (byPlan[key] ?? 0) + 1;
      if (
        s.current_period_end &&
        new Date(s.current_period_end).getTime() < soon &&
        !s.cancel_at_period_end
      )
        pendingRenewals++;
    }

    // MRR (BRL) — normalize pricing_plan.price to monthly equivalent.
    const cycleDivisor: Record<string, number> = {
      monthly: 1,
      quarterly: 3,
      semiannual: 6,
      annual: 12,
      lifetime: 24,
      trial: 1,
    };
    let mrrBrl = 0;
    for (const s of rows) {
      if (!["active", "trialing"].includes(s.status)) continue;
      const price = Number(s.pricing_plan?.price_brl ?? 0);
      const divisor = cycleDivisor[s.pricing_plan?.billing_cycle ?? "monthly"] ?? 1;
      mrrBrl += price / divisor;
    }

    return {
      counts: {
        active: byStatus["active"] ?? 0,
        trialing: byStatus["trialing"] ?? 0,
        pastDue: byStatus["past_due"] ?? 0,
        canceled: byStatus["canceled"] ?? 0,
        incomplete: (byStatus["incomplete"] ?? 0) + (byStatus["incomplete_expired"] ?? 0),
      },
      byPlan,
      pendingRenewals,
      estimatedMrrBrl: Math.round(mrrBrl * 100) / 100,
      total: rows.length,
    };
  });

// ── AI / Recovery / Memory / Emotional / Cost / System / Safety ─────────
export const getInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await loadRoles(context.supabase, context.userId);
    assertSuperAdmin(roles);

    const now = Date.now();
    const day = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const week = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const month = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [profiles, msgsWeek, recoveriesAll, assessmentsAll, memoriesAll, contactWeek] =
      await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select(
            "id, plan, chat_reset_at, conversation_summary, summary_message_count, created_at",
          ),
        supabaseAdmin
          .from("chat_messages")
          .select("user_id, role, created_at, content")
          .gte("created_at", week),
        supabaseAdmin
          .from("profiles")
          .select("id, chat_reset_at, plan")
          .not("chat_reset_at", "is", null),
        supabaseAdmin
          .from("emotional_assessments")
          .select(
            "user_id, intention, need, desire, emotional_weight, emotional_state, completed_at",
          ),
        // Memory v2: count active events + paused has no equivalent (decay-based now).
        supabaseAdmin.from("user_memory_events").select("user_id, importance, emotion, created_at"),
        supabaseAdmin
          .from("contact_messages")
          .select("contact_type, status, created_at")
          .gte("created_at", week),
      ]);

    const allProfiles = profiles.data ?? [];
    const totalUsers = allProfiles.length || 1;

    // Memory architecture
    const withSummary = allProfiles.filter((p) => p.conversation_summary).length;
    const avgSummaryMessages =
      allProfiles.reduce((a, p) => a + (p.summary_message_count ?? 0), 0) / totalUsers;

    // Recoveries trend
    const recoveriesByDay = new Map<string, number>();
    for (const r of recoveriesAll.data ?? []) {
      if (!r.chat_reset_at) continue;
      const d = new Date(r.chat_reset_at).toISOString().slice(0, 10);
      recoveriesByDay.set(d, (recoveriesByDay.get(d) ?? 0) + 1);
    }
    const recoveryTrend = [...recoveriesByDay.entries()]
      .sort()
      .slice(-14)
      .map(([date, count]) => ({ date, count }));
    const recoveries7d = (recoveriesAll.data ?? []).filter(
      (r) => r.chat_reset_at && r.chat_reset_at >= week,
    ).length;
    const recoveries30d = (recoveriesAll.data ?? []).filter(
      (r) => r.chat_reset_at && r.chat_reset_at >= month,
    ).length;

    // Messages volume per day + tokens estimate
    const msgsByDay = new Map<string, number>();
    const tokensByUser = new Map<string, number>();
    for (const m of msgsWeek.data ?? []) {
      const d = m.created_at.slice(0, 10);
      msgsByDay.set(d, (msgsByDay.get(d) ?? 0) + 1);
      const tokens = Math.ceil((m.content?.length ?? 0) / 4);
      tokensByUser.set(m.user_id, (tokensByUser.get(m.user_id) ?? 0) + tokens);
    }
    const msgTrend = [...msgsByDay.entries()].sort().map(([date, count]) => ({ date, count }));
    const topSpenders = [...tokensByUser.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([userId, tokens]) => ({ userId, tokens, estUsd: tokens * 0.00000014 }));
    const totalTokens7d = [...tokensByUser.values()].reduce((a, b) => a + b, 0);

    // Emotional analytics
    const intentions = new Map<string, number>();
    let weightSum = 0;
    let weightN = 0;
    for (const a of assessmentsAll.data ?? []) {
      if (a.intention) intentions.set(a.intention, (intentions.get(a.intention) ?? 0) + 1);
      if (typeof a.emotional_weight === "number") {
        weightSum += a.emotional_weight;
        weightN++;
      }
    }
    const intentionDist = [...intentions.entries()].map(([label, count]) => ({ label, count }));
    const avgEmotionalWeight = weightN > 0 ? weightSum / weightN : 0;

    // Active conversations: had message in last 24h
    const activeUsers24h = new Set(
      (msgsWeek.data ?? []).filter((m) => m.created_at >= day).map((m) => m.user_id),
    );

    // Safety signals — keyword scan (privacy: counts only, never content)
    const crisisRegex = /\b(suicid|me matar|sem sentido|quero morrer|kill myself|end it)\b/i;
    const obsessionRegex =
      /\b(sem voc\u00ea n\u00e3o|preciso de voc\u00ea sempre|s\u00f3 voc\u00ea|n\u00e3o consigo sem)\b/i;
    let crisisCount = 0;
    let obsessionCount = 0;
    const flaggedUsers = new Set<string>();
    for (const m of msgsWeek.data ?? []) {
      if (m.role !== "user") continue;
      if (crisisRegex.test(m.content ?? "")) {
        crisisCount++;
        flaggedUsers.add(m.user_id);
      }
      if (obsessionRegex.test(m.content ?? "")) {
        obsessionCount++;
        flaggedUsers.add(m.user_id);
      }
    }

    // Memories (crystallized)
    const totalMemories = memoriesAll.data?.length ?? 0;
    const pausedMemories = 0;

    // Contact / support
    const contactByType = new Map<string, number>();
    for (const c of contactWeek.data ?? [])
      contactByType.set(c.contact_type, (contactByType.get(c.contact_type) ?? 0) + 1);

    return {
      memory: {
        compressionRate: withSummary / totalUsers,
        avgSummaryMessages,
        totalMemories,
        pausedMemories,
      },
      recovery: {
        last7d: recoveries7d,
        last30d: recoveries30d,
        trend: recoveryTrend,
        successRate: 1 - recoveries7d / Math.max(1, activeUsers24h.size || totalUsers),
      },
      cost: {
        tokens7d: totalTokens7d,
        estUsd7d: totalTokens7d * 0.00000014,
        topSpenders,
        msgTrend,
      },
      emotional: {
        intentionDist,
        avgEmotionalWeight,
        activeUsers24h: activeUsers24h.size,
        assessmentsTotal: assessmentsAll.data?.length ?? 0,
      },
      safety: {
        crisisSignals7d: crisisCount,
        obsessionSignals7d: obsessionCount,
        flaggedUsers: flaggedUsers.size,
      },
      support: {
        contactByType: [...contactByType.entries()].map(([type, count]) => ({ type, count })),
      },
    };
  });

// ── System status (best-effort, marks estimated values) ─────────────────
export const getSystemStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await loadRoles(context.supabase, context.userId);
    assertSuperAdmin(roles);

    const start = Date.now();
    const ping = await supabaseAdmin.from("profiles").select("id", { head: true, count: "exact" });
    const dbLatency = Date.now() - start;

    const lovableKeyConfigured = !!process.env.LOVABLE_API_KEY;
    const mpSandboxConfigured = !!process.env.MERCADO_PAGO_ACCESS_TOKEN_SANDBOX;
    const mpProdConfigured = !!process.env.MERCADO_PAGO_ACCESS_TOKEN_PROD;
    const mpWebhookConfigured = !!process.env.MERCADO_PAGO_WEBHOOK_SECRET;

    return {
      db: { ok: !ping.error, latencyMs: dbLatency, totalProfiles: ping.count ?? 0 },
      ai: { provider: "lovable-ai-gateway", configured: lovableKeyConfigured },
      mercadopago: {
        sandboxConfigured: mpSandboxConfigured,
        prodConfigured: mpProdConfigured,
        webhookConfigured: mpWebhookConfigured,
      },
      auth: { ok: true },
      checkedAt: new Date().toISOString(),
    };
  });

// ── Recovery actions ─────────────────────────────────────────────────────
export const forceUserReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { targetUserId: string }) => d)
  .handler(async ({ data, context }) => {
    const roles = await loadRoles(context.supabase, context.userId);
    if (!roles.includes("super_admin")) throw new Error("Forbidden: super_admin only");

    if (!/^[0-9a-f-]{36}$/i.test(data.targetUserId)) throw new Error("Invalid target user id");

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ chat_reset_at: new Date().toISOString() })
      .eq("id", data.targetUserId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Conversation summary (privacy-safe inspection) ──────────────────────
export const getUserSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { targetUserId: string }) => d)
  .handler(async ({ data, context }) => {
    const roles = await loadRoles(context.supabase, context.userId);
    assertAny(roles, ["support", "analytics"]);
    if (!/^[0-9a-f-]{36}$/i.test(data.targetUserId)) throw new Error("Invalid id");

    const [{ data: profile }, { count: msgCount }, { data: assessment }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select(
          "display_name, plan, conversation_summary, summary_updated_at, summary_message_count, chat_reset_at, created_at",
        )
        .eq("id", data.targetUserId)
        .maybeSingle(),
      supabaseAdmin
        .from("chat_messages")
        .select("id", { head: true, count: "exact" })
        .eq("user_id", data.targetUserId),
      supabaseAdmin
        .from("emotional_assessments")
        .select("intention, need, desire, emotional_weight, emotional_state, completed_at")
        .eq("user_id", data.targetUserId)
        .maybeSingle(),
    ]);

    return { profile, messagesCount: msgCount ?? 0, assessment };
  });

// ── Raw conversation (super admin only, with disclaimer) ────────────────
export const getUserMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { targetUserId: string; limit?: number }) => d)
  .handler(async ({ data, context }) => {
    const roles = await loadRoles(context.supabase, context.userId);
    if (!roles.includes("super_admin")) throw new Error("Forbidden: super_admin only");
    if (!/^[0-9a-f-]{36}$/i.test(data.targetUserId)) throw new Error("Invalid id");

    const { data: msgs, error } = await supabaseAdmin
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("user_id", data.targetUserId)
      .order("created_at", { ascending: false })
      .limit(Math.min(200, Math.max(1, data.limit ?? 50)));
    if (error) throw new Error(error.message);
    return { messages: (msgs ?? []).reverse() };
  });
