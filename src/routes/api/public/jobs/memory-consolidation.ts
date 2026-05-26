import { createFileRoute } from "@tanstack/react-router";
import { consolidateAllMemories, runIdempotentJob } from "@/lib/memory.server";
import { checkCronAuth } from "./_cron-auth";

export const Route = createFileRoute("/api/public/jobs/memory-consolidation")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauth = checkCronAuth(request);
        if (unauth) return unauth;
        const res = await runIdempotentJob("consolidation", 15 * 60_000, consolidateAllMemories);
        if (res.status === "error") {
          console.error("[job:memory-consolidation] failed", res.error);
          return Response.json({ ok: false, ...res }, { status: 500 });
        }
        console.info("[job:memory-consolidation]", res);
        return Response.json({ ok: true, ...res });
      },
    },
  },
});
