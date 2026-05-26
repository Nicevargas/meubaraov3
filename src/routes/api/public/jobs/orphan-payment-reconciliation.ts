import { createFileRoute } from "@tanstack/react-router";
import { reconcileOrphanPayments } from "@/lib/retention.server";

export const Route = createFileRoute("/api/public/jobs/orphan-payment-reconciliation")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const res = await reconcileOrphanPayments();
          return Response.json({ ok: true, ...res });
        } catch (err) {
          console.error("[job:orphan-reconciliation]", err);
          return Response.json({ ok: false, error: String(err) }, { status: 500 });
        }
      },
    },
  },
});
