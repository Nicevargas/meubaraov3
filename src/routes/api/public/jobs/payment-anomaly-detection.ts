import { createFileRoute } from "@tanstack/react-router";
import { detectPaymentAnomalies } from "@/lib/observability.server";

export const Route = createFileRoute("/api/public/jobs/payment-anomaly-detection")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const res = await detectPaymentAnomalies();
          return Response.json({ ok: true, ...res });
        } catch (err) {
          console.error("[job:payment-anomaly-detection] failed", err);
          return Response.json({ ok: false, error: String(err) }, { status: 500 });
        }
      },
    },
  },
});
