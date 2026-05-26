// Advanced admin queries: paginated logs, segments, heatmap, bulk actions.
// All require super_admin.
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

// ── Paginated webhook events ──────────────────────────────────────────────
export const listWebhookEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        page: z.number().int().min(0).default(0),
        pageSize: z.number().int().min(1).max(100).default(25),
        onlyFailures: z.boolean().default(false),
        eventType: z.string().max(64).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.userId);
    const from = data.page * data.pageSize;
    const to = from + data.pageSize - 1;
    let q = supabaseAdmin
      .from("webhook_events")
      .select("id, provider, event_type, external_id, error_text, processed_at, created_at", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (data.onlyFailures) q = q.not("error_text", "is", null);
    if (data.eventType) q = q.eq("event_type", data.eventType);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0 };
  });

// ── Paginated admin actions log ───────────────────────────────────────────
export const listAdminActions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        page: z.number().int().min(0).default(0),
        pageSize: z.number().int().min(1).max(100).default(25),
        actorEmail: z.string().max(255).optional(),
        actionType: z.string().max(64).optional(),
        status: z.enum(["success", "error", "all"]).default("all"),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.userId);
    const from = data.page * data.pageSize;
    const to = from + data.pageSize - 1;
    let q = supabaseAdmin
      .from("admin_actions_log")
      .select(
        "id, actor_id, actor_email, action_type, target_type, target_id, status, error_text, payload, occurred_at",
        { count: "exact" },
      )
      .order("occurred_at", { ascending: false })
      .range(from, to);
    if (data.actorEmail) q = q.ilike("actor_email", `%${data.actorEmail}%`);
    if (data.actionType) q = q.eq("action_type", data.actionType);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0 };
  });

// ── User segments overview + listing ──────────────────────────────────────
export const listSegments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        segment: z.string().max(64).optional(),
        page: z.number().int().min(0).default(0),
        pageSize: z.number().int().min(1).max(100).default(25),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.userId);

    // Aggregate counts per segment (latest classification per user via DISTINCT not trivial; use most-recent rows window)
    const { data: allRows } = await supabaseAdmin
      .from("user_segments")
      .select("user_id, segment, score, computed_at")
      .order("computed_at", { ascending: false })
      .limit(5000);

    const latestByUser = new Map<string, { segment: string; score: number; computed_at: string }>();
    for (const r of allRows ?? []) {
      if (!latestByUser.has(r.user_id)) {
        latestByUser.set(r.user_id, {
          segment: r.segment,
          score: Number(r.score ?? 0),
          computed_at: r.computed_at,
        });
      }
    }
    const counts = new Map<string, number>();
    for (const v of latestByUser.values()) counts.set(v.segment, (counts.get(v.segment) ?? 0) + 1);
    const segments = Array.from(counts.entries())
      .map(([segment, count]) => ({ segment, count }))
      .sort((a, b) => b.count - a.count);

    // Build paginated user list filtered by segment
    let users: Array<{
      userId: string;
      segment: string;
      score: number;
      computedAt: string;
      displayName: string | null;
      plan: string;
    }> = [];
    if (data.segment) {
      const matching = Array.from(latestByUser.entries())
        .filter(([, v]) => v.segment === data.segment)
        .sort((a, b) => b[1].score - a[1].score);
      const from = data.page * data.pageSize;
      const slice = matching.slice(from, from + data.pageSize);
      const ids = slice.map(([uid]) => uid);
      const { data: profiles } = ids.length
        ? await supabaseAdmin.from("profiles").select("id, display_name, plan").in("id", ids)
        : { data: [] as { id: string; display_name: string | null; plan: string }[] };
      const profMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      users = slice.map(([uid, v]) => ({
        userId: uid,
        segment: v.segment,
        score: v.score,
        computedAt: v.computed_at,
        displayName: profMap.get(uid)?.display_name ?? null,
        plan: profMap.get(uid)?.plan ?? "free",
      }));
      return { segments, users, total: matching.length };
    }

    return { segments, users, total: 0 };
  });

// ── Usage heatmap: messages per hour for last 7 days ──────────────────────
export const getUsageHeatmap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.userId);
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabaseAdmin
      .from("chat_messages")
      .select("created_at")
      .gte("created_at", since)
      .limit(50000);
    if (error) throw new Error(error.message);
    // 7 days × 24 hours grid; row 0 = oldest day
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    const startDay = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / (24 * 60 * 60 * 1000));
    for (const m of data ?? []) {
      const t = new Date(m.created_at).getTime();
      const dayIdx = Math.floor(t / (24 * 60 * 60 * 1000)) - startDay;
      if (dayIdx < 0 || dayIdx > 6) continue;
      const hour = new Date(m.created_at).getUTCHours();
      grid[dayIdx][hour] += 1;
    }
    const max = grid.flat().reduce((a, b) => Math.max(a, b), 0);
    return { grid, max, totalMessages: (data ?? []).length };
  });

