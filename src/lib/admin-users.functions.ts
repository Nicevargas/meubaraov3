// Admin User Management — production-grade server functions.
// Source of truth for plans: subscriptions → pricing_plans → products.
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createSupabaseConnection } from "@/integrations/supabase/connection";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { bumpRateLimit, hashIp, lockUser, logAdminAction, unlockUser } from "@/lib/ops.server";
import { recomputeEntitlement, resolveUserEntitlements } from "@/lib/entitlement.server";
import type { AdminRole } from "@/lib/admin.functions";

// ──────────────────────────────────────────────────────────────────
// Role gates
// ──────────────────────────────────────────────────────────────────
async function rolesOf(userId: string): Promise<AdminRole[]> {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .is("disabled_at", null);
  return (data ?? []).map((r) => r.role as AdminRole);
}

async function requireReadAccess(callerId: string) {
  const roles = await rolesOf(callerId);
  if (roles.length === 0) throw new Error("Forbidden");
  return roles;
}

async function requireSuper(callerId: string) {
  const roles = await rolesOf(callerId);
  if (!roles.includes("super_admin")) throw new Error("Forbidden: super_admin only");
  return roles;
}

async function assertTargetSafe(targetUserId: string, callerId: string) {
  if (targetUserId === callerId) return;
  const targetRoles = await rolesOf(targetUserId);
  if (targetRoles.includes("super_admin")) {
    throw new Error("Cannot modify another super_admin account");
  }
}

async function ratelimitOr429(callerId: string) {
  const count = await bumpRateLimit(`admin-mgmt:${callerId}`, 60, 1);
  if (count > 60) throw new Error("Rate limit exceeded (60 admin mutations/min)");
}

async function actorContext(callerId: string) {
  const { data } = await supabaseAdmin.auth.admin.getUserById(callerId);
  const ip = getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  return {
    email: data.user?.email ?? null,
    ipHash: await hashIp(ip),
    userAgent: getRequestHeader("user-agent") ?? null,
  };
}

// ──────────────────────────────────────────────────────────────────
// Resolve a pricing_plan_id from (product_slug, billing_cycle).
// ──────────────────────────────────────────────────────────────────
async function resolvePricingPlanId(productSlug: string, billingCycle: string): Promise<string> {
  const { data: prod } = await supabaseAdmin
    .from("products")
    .select("id, active, visibility")
    .eq("slug", productSlug)
    .maybeSingle();
  if (!prod) throw new Error(`Product "${productSlug}" not found`);
  if (!prod.active) throw new Error(`Product "${productSlug}" is inactive`);

  const { data: pp } = await supabaseAdmin
    .from("pricing_plans")
    .select("id")
    .eq("product_id", prod.id)
    .eq("billing_cycle", billingCycle)
    .eq("active", true)
    .maybeSingle();
  if (!pp) throw new Error(`No active pricing_plan for ${productSlug}/${billingCycle}`);
  return pp.id;
}

// ──────────────────────────────────────────────────────────────────
// LIST + FILTER
// ──────────────────────────────────────────────────────────────────
const ListInput = z.object({
  search: z.string().max(255).optional(),
  plan: z.enum(["all", "free", "premium", "elite"]).default("all"),
  status: z.enum(["all", "active", "locked"]).default("all"),
  payment: z.enum(["all", "active", "grace", "failed", "none"]).default("all"),
  usageBand: z.enum(["all", "low", "normal", "high", "extreme"]).default("all"),
  page: z.number().int().min(0).default(0),
  pageSize: z.number().int().min(5).max(100).default(25),
});

