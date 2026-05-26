import { createFileRoute } from "@tanstack/react-router";
import { dispatchReengagementQueue } from "@/lib/retention-dispatch.server";

export const Route = createFileRoute("/api/public/jobs/reengagement-dispatch")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const res = await dispatchReengagementQueue();
          return Response.json({ ok: true, ...res });
        } catch (err) {
          console.error("[job:reengagement-dispatch]", err);
          return Response.json({ ok: false, error: String(err) }, { status: 500 });
        }
      },
    },
  },
});