// ── User search for operational admin panel ────────────────────────────────
// Simplified surface: status (active|blocked), plan, role. No internal/test/
// suspended filters surfaced to the panel — those concepts were removed.
export const searchUsersAdvanced = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        page: z.number().int().min(0).default(0),
        pageSize: z.number().int().min(1).max(100).default(25),
        search: z.string().max(255).optional(),
        plan: z.enum(["all", "free", "premium", "elite"]).default("all"),
        status: z.enum(["all", "active", "blocked"]).default("all"),
        role: z.enum(["all", "user", "super_admin"]).default("all"),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.userId);

    let restrictIds: string[] | null = null;
    const search = data.search?.trim();

    if (search && search.includes("@")) {
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      const matches = (authUsers?.users ?? []).filter((u) =>
        u.email?.toLowerCase().includes(search.toLowerCase()),
      );
      restrictIds = matches.map((u) => u.id);
      if (restrictIds.length === 0) return { rows: [], total: 0 };
    }

    // Status filter (blocked = has active account_locks row)
    if (data.status === "blocked") {
      const { data: lockRows } = await supabaseAdmin
        .from("account_locks")
        .select("user_id, expires_at")
        .is("unlocked_at", null);
      const now = Date.now();
      const lockedIds = Array.from(
        new Set(
          (lockRows ?? [])
            .filter((r) => !r.expires_at || new Date(r.expires_at).getTime() > now)
            .map((r) => r.user_id),
        ),
      );
      restrictIds = restrictIds ? restrictIds.filter((id) => lockedIds.includes(id)) : lockedIds;
      if (restrictIds.length === 0) return { rows: [], total: 0 };
    } else if (data.status === "active") {
      const { data: lockRows } = await supabaseAdmin
        .from("account_locks")
        .select("user_id, expires_at")
        .is("unlocked_at", null);
      const now = Date.now();
      const blockedSet = new Set(
        (lockRows ?? [])
          .filter((r) => !r.expires_at || new Date(r.expires_at).getTime() > now)
          .map((r) => r.user_id),
      );
      if (restrictIds) restrictIds = restrictIds.filter((id) => !blockedSet.has(id));
      // else: handled post-query
    }

    // ALWAYS exclude any staff/operational account. The Users page lists
    // real customer accounts only. Staff accounts live in the
    // Administrators section. Any user with an active row in user_roles
    // for any non-"user" role is considered staff and hidden here.
    // The legacy `data.role` input is accepted for backwards compat and
    // intentionally ignored.
    void data.role;
    const STAFF_ROLES = [
      "super_admin",
      "admin",
      "moderator",
      "support",
      "finance",
      "analytics",
    ] as const;
    const { data: staffRows } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .in("role", STAFF_ROLES)
      .is("disabled_at", null);
    const staffIds = Array.from(new Set((staffRows ?? []).map((r) => r.user_id)));
    const staffSet = new Set(staffIds);
    if (restrictIds) {
      restrictIds = restrictIds.filter((id) => !staffSet.has(id));
      if (restrictIds.length === 0) return { rows: [], total: 0 };
    }

    const from = data.page * data.pageSize;
    const to = from + data.pageSize - 1;

    let q = supabaseAdmin
      .from("profiles")
      .select("id, display_name, alias, plan, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (data.plan !== "all") q = q.eq("plan", data.plan);
    if (restrictIds) q = q.in("id", restrictIds);
    if (search && !search.includes("@")) q = q.ilike("display_name", `%${search}%`);
    const { data: profiles, count, error } = await q;
    if (error) throw new Error(error.message);

    const ids = (profiles ?? []).map((p) => p.id);
    if (ids.length === 0) return { rows: [], total: count ?? 0 };

    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const [emailsRes, locksRes, subsRes, rolesRes, usageRes] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      supabaseAdmin
        .from("account_locks")
        .select("user_id, expires_at, reason")
        .is("unlocked_at", null)
        .in("user_id", ids),
      supabaseAdmin
        .from("subscriptions")
        .select("user_id, status, billing_cycle, current_period_end")
        .in("user_id", ids)
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("user_roles").select("user_id, role, disabled_at").in("user_id", ids),
      supabaseAdmin
        .from("ai_usage_daily")
        .select("user_id, est_cost_usd")
        .in("user_id", ids)
        .gte("usage_date", since30),
    ]);

    const emailMap = new Map<string, string>();
    const lastSignInMap = new Map<string, string | null>();
    for (const u of emailsRes.data?.users ?? []) {
      if (ids.includes(u.id)) {
        if (u.email) emailMap.set(u.id, u.email);
        lastSignInMap.set(u.id, u.last_sign_in_at ?? null);
      }
    }
    const now = Date.now();
    const lockMap = new Map<string, { expires_at: string | null; reason: string }>();
    for (const l of locksRes.data ?? []) {
      if (l.expires_at && new Date(l.expires_at).getTime() <= now) continue;
      lockMap.set(l.user_id, { expires_at: l.expires_at, reason: l.reason });
    }
    const subMap = new Map<string, { status: string; billing_cycle: string | null }>();
    for (const s of subsRes.data ?? [])
      if (!subMap.has(s.user_id))
        subMap.set(s.user_id, { status: s.status, billing_cycle: s.billing_cycle });
    const rolesMap = new Map<string, string[]>();
    for (const r of rolesRes.data ?? []) {
      if (r.disabled_at) continue;
      const arr = rolesMap.get(r.user_id) ?? [];
      arr.push(r.role as string);
      rolesMap.set(r.user_id, arr);
    }
    const costMap = new Map<string, number>();
    for (const u of usageRes.data ?? []) {
      costMap.set(u.user_id, (costMap.get(u.user_id) ?? 0) + Number(u.est_cost_usd ?? 0));
    }

    let rows = (profiles ?? []).map((p) => {
      const sub = subMap.get(p.id);
      const blocked = lockMap.has(p.id);
      const roles = rolesMap.get(p.id) ?? [];
      const isSuper = roles.includes("super_admin");
      return {
        id: p.id,
        displayName: p.display_name,
        alias: p.alias,
        email: emailMap.get(p.id) ?? null,
        plan: p.plan,
        createdAt: p.created_at,
        lastSignInAt: lastSignInMap.get(p.id) ?? null,
        accountStatus: blocked ? ("blocked" as const) : ("active" as const),
        blocked,
        lockReason: lockMap.get(p.id)?.reason ?? null,
        billingCycle: sub?.billing_cycle ?? null,
        subscriptionStatus: sub?.status ?? null,
        role: isSuper ? ("super_admin" as const) : ("user" as const),
        estMonthlyCostUsd: costMap.get(p.id) ?? 0,
      };
    });

    // Post-query refinements
    if (data.status === "active") rows = rows.filter((r) => !r.blocked);
    // Belt-and-suspenders: filter out any staff that slipped past the pre-query filter.
    rows = rows.filter((r) => !staffSet.has(r.id));

    return { rows, total: count ?? 0 };
  });

