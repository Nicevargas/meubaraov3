import { createFileRoute } from "@tanstack/react-router";
import { getHealthSnapshot } from "@/lib/observability.server";

export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const snap = await getHealthSnapshot();
          return Response.json(snap, {
            status: snap.ok ? 200 : 503,
            headers: { "Cache-Control": "no-store" },
          });
        } catch (err) {
          return Response.json({ ok: false, error: String(err) }, { status: 500 });
        }
      },
    },
  },
});