export const listUsersForAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ListInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireReadAccess(context.userId);

    let q = supabaseAdmin
      .from("profiles")
      .select("id, display_name, alias, plan, created_at, last_activity_at", { count: "exact" });

    if (data.plan !== "all") q = q.eq("plan", data.plan); // cached display field

    if (data.search) {
      const s = data.search.replace(/[%_]/g, "");
      if (/^[0-9a-f-]{8,}$/i.test(s)) q = q.ilike("id", `%${s}%`);
      else q = q.or(`display_name.ilike.%${s}%,alias.ilike.%${s}%`);
    }

    const from = data.page * data.pageSize;
    q = q.order("created_at", { ascending: false }).range(from, from + data.pageSize - 1);

    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);

    const ids = (rows ?? []).map((r) => r.id);
    if (ids.length === 0) return { rows: [], total: count ?? 0 };

    const [{ data: authList }, { data: subs }, { data: usage }, { data: locks }] =
      await Promise.all([
        supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
        supabaseAdmin
          .from("subscriptions")
          .select("user_id, status, current_period_end")
          .in("user_id", ids),
        supabaseAdmin
          .from("ai_usage_daily")
          .select("user_id, message_count, est_cost_usd")
          .in("user_id", ids)
          .gte(
            "usage_date",
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          ),
        supabaseAdmin
          .from("account_locks")
          .select("user_id, reason, expires_at, unlocked_at")
          .in("user_id", ids)
          .is("unlocked_at", null),
      ]);

    const emailMap = new Map<string, string>();
    const lastSignIn = new Map<string, string | null>();
    for (const u of authList?.users ?? []) {
      if (u.email) emailMap.set(u.id, u.email);
      lastSignIn.set(u.id, u.last_sign_in_at ?? null);
    }
    const subMap = new Map<string, { status: string; periodEnd: string | null }>();
    for (const s of subs ?? [])
      subMap.set(s.user_id, { status: s.status, periodEnd: s.current_period_end });
    const usageMap = new Map<string, { msgs: number; cost: number }>();
    for (const u of usage ?? []) {
      const e = usageMap.get(u.user_id) ?? { msgs: 0, cost: 0 };
      e.msgs += u.message_count ?? 0;
      e.cost += Number(u.est_cost_usd ?? 0);
      usageMap.set(u.user_id, e);
    }
    const now = Date.now();
    const lockMap = new Map<string, { reason: string; expiresAt: string | null }>();
    for (const l of locks ?? []) {
      if (l.expires_at && new Date(l.expires_at).getTime() <= now) continue;
      lockMap.set(l.user_id, { reason: l.reason, expiresAt: l.expires_at });
    }

    const enriched = (rows ?? []).map((r) => {
      const u = usageMap.get(r.id);
      const sub = subMap.get(r.id);
      const lock = lockMap.get(r.id);
      return {
        id: r.id,
        email: emailMap.get(r.id) ?? null,
        displayName: r.display_name,
        alias: r.alias,
        plan: r.plan,
        createdAt: r.created_at,
        lastActivityAt: r.last_activity_at,
        lastSignInAt: lastSignIn.get(r.id) ?? null,
        subscriptionStatus: sub?.status ?? null,
        periodEnd: sub?.periodEnd ?? null,
        msgs30d: u?.msgs ?? 0,
        cost30d: u?.cost ?? 0,
        locked: !!lock,
        lockReason: lock?.reason ?? null,
      };
    });

    let final = enriched;
    if (data.status === "locked") final = final.filter((r) => r.locked);
    if (data.status === "active") final = final.filter((r) => !r.locked);
    if (data.payment === "active") final = final.filter((r) => r.subscriptionStatus === "active");
    if (data.payment === "grace") final = final.filter((r) => r.subscriptionStatus === "grace");
    if (data.payment === "failed")
      final = final.filter(
        (r) => r.subscriptionStatus === "past_due" || r.subscriptionStatus === "failed",
      );
    if (data.payment === "none") final = final.filter((r) => !r.subscriptionStatus);
    if (data.usageBand === "low") final = final.filter((r) => r.msgs30d < 50);
    if (data.usageBand === "normal")
      final = final.filter((r) => r.msgs30d >= 50 && r.msgs30d < 500);
    if (data.usageBand === "high")
      final = final.filter((r) => r.msgs30d >= 500 && r.msgs30d < 2000);
    if (data.usageBand === "extreme") final = final.filter((r) => r.msgs30d >= 2000);

    return { rows: final, total: count ?? 0 };
  });

