import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createHash } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ContactSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  contact_type: z.enum([
    "suporte",
    "assinaturas",
    "privacidade",
    "duvidas",
    "parcerias",
    "imprensa",
  ]),
  message: z.string().trim().min(10, "Mensagem muito curta").max(4000),
  // Honeypot — must remain empty
  website: z.string().max(0).optional().or(z.literal("")),
});

const RATE_WINDOW_MS = 60 * 60 * 1000; // 1h
const RATE_MAX = 5;

function getClientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

export const Route = createFileRoute("/api/contact")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "invalid_json" }, { status: 400 });
        }

        const parsed = ContactSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { error: "validation_error", issues: parsed.error.flatten() },
            { status: 400 },
          );
        }

        const data = parsed.data;

        // Honeypot tripped → silently accept (no DB write)
        if (data.website && data.website.length > 0) {
          return Response.json({ ok: true });
        }

        const ip = getClientIp(request);
        const ipHash = hashIp(ip);
        const userAgent = (request.headers.get("user-agent") || "").slice(0, 500);

        // Basic rate limiting per IP hash
        const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
        const { count } = await supabaseAdmin
          .from("contact_messages")
          .select("id", { count: "exact", head: true })
          .eq("ip_hash", ipHash)
          .gte("created_at", since);

        if ((count ?? 0) >= RATE_MAX) {
          return Response.json(
            {
              error: "rate_limited",
              message: "Muitas mensagens recentes. Tente novamente em instantes.",
            },
            { status: 429 },
          );
        }

        const { error } = await supabaseAdmin.from("contact_messages").insert({
          name: data.name,
          email: data.email,
          contact_type: data.contact_type,
          message: data.message,
          ip_hash: ipHash,
          user_agent: userAgent,
        });

        if (error) {
          return Response.json({ error: "internal_error" }, { status: 500 });
        }

        return Response.json({ ok: true });
      },
    },
  },
});
