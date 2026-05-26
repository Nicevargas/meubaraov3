import { createFileRoute } from "@tanstack/react-router";
import { generateDailyOpsReport } from "@/lib/retention.server";

export const Route = createFileRoute("/api/public/jobs/daily-ops-report")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const res = await generateDailyOpsReport();
          return Response.json({ ok: true, ...res });
        } catch (err) {
          console.error("[job:daily-ops-report]", err);
          return Response.json({ ok: false, error: String(err) }, { status: 500 });
        }
      },
    },
  },
});