// ──────────────────────────────────────────────────────────────────
// USER DETAIL
// ──────────────────────────────────────────────────────────────────
export const getUserDetailForAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const callerRoles = await requireReadAccess(context.userId);

    const [
      { data: profile },
      { data: rolesData },
      { data: authUser },
      { data: subscription },
      { data: payments },
      { data: usage30d },
      { data: subscriptionHistory },
      { data: notes },
      { data: auditRoles },
      { data: auditActions },
      { data: locks },
      { data: signals },
      { data: premiumHistory },
      { count: msgCount },
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("id", data.userId).maybeSingle(),
      supabaseAdmin
        .from("user_roles")
        .select("role, disabled_at, must_change_password, created_at, granted_by")
        .eq("user_id", data.userId),
      supabaseAdmin.auth.admin.getUserById(data.userId),
      supabaseAdmin
        .from("subscriptions")
        .select("*")
        .eq("user_id", data.userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("payments")
        .select(
          "id, amount, currency, status, payment_method, paid_at, created_at, mp_payment_id, mp_preapproval_id",
        )
        .eq("user_id", data.userId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabaseAdmin
        .from("ai_usage_daily")
        .select("usage_date, message_count, input_tokens, output_tokens, est_cost_usd")
        .eq("user_id", data.userId)
        .gte(
          "usage_date",
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        )
        .order("usage_date"),
      supabaseAdmin
        .from("subscriptions")
        .select(
          "id, status, billing_cycle, pricing_plan_id, product_id, provider, created_at, canceled_at, current_period_end",
        )
        .eq("user_id", data.userId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabaseAdmin
        .from("admin_notes")
        .select("*")
        .eq("user_id", data.userId)
        .is("deleted_at", null)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("admin_audit_log")
        .select("*")
        .eq("target_id", data.userId)
        .order("occurred_at", { ascending: false })
        .limit(50),
      supabaseAdmin
        .from("admin_actions_log")
        .select("*")
        .eq("target_id", data.userId)
        .order("occurred_at", { ascending: false })
        .limit(50),
      supabaseAdmin
        .from("account_locks")
        .select("*")
        .eq("user_id", data.userId)
        .order("locked_at", { ascending: false })
        .limit(10),
      supabaseAdmin
        .from("abuse_signals")
        .select("*")
        .eq("user_id", data.userId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabaseAdmin
        .from("premium_history")
        .select("*")
        .eq("user_id", data.userId)
        .order("occurred_at", { ascending: false })
        .limit(20),
      supabaseAdmin
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", data.userId),
    ]);

    if (!profile) throw new Error("User not found");

    // Resolve product / pricing labels for the history table.
    const planIds = Array.from(
      new Set(
        (subscriptionHistory ?? []).map((s) => s.pricing_plan_id).filter(Boolean) as string[],
      ),
    );
    const productIds = Array.from(
      new Set((subscriptionHistory ?? []).map((s) => s.product_id).filter(Boolean) as string[]),
    );
    const [{ data: planRows }, { data: productRows }] = await Promise.all([
      planIds.length
        ? supabaseAdmin
            .from("pricing_plans")
            .select("id, billing_cycle, price_brl, currency")
            .in("id", planIds)
        : Promise.resolve({
            data: [] as Array<{
              id: string;
              billing_cycle: string;
              price_brl: number;
              currency: string;
            }>,
          }),
      productIds.length
        ? supabaseAdmin.from("products").select("id, slug, name, tier").in("id", productIds)
        : Promise.resolve({
            data: [] as Array<{ id: string; slug: string; name: string; tier: string }>,
          }),
    ]);
    const planMap = new Map((planRows ?? []).map((p) => [p.id, p]));
    const productMap = new Map((productRows ?? []).map((p) => [p.id, p]));

    const subscriptionHistoryEnriched = (subscriptionHistory ?? []).map((s) => {
      const prod = s.product_id ? productMap.get(s.product_id) : null;
      const pp = s.pricing_plan_id ? planMap.get(s.pricing_plan_id) : null;
      return {
        id: s.id,
        status: s.status,
        billing_cycle: s.billing_cycle ?? pp?.billing_cycle ?? null,
        product_slug: prod?.slug ?? null,
        product_name: prod?.name ?? null,
        tier: prod?.tier ?? null,
        provider: s.provider,
        price_brl: pp ? Number(pp.price_brl) : null,
        created_at: s.created_at,
        canceled_at: s.canceled_at,
        current_period_end: s.current_period_end,
      };
    });

    const entitlement = callerRoles.includes("super_admin")
      ? await resolveUserEntitlements(data.userId)
      : null;
    const today = new Date().toISOString().slice(0, 10);
    const { data: todayUsage } = await supabaseAdmin
      .from("user_daily_usage")
      .select("message_count, subscription_type, usage_date")
      .eq("user_id", data.userId)
      .eq("usage_date", today)
      .maybeSingle();

    const totals = (usage30d ?? []).reduce(
      (acc, r) => {
        acc.messages += r.message_count ?? 0;
        acc.inputTokens += Number(r.input_tokens ?? 0);
        acc.outputTokens += Number(r.output_tokens ?? 0);
        acc.cost += Number(r.est_cost_usd ?? 0);
        return acc;
      },
      { messages: 0, inputTokens: 0, outputTokens: 0, cost: 0 },
    );

    const trail = [
      ...(auditRoles ?? []).map((r) => ({
        kind: "role" as const,
        occurredAt: r.occurred_at,
        actorEmail: r.actor_email,
        action: r.action,
        oldValue: r.old_role,
        newValue: r.new_role,
        details: r.details,
      })),
      ...(auditActions ?? []).map((r) => ({
        kind: "action" as const,
        occurredAt: r.occurred_at,
        actorEmail: r.actor_email,
        action: r.action_type,
        oldValue: null,
        newValue: r.status,
        details: r.payload,
      })),
    ].sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt));

    const currentLock =
      (locks ?? []).find(
        (l) => !l.unlocked_at && (!l.expires_at || new Date(l.expires_at).getTime() > Date.now()),
      ) ?? null;

    return {
      profile: {
        ...profile,
        email: authUser?.user?.email ?? null,
        lastSignInAt: authUser?.user?.last_sign_in_at ?? null,
        emailConfirmed: !!authUser?.user?.email_confirmed_at,
        emailConfirmedAt: authUser?.user?.email_confirmed_at ?? null,
        blocked: !!currentLock,
        blockReason: currentLock?.reason ?? null,
      },
      roles: rolesData ?? [],
      subscription,
      payments: payments ?? [],
      usage: {
        daily: usage30d ?? [],
        totals,
        messagesAllTime: msgCount ?? 0,
      },
      subscriptionHistory: subscriptionHistoryEnriched,
      entitlementDebug: entitlement
        ? {
            userId: data.userId,
            email: authUser?.user?.email ?? null,
            subscriptionsPricingPlanId: subscription?.pricing_plan_id ?? null,
            subscriptionProductId: subscription?.product_id ?? null,
            subscriptionStatus: subscription?.status ?? null,
            currentRole: (rolesData ?? []).filter((r) => !r.disabled_at).map((r) => r.role),
            frontendPlan: profile.plan, // cached display
            resolverTier: entitlement.tier,
            resolverPlanName: entitlement.plan_name,
            resolverPlanId: entitlement.plan_id,
            currentDailyMessageLimit: entitlement.limits.daily_message_limit,
            currentMonthlyMessageLimit: entitlement.limits.monthly_token_limit,
            currentMessageCount: todayUsage?.message_count ?? 0,
            usageRowSubscriptionType: todayUsage?.subscription_type ?? null,
            featureAccessFlags: {
              hasPremiumAccess: entitlement.has_premium_access,
              premium: entitlement.features.premium,
              vip: entitlement.features.vip,
            },
            resolverSource: entitlement.source,
            resolverStatus: entitlement.status,
            subscriptionVersion: entitlement.subscription_version,
            subscriptionSyncedAt: entitlement.subscription_synced_at,
          }
        : null,
      notes: notes ?? [],
      auditTrail: trail.slice(0, 100),
      locks: locks ?? [],
      abuseSignals: signals ?? [],
      premiumHistory: premiumHistory ?? [],
    };
  });

