import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Sweeps recent webhook_events with error_text; logs and (future) notifies.
export const Route = createFileRoute("/api/public/jobs/webhook-failure-alerts")({
  server: {
    handlers: {
      POST: async () => {
        const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { data, error } = await supabaseAdmin
          .from("webhook_events")
          .select("id, event_type, external_id, error_text, created_at")
          .not("error_text", "is", null)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) {
          console.error("[job:webhook-failure-alerts] query failed", error);
          return Response.json({ ok: false }, { status: 500 });
        }
        const failures = data ?? [];
        if (failures.length > 0) {
          console.warn("[job:webhook-failure-alerts] failures last hour", {
            count: failures.length,
            sample: failures.slice(0, 5),
          });
        }
        return Response.json({ ok: true, failures: failures.length });
      },
    },
  },
});
