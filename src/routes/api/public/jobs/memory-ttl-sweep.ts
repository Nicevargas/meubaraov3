import { createFileRoute } from "@tanstack/react-router";
import { runIdempotentJob, runMemoryTtlSweep } from "@/lib/memory.server";
import { checkCronAuth } from "./_cron-auth";

export const Route = createFileRoute("/api/public/jobs/memory-ttl-sweep")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauth = checkCronAuth(request);
        if (unauth) return unauth;
        const res = await runIdempotentJob("ttl_sweep", 5 * 60_000, runMemoryTtlSweep);
        if (res.status === "error") {
          console.error("[job:memory-ttl-sweep] failed", res.error);
          return Response.json({ ok: false, ...res }, { status: 500 });
        }
        console.info("[job:memory-ttl-sweep]", res);
        return Response.json({ ok: true, ...res });
      },
    },
  },
});