// ──────────────────────────────────────────────────────────────────
// MUTATIONS
// ──────────────────────────────────────────────────────────────────
const CREATABLE_ROLES = ["admin", "moderator", "support", "finance", "analytics"] as const;
const PRODUCT_SLUGS = ["premium", "elite"] as const;
const BILLING_CYCLES = ["monthly", "quarterly", "semiannual", "annual"] as const;

function genTempPwd() {
  const cs = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return (
    Array.from(bytes)
      .map((b) => cs[b % cs.length])
      .join("") + "!9"
  );
}

function resolveInviteSiteUrl(): string {
  const raw = process.env.SITE_URL ?? "https://meubarao.com";
  if (/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(raw)) return "https://meubarao.com";
  return raw.replace(/\/$/, "");
}

// Create user — new accounts always start as free. Admin assigns a subscription afterward.
// The new user receives a password-setup email (recovery link) — no temp password is ever returned.
export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        email: z.string().email().max(255),
        displayName: z.string().min(1).max(120),
        role: z.enum(CREATABLE_ROLES).optional(),
        reason: z.string().min(2).max(500),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireSuper(context.userId);
    await ratelimitOr429(context.userId);
    const ctx = await actorContext(context.userId);
    const tempPwd = genTempPwd();

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: tempPwd,
      email_confirm: true,
      user_metadata: { display_name: data.displayName },
    });
    if (error || !created.user) {
      await logAdminAction({
        actorId: context.userId,
        actorEmail: ctx.email,
        actionType: "user_create",
        status: "error",
        errorText: error?.message,
        ipHash: ctx.ipHash,
        userAgent: ctx.userAgent,
        payload: { email: data.email },
      });
      throw new Error(error?.message ?? "create failed");
    }

    await supabaseAdmin.from("profiles").upsert(
      {
        id: created.user.id,
        display_name: data.displayName,
        onboarding_completed: true,
      } as never,
      { onConflict: "id" },
    );

    if (data.role) {
      await supabaseAdmin.from("user_roles").insert({
        user_id: created.user.id,
        role: data.role,
        granted_by: context.userId,
        must_change_password: true,
      } as never);
    }

    // Send password-setup email so the user defines their own password through the recovery link.
    const redirectTo = `${resolveInviteSiteUrl()}/reset-password`;
    const { error: inviteErr } = await supabaseAdmin.auth.resetPasswordForEmail(data.email, {
      redirectTo,
    });
    const inviteSent = !inviteErr;
    if (inviteErr) {
      console.error("[admin-create] invite email failed", {
        email: data.email,
        error: inviteErr.message,
      });
    }

    await logAdminAction({
      actorId: context.userId,
      actorEmail: ctx.email,
      actionType: "user_create",
      targetType: "user",
      targetId: created.user.id,
      ipHash: ctx.ipHash,
      userAgent: ctx.userAgent,
      payload: {
        email: data.email,
        role: data.role ?? null,
        reason: data.reason,
        inviteSent,
        inviteError: inviteErr?.message ?? null,
      },
    });

    return {
      userId: created.user.id,
      email: data.email,
      inviteSent,
      inviteError: inviteErr?.message ?? null,
    };
  });

