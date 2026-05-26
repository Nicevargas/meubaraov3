// Observability + anomaly detection helpers.
// Server-only library invoked from API routes and cron jobs.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ── Endpoint latency tracking ──────────────────────────────────────────────
export async function recordEndpointMetric(args: {
  path: string;
  method?: string;
  statusCode: number;
  latencyMs: number;
  userId?: string | null;
  details?: Record<string, unknown>;
}): Promise<void> {
  await supabaseAdmin.from("endpoint_metrics").insert({
    path: args.path.slice(0, 200),
    method: (args.method ?? "POST").toUpperCase().slice(0, 10),
    status_code: args.statusCode,
    latency_ms: Math.max(0, Math.round(args.latencyMs)),
    user_id: args.userId ?? null,
    details: (args.details ?? {}) as never,
  });
}

// ── Payment anomaly detection ──────────────────────────────────────────────
// Heuristics, all idempotent per detection_key in payload.
type AnomalyInsert = {
  anomaly_type: string;
  severity: "low" | "medium" | "high";
  user_id?: string | null;
  payment_id?: string | null;
  details: Record<string, unknown>;
};

async function recordAnomaly(a: AnomalyInsert): Promise<void> {
  // Dedupe: same type + same details.key in last 24h
  const key = (a.details as { detection_key?: string }).detection_key;
  if (key) {
    const since = new Date(Date.now() - 24 * 3600_000).toISOString();
    const { data: existing } = await supabaseAdmin
      .from("payment_anomalies")
      .select("id")
      .eq("anomaly_type", a.anomaly_type)
      .gte("detected_at", since)
      .contains("details", { detection_key: key } as never)
      .limit(1);
    if (existing && existing.length > 0) return;
  }
  await supabaseAdmin.from("payment_anomalies").insert({
    anomaly_type: a.anomaly_type,
    severity: a.severity,
    user_id: a.user_id ?? null,
    payment_id: a.payment_id ?? null,
    details: a.details as never,
  });
}

export async function detectPaymentAnomalies(): Promise<{
  detected: number;
  scanned: number;
}> {
  const since24 = new Date(Date.now() - 24 * 3600_000).toISOString();
  const sinceHour = new Date(Date.now() - 3600_000).toISOString();
  let detected = 0;

  // 1. High failure rate in last hour
  const { data: recent } = await supabaseAdmin
    .from("payments")
    .select("status")
    .gte("created_at", sinceHour);
  const rec = recent ?? [];
  if (rec.length >= 5) {
    const failed = rec.filter((r) =>
      ["rejected", "failed", "cancelled"].includes(String(r.status)),
    ).length;
    const rate = failed / rec.length;
    if (rate >= 0.5) {
      await recordAnomaly({
        anomaly_type: "high_failure_rate_1h",
        severity: rate >= 0.8 ? "high" : "medium",
        details: {
          detection_key: `failure-rate-${new Date().toISOString().slice(0, 13)}`,
          total: rec.length,
          failed,
          rate: Number(rate.toFixed(2)),
        },
      });
      detected++;
    }
  }

  // 2. Same user → many failed attempts (>=3) in 24h (possible card-testing)
  const { data: failures24 } = await supabaseAdmin
    .from("payments")
    .select("user_id, amount, created_at")
    .gte("created_at", since24)
    .in("status", ["rejected", "failed"]);
  const perUser = new Map<string, number>();
  for (const f of failures24 ?? []) perUser.set(f.user_id, (perUser.get(f.user_id) ?? 0) + 1);
  for (const [uid, count] of perUser) {
    if (count >= 3) {
      await recordAnomaly({
        anomaly_type: "repeated_failed_attempts",
        severity: count >= 6 ? "high" : "medium",
        user_id: uid,
        details: {
          detection_key: `user-fail-${uid}-${new Date().toISOString().slice(0, 10)}`,
          count_24h: count,
        },
      });
      detected++;
    }
  }

  // 3. Approved payment without subscription activation
  const { data: orphans } = await supabaseAdmin
    .from("payments")
    .select("id, user_id, amount, paid_at")
    .eq("status", "approved")
    .gte("paid_at", since24)
    .is("subscription_id", null);
  for (const o of orphans ?? []) {
    await recordAnomaly({
      anomaly_type: "approved_payment_no_subscription",
      severity: "high",
      user_id: o.user_id,
      payment_id: o.id,
      details: {
        detection_key: `orphan-payment-${o.id}`,
        amount: Number(o.amount),
        paid_at: o.paid_at,
      },
    });
    detected++;
  }

  // 4. Webhook failures spike (>=5 in last hour with error_text)
  const { count: whErrors } = await supabaseAdmin
    .from("webhook_events")
    .select("id", { count: "exact", head: true })
    .gte("created_at", sinceHour)
    .not("error_text", "is", null);
  if ((whErrors ?? 0) >= 5) {
    await recordAnomaly({
      anomaly_type: "webhook_error_spike",
      severity: (whErrors ?? 0) >= 20 ? "high" : "medium",
      details: {
        detection_key: `webhook-spike-${new Date().toISOString().slice(0, 13)}`,
        errors_last_hour: whErrors,
      },
    });
    detected++;
  }

  return { detected, scanned: rec.length + (failures24?.length ?? 0) };
}

// ── Health snapshot (used by /api/public/health) ────────────────────────────
export async function getHealthSnapshot(): Promise<{
  ok: boolean;
  db: boolean;
  killSwitch: boolean;
  lastWebhookErrorMinutesAgo: number | null;
  recentAnomalies: number;
  recentLoginFailures: number;
}> {
  const since24 = new Date(Date.now() - 24 * 3600_000).toISOString();
  const sinceHour = new Date(Date.now() - 3600_000).toISOString();

  let db = true;
  let killSwitch = false;
  try {
    const { data: ks } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "kill_switch")
      .maybeSingle();
    const val = (ks?.value ?? {}) as { enabled?: boolean };
    killSwitch = !!val.enabled;
  } catch {
    db = false;
  }

  const { data: lastErr } = await supabaseAdmin
    .from("webhook_events")
    .select("created_at")
    .not("error_text", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const lastWebhookErrorMinutesAgo = lastErr?.created_at
    ? Math.round((Date.now() - new Date(lastErr.created_at).getTime()) / 60_000)
    : null;

  const { count: anomalies } = await supabaseAdmin
    .from("payment_anomalies")
    .select("id", { count: "exact", head: true })
    .gte("detected_at", since24);

  const { count: failures } = await supabaseAdmin
    .from("admin_login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("success", false)
    .gte("attempted_at", sinceHour);

  return {
    ok: db && !killSwitch,
    db,
    killSwitch,
    lastWebhookErrorMinutesAgo,
    recentAnomalies: anomalies ?? 0,
    recentLoginFailures: failures ?? 0,
  };
}
