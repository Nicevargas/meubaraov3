import { createFileRoute } from "@tanstack/react-router";
import { recomputeSegments } from "@/lib/segments.server";

export const Route = createFileRoute("/api/public/jobs/recompute-segments")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const res = await recomputeSegments();
          return Response.json({ ok: true, ...res });
        } catch (err) {
          console.error("[job:recompute-segments] failed", err);
          return Response.json({ ok: false, error: String(err) }, { status: 500 });
        }
      },
    },
  },
});