// Update profile
export const adminUpdateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        displayName: z.string().min(1).max(120).optional(),
        alias: z.string().max(120).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireSuper(context.userId);
    await assertTargetSafe(data.userId, context.userId);
    await ratelimitOr429(context.userId);
    const ctx = await actorContext(context.userId);

    const patch: { display_name?: string; alias?: string | null } = {};
    if (data.displayName !== undefined) patch.display_name = data.displayName;
    if (data.alias !== undefined) patch.alias = data.alias;
    const { error } = await supabaseAdmin
      .from("profiles")
      .update(patch as never)
      .eq("id", data.userId);
    if (error) throw new Error(error.message);

    await logAdminAction({
      actorId: context.userId,
      actorEmail: ctx.email,
      actionType: "user_update_profile",
      targetType: "user",
      targetId: data.userId,
      payload: patch,
      ipHash: ctx.ipHash,
      userAgent: ctx.userAgent,
    });
    return { ok: true };
  });

// Hard delete
export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        confirmEmail: z.string().email(),
        reason: z.string().min(2).max(500),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireSuper(context.userId);
    await assertTargetSafe(data.userId, context.userId);
    if (data.userId === context.userId) throw new Error("Cannot delete your own account");
    await ratelimitOr429(context.userId);
    const ctx = await actorContext(context.userId);

    const { data: target } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (!target.user) throw new Error("User not found");
    if (target.user.email?.toLowerCase() !== data.confirmEmail.toLowerCase()) {
      throw new Error("Email confirmation does not match");
    }

    await logAdminAction({
      actorId: context.userId,
      actorEmail: ctx.email,
      actionType: "user_delete",
      targetType: "user",
      targetId: data.userId,
      payload: { reason: data.reason, email: target.user.email },
      ipHash: ctx.ipHash,
      userAgent: ctx.userAgent,
    });

    await supabaseAdmin.auth.admin.signOut(data.userId, "global").catch(() => null);

    const { error: cascadeErr } = await supabaseAdmin.rpc("admin_delete_user_data", {
      _user_id: data.userId,
    });
    if (cascadeErr) throw new Error(`Cascade failed: ${cascadeErr.message}`);

    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (authErr) throw new Error(`Auth delete failed: ${authErr.message}`);

    return { ok: true };
  });

// Block / Unblock
export const adminBlockUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        reason: z.string().min(2).max(500),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireSuper(context.userId);
    await assertTargetSafe(data.userId, context.userId);
    if (data.userId === context.userId) throw new Error("Cannot block yourself");
    await ratelimitOr429(context.userId);
    const ctx = await actorContext(context.userId);

    await lockUser({
      userId: data.userId,
      reason: data.reason,
      severity: "review",
      expiresAt: null,
      lockedBy: context.userId,
    });

    await supabaseAdmin.auth.admin.signOut(data.userId, "global").catch(() => null);

    await logAdminAction({
      actorId: context.userId,
      actorEmail: ctx.email,
      actionType: "user_block",
      targetType: "user",
      targetId: data.userId,
      payload: { reason: data.reason },
      ipHash: ctx.ipHash,
      userAgent: ctx.userAgent,
    });
    return { ok: true };
  });

export const adminUnblockUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ userId: z.string().uuid(), reason: z.string().min(2).max(500) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireSuper(context.userId);
    await ratelimitOr429(context.userId);
    const ctx = await actorContext(context.userId);

    await unlockUser(data.userId, context.userId);

    await logAdminAction({
      actorId: context.userId,
      actorEmail: ctx.email,
      actionType: "user_unblock",
      targetType: "user",
      targetId: data.userId,
      payload: { reason: data.reason },
      ipHash: ctx.ipHash,
      userAgent: ctx.userAgent,
    });
    return { ok: true };
  });