// ── Bulk actions ──────────────────────────────────────────────────────────
export const adminBulkAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        userIds: z.array(z.string().uuid()).min(1).max(100),
        action: z.enum(["lock", "unlock", "set_plan"]),
        plan: z.enum(["free", "premium", "elite"]).optional(),
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
    let ok = 0;
    let failed = 0;
    const errors: Array<{ userId: string; error: string }> = [];

    for (const uid of data.userIds) {
      try {
        if (data.action === "lock") {
          const expiresAt = data.durationMinutes
            ? new Date(Date.now() + data.durationMinutes * 60_000)
            : null;
          await lockUser({
            userId: uid,
            reason: data.reason,
            severity: expiresAt ? "temp" : "permanent",
            expiresAt,
            lockedBy: context.userId,
          });
        } else if (data.action === "unlock") {
          await unlockUser(uid, context.userId);
        } else if (data.action === "set_plan") {
          if (!data.plan) throw new Error("plan required");
          if (data.plan === "free") {
            const { error: cancelErr } = await supabaseAdmin
              .from("subscriptions")
              .update({
                status: "canceled",
                canceled_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              } as never)
              .eq("user_id", uid)
              .in("status", ["active", "authorized", "trialing", "past_due"]);
            if (cancelErr) throw new Error(cancelErr.message);
          } else {
            const { data: prod } = await supabaseAdmin
              .from("products")
              .select("id")
              .eq("tier", data.plan)
              .eq("active", true)
              .limit(1)
              .maybeSingle();
            if (!prod) throw new Error(`No active product for tier "${data.plan}"`);
            const { data: pp } = await supabaseAdmin
              .from("pricing_plans")
              .select("id")
              .eq("product_id", prod.id)
              .eq("billing_cycle", "monthly")
              .eq("active", true)
              .maybeSingle();
            if (!pp) throw new Error(`No active monthly pricing_plan for tier ${data.plan}`);
            const { error } = await supabaseAdmin.rpc("admin_assign_subscription", {
              _user_id: uid,
              _pricing_plan_id: pp.id,
              _expires_at: null as unknown as string,
              _reason: data.reason,
              _actor_id: context.userId,
            });
            if (error) throw new Error(error.message);
          }
        }
        ok++;
      } catch (e) {
        failed++;
        errors.push({ userId: uid, error: e instanceof Error ? e.message : String(e) });
      }
    }

    await logAdminAction({
      actorId: context.userId,
      actorEmail,
      actionType: `bulk_${data.action}`,
      ipHash: ctx.ipHash,
      userAgent: ctx.ua,
      payload: {
        count: data.userIds.length,
        ok,
        failed,
        reason: data.reason,
        plan: data.plan ?? null,
        durationMinutes: data.durationMinutes ?? null,
        errors: errors.slice(0, 10),
      },
      status: failed === 0 ? "success" : "error",
      errorText: failed > 0 ? `${failed} failures` : undefined,
    });

    return { ok, failed, errors };
  });
