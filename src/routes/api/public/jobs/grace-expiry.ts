import { createFileRoute } from "@tanstack/react-router";
import { expireGracePeriods } from "@/lib/segments.server";

export const Route = createFileRoute("/api/public/jobs/grace-expiry")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const res = await expireGracePeriods();
          return Response.json({ ok: true, ...res });
        } catch (err) {
          console.error("[job:grace-expiry] failed", err);
          return Response.json({ ok: false, error: String(err) }, { status: 500 });
        }
      },
    },
  },
});