// Legacy aliases
export const adminSuspendUser = adminBlockUser;
export const adminReactivateUser = adminUnblockUser;

// Verify email
export const adminVerifyEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireSuper(context.userId);
    await assertTargetSafe(data.userId, context.userId);
    await ratelimitOr429(context.userId);
    const ctx = await actorContext(context.userId);

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      email_confirm: true,
    });
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("profiles")
      .update({ email_verified_manually_at: new Date().toISOString() } as never)
      .eq("id", data.userId);

    await logAdminAction({
      actorId: context.userId,
      actorEmail: ctx.email,
      actionType: "email_verify_manual",
      targetType: "user",
      targetId: data.userId,
      payload: {},
      ipHash: ctx.ipHash,
      userAgent: ctx.userAgent,
    });
    return { ok: true };
  });

// Password reset
export const adminTriggerPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireSuper(context.userId);
    await assertTargetSafe(data.userId, context.userId);
    await ratelimitOr429(context.userId);
    const ctx = await actorContext(context.userId);

    const { data: target } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (!target.user?.email) throw new Error("User has no email");

    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(target.user.email, {
      redirectTo: `${process.env.SITE_URL ?? "https://meubarao.com"}/reset-password`,
    });
    if (error) throw new Error(error.message);

    await logAdminAction({
      actorId: context.userId,
      actorEmail: ctx.email,
      actionType: "password_reset_triggered",
      targetType: "user",
      targetId: data.userId,
      payload: { email: target.user.email },
      ipHash: ctx.ipHash,
      userAgent: ctx.userAgent,
    });
    return { ok: true };
  });

export const adminForcePasswordReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireSuper(context.userId);
    await assertTargetSafe(data.userId, context.userId);
    await ratelimitOr429(context.userId);
    const ctx = await actorContext(context.userId);

    await supabaseAdmin
      .from("user_roles")
      .update({ must_change_password: true } as never)
      .eq("user_id", data.userId);

    await logAdminAction({
      actorId: context.userId,
      actorEmail: ctx.email,
      actionType: "password_force_reset",
      targetType: "user",
      targetId: data.userId,
      payload: {},
      ipHash: ctx.ipHash,
      userAgent: ctx.userAgent,
    });
    return { ok: true };
  });

// ──────────────────────────────────────────────────────────────────
// SUBSCRIPTION ASSIGNMENT — canonical writer
// ──────────────────────────────────────────────────────────────────
// Admin assigns a subscription by selecting (product_slug, billing_cycle).
// The pricing_plan_id is resolved server-side. Tier "free" cancels active subs.
const AssignSubscriptionInput = z.object({
  userId: z.string().uuid(),
  productSlug: z.enum(["free", ...PRODUCT_SLUGS] as [string, ...string[]]),
  billingCycle: z.enum(BILLING_CYCLES).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  reason: z.string().min(2).max(500),
});

export const adminAssignSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => AssignSubscriptionInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireSuper(context.userId);
    await assertTargetSafe(data.userId, context.userId);
    await ratelimitOr429(context.userId);
    const ctx = await actorContext(context.userId);

    // Free = cancel any active subscriptions.
    if (data.productSlug === "free") {
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
      await recomputeEntitlement(data.userId, `admin_assign:free:${data.reason}`);
      await logAdminAction({
        actorId: context.userId,
        actorEmail: ctx.email,
        actionType: "subscription_revoked",
        targetType: "user",
        targetId: data.userId,
        payload: { productSlug: "free", reason: data.reason },
        ipHash: ctx.ipHash,
        userAgent: ctx.userAgent,
      });
      return { ok: true, tier: "free" as const };
    }

    if (!data.billingCycle) throw new Error("billingCycle is required for paid plans");
    const pricingPlanId = await resolvePricingPlanId(data.productSlug, data.billingCycle);

    const { data: result, error } = await supabaseAdmin.rpc("admin_assign_subscription", {
      _user_id: data.userId,
      _pricing_plan_id: pricingPlanId,
      _expires_at: (data.expiresAt ?? null) as unknown as string,
      _reason: data.reason,
      _actor_id: context.userId,
    });
    if (error) throw new Error(error.message);

    await recomputeEntitlement(
      data.userId,
      `admin_assign:${data.productSlug}/${data.billingCycle}:${data.reason}`,
    );

    await logAdminAction({
      actorId: context.userId,
      actorEmail: ctx.email,
      actionType: "subscription_assigned",
      targetType: "user",
      targetId: data.userId,
      payload: {
        productSlug: data.productSlug,
        billingCycle: data.billingCycle,
        pricingPlanId,
        expiresAt: data.expiresAt ?? null,
        reason: data.reason,
        result,
      },
      ipHash: ctx.ipHash,
      userAgent: ctx.userAgent,
    });
    return { ok: true, pricingPlanId, result };
  });

