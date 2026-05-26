import { createFileRoute } from "@tanstack/react-router";
import { detectInactiveUsers } from "@/lib/retention.server";

export const Route = createFileRoute("/api/public/jobs/inactive-detection")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const res = await detectInactiveUsers();
          return Response.json({ ok: true, ...res });
        } catch (err) {
          console.error("[job:inactive-detection]", err);
          return Response.json({ ok: false, error: String(err) }, { status: 500 });
        }
      },
    },
  },
});
