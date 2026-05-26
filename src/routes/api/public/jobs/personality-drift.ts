import { createFileRoute } from "@tanstack/react-router";
import { captureAllPersonalityDrift } from "@/lib/memory.server";

export const Route = createFileRoute("/api/public/jobs/personality-drift")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const res = await captureAllPersonalityDrift();
          return Response.json({ ok: true, ...res });
        } catch (err) {
          console.error("[job:personality-drift] failed", err);
          return Response.json({ ok: false, error: String(err) }, { status: 500 });
        }
      },
    },
  },
});