// Extend subscription period
export const adminExtendSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        days: z.number().int().min(1).max(3650),
        reason: z.string().min(2).max(500),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireSuper(context.userId);
    await assertTargetSafe(data.userId, context.userId);
    await ratelimitOr429(context.userId);
    const ctx = await actorContext(context.userId);

    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("id, current_period_end")
      .eq("user_id", data.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub) throw new Error("No subscription to extend");

    const base = sub.current_period_end ? new Date(sub.current_period_end) : new Date();
    const next = new Date(Math.max(+base, Date.now()) + data.days * 24 * 60 * 60 * 1000);
    const { error } = await supabaseAdmin
      .from("subscriptions")
      .update({ current_period_end: next.toISOString(), grace_period_until: null } as never)
      .eq("id", sub.id);
    if (error) throw new Error(error.message);

    await logAdminAction({
      actorId: context.userId,
      actorEmail: ctx.email,
      actionType: "subscription_extended",
      targetType: "user",
      targetId: data.userId,
      payload: { days: data.days, newPeriodEnd: next.toISOString(), reason: data.reason },
      ipHash: ctx.ipHash,
      userAgent: ctx.userAgent,
    });
    return { ok: true, newPeriodEnd: next.toISOString() };
  });

// Admin notes
export const adminAddNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        content: z.string().min(2).max(4000),
        category: z
          .enum(["general", "vip", "payment", "abuse", "support", "billing"])
          .default("general"),
        pinned: z.boolean().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireSuper(context.userId);
    await ratelimitOr429(context.userId);
    const ctx = await actorContext(context.userId);

    const { error } = await supabaseAdmin.from("admin_notes").insert({
      user_id: data.userId,
      author_id: context.userId,
      author_email: ctx.email,
      content: data.content,
      category: data.category,
      pinned: data.pinned,
    } as never);
    if (error) throw new Error(error.message);

    await logAdminAction({
      actorId: context.userId,
      actorEmail: ctx.email,
      actionType: "admin_note_added",
      targetType: "user",
      targetId: data.userId,
      payload: { category: data.category, pinned: data.pinned },
      ipHash: ctx.ipHash,
      userAgent: ctx.userAgent,
    });
    return { ok: true };
  });

export const adminDeleteNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ noteId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireSuper(context.userId);
    await ratelimitOr429(context.userId);
    const ctx = await actorContext(context.userId);

    const { error } = await supabaseAdmin
      .from("admin_notes")
      .update({ deleted_at: new Date().toISOString() } as never)
      .eq("id", data.noteId);
    if (error) throw new Error(error.message);

    await logAdminAction({
      actorId: context.userId,
      actorEmail: ctx.email,
      actionType: "admin_note_deleted",
      targetType: "admin_note",
      targetId: data.noteId,
      payload: {},
      ipHash: ctx.ipHash,
      userAgent: ctx.userAgent,
    });
    return { ok: true };
  });

export const adminToggleNotePin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ noteId: z.string().uuid(), pinned: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireSuper(context.userId);
    await ratelimitOr429(context.userId);
    const { error } = await supabaseAdmin
      .from("admin_notes")
      .update({ pinned: data.pinned } as never)
      .eq("id", data.noteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Change role
export const adminChangeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        addRole: z.enum(CREATABLE_ROLES).optional(),
        removeRole: z.enum([...CREATABLE_ROLES, "super_admin"] as const).optional(),
        reason: z.string().min(2).max(500),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireSuper(context.userId);
    await assertTargetSafe(data.userId, context.userId);
    if (data.userId === context.userId) throw new Error("Cannot change your own roles here");
    await ratelimitOr429(context.userId);
    const ctx = await actorContext(context.userId);

    if (data.removeRole === "super_admin")
      throw new Error("Use admin lifecycle page to manage super_admin role");

    if (data.removeRole) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", data.removeRole);
      if (error) throw new Error(error.message);
    }
    if (data.addRole) {
      const { error } = await supabaseAdmin.from("user_roles").upsert(
        {
          user_id: data.userId,
          role: data.addRole,
          granted_by: context.userId,
          disabled_at: null,
        } as never,
        { onConflict: "user_id,role" },
      );
      if (error) throw new Error(error.message);
    }

    await logAdminAction({
      actorId: context.userId,
      actorEmail: ctx.email,
      actionType: "user_role_change",
      targetType: "user",
      targetId: data.userId,
      payload: { addRole: data.addRole, removeRole: data.removeRole, reason: data.reason },
      ipHash: ctx.ipHash,
      userAgent: ctx.userAgent,
    });
    return { ok: true };
  });

