import { createFileRoute } from "@tanstack/react-router";
import { cleanupStaleSessions } from "@/lib/retention.server";

export const Route = createFileRoute("/api/public/jobs/stale-session-cleanup")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const res = await cleanupStaleSessions();
          return Response.json({ ok: true, ...res });
        } catch (err) {
          console.error("[job:stale-session-cleanup]", err);
          return Response.json({ ok: false, error: String(err) }, { status: 500 });
        }
      },
    },
  },
});
