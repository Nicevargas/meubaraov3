import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const FREE_LIMIT = 3;

function isValidId(id: unknown): id is string {
  return typeof id === "string" && /^[a-zA-Z0-9_-]{8,64}$/.test(id);
}

export const Route = createFileRoute("/api/guest-session")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        let body: { guestId?: string };
        try {
          body = (await request.json()) as { guestId?: string };
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        if (!isValidId(body.guestId)) {
          return new Response("Invalid guestId", { status: 400 });
        }
        const guestId = body.guestId;

        // Upsert: create if missing, otherwise touch last_activity.
        const { data: existing } = await supabaseAdmin
          .from("guest_sessions")
          .select("message_count")
          .eq("guest_session_id", guestId)
          .maybeSingle();

        if (!existing) {
          await supabaseAdmin.from("guest_sessions").insert({ guest_session_id: guestId });
          return Response.json({ count: 0, limit: FREE_LIMIT, reached: false });
        }

        await supabaseAdmin
          .from("guest_sessions")
          .update({ last_activity: new Date().toISOString() })
          .eq("guest_session_id", guestId);

        const count = existing.message_count;
        return Response.json({
          count,
          limit: FREE_LIMIT,
          reached: count >= FREE_LIMIT,
        });
      },
    },
  },
});
