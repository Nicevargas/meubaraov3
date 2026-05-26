// Read-only admin observability queries: endpoint latency, anomalies,
// recent admin login failures, health snapshot.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getHealthSnapshot } from "@/lib/observability.server";

async function assertSuper(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role, disabled_at")
    .eq("user_id", userId);
  const active = (data ?? []).filter((r) => !r.disabled_at);
  if (!active.some((r) => r.role === "super_admin")) {
    throw new Error("Forbidden: super_admin only");
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

export const getObservability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuper(context.userId);

    const since24 = new Date(Date.now() - 24 * 3600_000).toISOString();
    const since1h = new Date(Date.now() - 3600_000).toISOString();

    // Latency stats per path (last 24h, up to 5000 rows)
    const { data: metrics } = await supabaseAdmin
      .from("endpoint_metrics")
      .select("path, status_code, latency_ms")
      .gte("occurred_at", since24)
      .order("occurred_at", { ascending: false })
      .limit(5000);

    const grouped = new Map<string, { count: number; errors: number; latencies: number[] }>();
    for (const m of metrics ?? []) {
      const g =
        grouped.get(m.path) ??
        (grouped.set(m.path, { count: 0, errors: 0, latencies: [] }) && grouped.get(m.path)!);
      g.count++;
      if (m.status_code >= 500) g.errors++;
      g.latencies.push(m.latency_ms);
    }
    const endpoints = [...grouped.entries()]
      .map(([path, g]) => {
        const sorted = g.latencies.slice().sort((a, b) => a - b);
        return {
          path,
          requests: g.count,
          errors: g.errors,
          errorRate: g.count > 0 ? Number((g.errors / g.count).toFixed(3)) : 0,
          p50: percentile(sorted, 50),
          p95: percentile(sorted, 95),
          p99: percentile(sorted, 99),
        };
      })
      .sort((a, b) => b.requests - a.requests);

    // Anomalies (last 24h)
    const { data: anomalies } = await supabaseAdmin
      .from("payment_anomalies")
      .select("id, anomaly_type, severity, user_id, payment_id, details, detected_at")
      .gte("detected_at", since24)
      .order("detected_at", { ascending: false })
      .limit(50);

    // Recent admin login failures (last hour)
    const { data: loginFailures } = await supabaseAdmin
      .from("admin_login_attempts")
      .select("email, ip_hash, success, user_agent, attempted_at")
      .gte("attempted_at", since1h)
      .order("attempted_at", { ascending: false })
      .limit(50);

    const health = await getHealthSnapshot();

    return {
      health,
      endpoints,
      anomalies: anomalies ?? [],
      loginAttempts: loginFailures ?? [],
    };
  });