// Recovery link
export const adminGenerateRecoveryLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireSuper(context.userId);
    await assertTargetSafe(data.userId, context.userId);
    await ratelimitOr429(context.userId);
    const ctx = await actorContext(context.userId);

    const { data: target } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (!target.user?.email) throw new Error("User has no email");

    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: target.user.email,
      options: { redirectTo: `${process.env.SITE_URL ?? "https://meubarao.com"}/reset-password` },
    });
    if (error) throw new Error(error.message);

    await logAdminAction({
      actorId: context.userId,
      actorEmail: ctx.email,
      actionType: "recovery_link_generated",
      targetType: "user",
      targetId: data.userId,
      payload: { email: target.user.email },
      ipHash: ctx.ipHash,
      userAgent: ctx.userAgent,
    });
    return { actionLink: link.properties?.action_link ?? null, email: target.user.email };
  });

// Internal/test flags
export const adminSetUserFlags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        isInternal: z.boolean().optional(),
        isTest: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireSuper(context.userId);
    await ratelimitOr429(context.userId);
    const ctx = await actorContext(context.userId);

    const patch: Record<string, boolean> = {};
    if (data.isInternal !== undefined) patch.is_internal = data.isInternal;
    if (data.isTest !== undefined) patch.is_test = data.isTest;
    if (Object.keys(patch).length === 0) return { ok: true };

    const { error } = await supabaseAdmin
      .from("profiles")
      .update(patch as never)
      .eq("id", data.userId);
    if (error) throw new Error(error.message);

    await logAdminAction({
      actorId: context.userId,
      actorEmail: ctx.email,
      actionType: "user_flags_changed",
      targetType: "user",
      targetId: data.userId,
      payload: patch,
      ipHash: ctx.ipHash,
      userAgent: ctx.userAgent,
    });
    return { ok: true };
  });

// ──────────────────────────────────────────────────────────────────
// Super-admin impersonation: generate a one-time magic link the
// super admin can open in a new tab to enter the target customer's
// account WITHOUT exposing or modifying the user's password.
//
// Security:
//  - super_admin only
//  - target must NOT be staff (no impersonation of admins)
//  - master password (the caller's own password) is verified
//    against Supabase auth using an isolated client (no session side-effects)
//  - action is rate-limited and audit-logged
// ──────────────────────────────────────────────────────────────────
export const adminImpersonateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        masterPassword: z.string().min(1).max(200),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireSuper(context.userId);
    await assertTargetSafe(data.userId, context.userId);
    await ratelimitOr429(context.userId);
    const ctx = await actorContext(context.userId);

    // Target must be a real customer (no staff role).
    const targetRoles = await rolesOf(data.userId);
    const STAFF = ["super_admin", "admin", "moderator", "support", "finance", "analytics"];
    if (targetRoles.some((r) => STAFF.includes(r as string))) {
      throw new Error("Cannot impersonate a staff account");
    }

    if (!ctx.email) throw new Error("Actor email unavailable");

    // Verify master password in an isolated client (no session persistence).
    const tmp = createSupabaseConnection("public", {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { error: pwErr } = await tmp.auth.signInWithPassword({
      email: ctx.email,
      password: data.masterPassword,
    });
    if (pwErr) {
      await logAdminAction({
        actorId: context.userId,
        actorEmail: ctx.email,
        actionType: "user_impersonation_denied",
        targetType: "user",
        targetId: data.userId,
        payload: { reason: "bad_master_password" },
        ipHash: ctx.ipHash,
        userAgent: ctx.userAgent,
      });
      throw new Error("Senha mestra incorreta");
    }
    // Discard temp session immediately.
    await tmp.auth.signOut().catch(() => {});

    const { data: target } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (!target.user?.email) throw new Error("Target user has no email");

    const redirectTo = `${process.env.SITE_URL ?? "https://meubarao.com"}/app`;
    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: target.user.email,
      options: { redirectTo },
    });
    if (error) throw new Error(error.message);

    await logAdminAction({
      actorId: context.userId,
      actorEmail: ctx.email,
      actionType: "user_impersonation_started",
      targetType: "user",
      targetId: data.userId,
      payload: { targetEmail: target.user.email },
      ipHash: ctx.ipHash,
      userAgent: ctx.userAgent,
    });

    return { actionLink: link.properties?.action_link ?? null, email: target.user.email };
  });
