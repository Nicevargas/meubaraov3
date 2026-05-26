import { createFileRoute } from "@tanstack/react-router";
import { retryFailedPayments } from "@/lib/retention.server";

export const Route = createFileRoute("/api/public/jobs/failed-payment-retry")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const res = await retryFailedPayments();
          return Response.json({ ok: true, ...res });
        } catch (err) {
          console.error("[job:failed-payment-retry]", err);
          return Response.json({ ok: false, error: String(err) }, { status: 500 });
        }
      },
    },
  },
});
