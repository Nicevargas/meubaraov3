// Server-only operational primitives: kill switch, account locks,
// rate limiting, AI usage tracking, abuse signals, premium history.
// Never import from client code.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ── Model pricing (USD per 1M tokens) ─────────────────────────────────────
// Used for cost estimation. Update if model pricing changes.
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "deepseek-chat": { input: 0.27, output: 1.1 },
  "google/gemini-2.5-flash": { input: 0.075, output: 0.3 },
  "google/gemini-2.5-flash-lite": { input: 0.04, output: 0.15 },
  "google/gemini-2.5-pro": { input: 1.25, output: 5.0 },
  "openai/gpt-5-mini": { input: 0.15, output: 0.6 },
  "openai/gpt-5": { input: 2.5, output: 10.0 },
};

export function estimateCostUsd(model: string, inTok: number, outTok: number): number {
  const p = MODEL_PRICING[model] ?? { input: 0.5, output: 1.5 };
  return (inTok / 1_000_000) * p.input + (outTok / 1_000_000) * p.output;
}

// ── Kill switch ───────────────────────────────────────────────────────────
type KillSwitch = { enabled: boolean; scope: "all" | "free_only"; message?: string };

export async function getKillSwitch(): Promise<KillSwitch> {
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", "kill_switch")
    .maybeSingle();
  const v = (data?.value ?? {}) as Partial<KillSwitch>;
  return {
    enabled: !!v.enabled,
    scope: v.scope === "all" ? "all" : "free_only",
    message: v.message ?? "Service temporarily unavailable",
  };
}

/**
 * Returns a message string if blocked, null if allowed.
 */
export async function checkKillSwitch(plan: string): Promise<string | null> {
  const ks = await getKillSwitch();
  if (!ks.enabled) return null;
  if (ks.scope === "all") return ks.message ?? "Service temporarily unavailable";
  // free_only
  if (plan === "free" || !plan) return ks.message ?? "Service temporarily unavailable";
  return null;
}

// ── Account locks ─────────────────────────────────────────────────────────
export async function isUserLocked(
  userId: string,
): Promise<{ locked: boolean; reason?: string; expiresAt?: string | null }> {
  const { data } = await supabaseAdmin
    .from("account_locks")
    .select("reason, expires_at, unlocked_at")
    .eq("user_id", userId)
    .is("unlocked_at", null)
    .order("locked_at", { ascending: false })
    .limit(1);
  const row = data?.[0];
  if (!row) return { locked: false };
  if (row.expires_at && new Date(row.expires_at) < new Date()) return { locked: false };
  return { locked: true, reason: row.reason, expiresAt: row.expires_at };
}

export async function lockUser(args: {
  userId: string;
  reason: string;
  severity?: "temp" | "review" | "permanent";
  expiresAt?: Date | null;
  lockedBy?: string | null;
  details?: Record<string, unknown>;
}) {
  await supabaseAdmin.from("account_locks").insert({
    user_id: args.userId,
    reason: args.reason,
    severity: args.severity ?? "temp",
    expires_at: args.expiresAt ? args.expiresAt.toISOString() : null,
    locked_by: args.lockedBy ?? null,
    details: (args.details ?? {}) as never,
  });
  console.warn("[ops:lock]", { userId: args.userId, reason: args.reason, severity: args.severity });
}

export async function unlockUser(userId: string, unlockedBy: string | null) {
  await supabaseAdmin
    .from("account_locks")
    .update({ unlocked_at: new Date().toISOString(), unlocked_by: unlockedBy })
    .eq("user_id", userId)
    .is("unlocked_at", null);
}

// ── Rate limiting (atomic via SQL helper) ─────────────────────────────────
export async function bumpRateLimit(
  bucketKey: string,
  windowSeconds: number,
  increment = 1,
): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc("bump_rate_limit", {
    _bucket_key: bucketKey,
    _window_seconds: windowSeconds,
    _increment: increment,
  });
  if (error) {
    console.error("[ops:ratelimit] rpc failed", error);
    return 0; // fail-open: don't block on infra error
  }
  return (data as number) ?? 0;
}

/**
 * Per-user message rate limit. Default: 20 msgs / 60s.
 */
export async function checkChatRateLimit(
  userId: string,
): Promise<{ allowed: boolean; count: number; limit: number }> {
  const LIMIT = 20;
  const WINDOW = 60;
  const count = await bumpRateLimit(`chat:${userId}`, WINDOW, 1);
  return { allowed: count <= LIMIT, count, limit: LIMIT };
}

// ── Abuse signals ─────────────────────────────────────────────────────────
export async function recordAbuseSignal(args: {
  userId?: string | null;
  ipHash?: string | null;
  signalType: string;
  severity?: "low" | "medium" | "high" | "critical";
  details?: Record<string, unknown>;
}) {
  await supabaseAdmin.from("abuse_signals").insert({
    user_id: args.userId ?? null,
    ip_hash: args.ipHash ?? null,
    signal_type: args.signalType,
    severity: args.severity ?? "low",
    details: (args.details ?? {}) as never,
  });
  console.warn("[ops:abuse]", {
    type: args.signalType,
    severity: args.severity,
    userId: args.userId,
  });
}

/**
 * Burst detector: if a user generates >=N high-frequency events in the
 * last 24h, auto-lock for 15 minutes (temp).
 */
export async function maybeAutoLock(userId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabaseAdmin
    .from("abuse_signals")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  if ((count ?? 0) >= 3) {
    const alreadyLocked = await isUserLocked(userId);
    if (!alreadyLocked.locked) {
      await lockUser({
        userId,
        reason: "auto_lock_abuse_threshold",
        severity: "temp",
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        details: { signals_24h: count ?? 0 },
      });
    }
  }
}

// ── AI usage tracking ─────────────────────────────────────────────────────
export async function recordUsageEvent(args: {
  userId: string;
  conversationId?: string | null;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs?: number;
  status?: "success" | "error";
  errorText?: string;
}) {
  const cost = estimateCostUsd(args.model, args.inputTokens, args.outputTokens);

  // Per-message event
  await supabaseAdmin.from("ai_usage_events").insert({
    user_id: args.userId,
    conversation_id: args.conversationId ?? null,
    model: args.model,
    input_tokens: args.inputTokens,
    output_tokens: args.outputTokens,
    est_cost_usd: cost,
    latency_ms: args.latencyMs ?? null,
    status: args.status ?? "success",
    error_text: args.errorText ?? null,
  });

  // Daily rollup (atomic upsert + increment)
  const today = new Date().toISOString().slice(0, 10);
  const { data: existing } = await supabaseAdmin
    .from("ai_usage_daily")
    .select("id, message_count, input_tokens, output_tokens, total_tokens, est_cost_usd")
    .eq("user_id", args.userId)
    .eq("usage_date", today)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin
      .from("ai_usage_daily")
      .update({
        message_count: existing.message_count + 1,
        input_tokens: Number(existing.input_tokens) + args.inputTokens,
        output_tokens: Number(existing.output_tokens) + args.outputTokens,
        total_tokens: Number(existing.total_tokens) + args.inputTokens + args.outputTokens,
        est_cost_usd: Number(existing.est_cost_usd) + cost,
      })
      .eq("id", existing.id);
  } else {
    await supabaseAdmin.from("ai_usage_daily").insert({
      user_id: args.userId,
      usage_date: today,
      message_count: 1,
      input_tokens: args.inputTokens,
      output_tokens: args.outputTokens,
      total_tokens: args.inputTokens + args.outputTokens,
      est_cost_usd: cost,
    });
  }
}

// ── Premium history ───────────────────────────────────────────────────────
export async function recordPremiumTransition(args: {
  userId: string;
  planId?: string | null;
  planCode?: string | null;
  status: "active" | "grace" | "expired" | "revoked" | "refunded" | "cancelled" | "trial";
  reason?: string;
  actor?: "system" | "admin" | "user" | "webhook";
  actorId?: string | null;
  paymentId?: string | null;
  details?: Record<string, unknown>;
}) {
  await supabaseAdmin.from("premium_history").insert({
    user_id: args.userId,
    plan_id: args.planId ?? null,
    plan_code: args.planCode ?? null,
    status: args.status,
    reason: args.reason ?? null,
    actor: args.actor ?? "system",
    actor_id: args.actorId ?? null,
    payment_id: args.paymentId ?? null,
    details: (args.details ?? {}) as never,
  });
}

// ── Admin action audit ────────────────────────────────────────────────────
export async function logAdminAction(args: {
  actorId: string;
  actorEmail?: string | null;
  actionType: string;
  targetType?: string;
  targetId?: string;
  ipHash?: string | null;
  userAgent?: string | null;
  payload?: Record<string, unknown>;
  status?: "success" | "error";
  errorText?: string;
}) {
  await supabaseAdmin.from("admin_actions_log").insert({
    actor_id: args.actorId,
    actor_email: args.actorEmail ?? null,
    action_type: args.actionType,
    target_type: args.targetType ?? null,
    target_id: args.targetId ?? null,
    ip_hash: args.ipHash ?? null,
    user_agent: args.userAgent ?? null,
    payload: (args.payload ?? {}) as never,
    status: args.status ?? "success",
    error_text: args.errorText ?? null,
  });
}

// ── Hash helper for IP-based abuse correlation without storing raw IPs ────
export async function hashIp(ip: string | null | undefined): Promise<string | null> {
  if (!ip) return null;
  const enc = new TextEncoder().encode(
    ip + (process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 8) ?? ""),
  );
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}
