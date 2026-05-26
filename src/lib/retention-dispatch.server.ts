// Server-only: drains reengagement_queue and dispatches messages.
// Channel-agnostic. Currently wired to Lovable Email (via enqueue_email RPC)
// and a Twilio WhatsApp stub. Both gracefully degrade when infra is missing
// so the queue does not silently lose entries.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type QueueRow = {
  id: string;
  user_id: string;
  reason: string;
  channel: string;
  payload: Record<string, unknown>;
  attempts: number;
  dedupe_key: string;
};

const MAX_ATTEMPTS = 4;
const BATCH = 25;

// ── Templates per reason ─────────────────────────────────────────────────
type Template = {
  subject: string;
  // html + text receive the user profile + payload
  html: (ctx: TemplateCtx) => string;
  text: (ctx: TemplateCtx) => string;
};
type TemplateCtx = {
  name: string;
  email: string;
  payload: Record<string, unknown>;
};

const TEMPLATES: Record<string, Template> = {
  inactive: {
    subject: "Sentimos sua falta no Meu Barão",
    html: (c) =>
      baseHtml(
        `Olá, ${escape(c.name)}`,
        `Faz alguns dias que não conversamos. Estou aqui quando você quiser voltar — sem pressa, sem cobrança.`,
        "Voltar para a conversa",
      ),
    text: (c) =>
      `Olá, ${c.name}. Faz alguns dias que não conversamos. Estou aqui quando você quiser voltar.`,
  },
  churn_risk: {
    subject: "Sua assinatura está te esperando",
    html: (c) =>
      baseHtml(
        `${escape(c.name)},`,
        `Notei que você não está aproveitando o tempo da sua assinatura. Posso te ajudar com algo? Estou aqui.`,
        "Retomar onde paramos",
      ),
    text: (c) =>
      `${c.name}, sua assinatura está ativa e estou te esperando. Posso te ajudar com algo?`,
  },
  payment_failed: {
    subject: "Não conseguimos processar seu pagamento",
    html: (c) =>
      baseHtml(
        `Olá, ${escape(c.name)}`,
        `Tivemos um problema com o seu último pagamento. Você pode tentar novamente quando quiser — sua conta continua ativa.`,
        "Tentar novamente",
      ),
    text: (c) =>
      `Olá, ${c.name}. Tivemos um problema com seu pagamento. Tente novamente quando puder.`,
  },
};

function escape(s: string) {
  return s.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!,
  );
}

function baseHtml(heading: string, body: string, ctaLabel: string) {
  const url = "https://meubarao.com/app";
  return `<!doctype html><html lang="pt-BR"><body style="background:#ffffff;font-family:Georgia,serif;color:#1a1a1a;margin:0;padding:32px 16px;">
  <div style="max-width:520px;margin:0 auto;">
    <h1 style="font-size:22px;font-weight:400;color:#7a5a2a;margin:0 0 16px;">${heading}</h1>
    <p style="font-size:15px;line-height:1.6;margin:0 0 24px;">${body}</p>
    <a href="${url}" style="display:inline-block;background:#7a5a2a;color:#fff;text-decoration:none;padding:12px 22px;border-radius:6px;font-size:14px;letter-spacing:0.05em;">${ctaLabel}</a>
    <p style="font-size:11px;color:#888;margin-top:32px;">Meu Barão · ${new Date().getFullYear()}</p>
  </div></body></html>`;
}

// ── Channel: email (Lovable Email queue) ─────────────────────────────────
async function dispatchEmail(row: QueueRow, tpl: Template, ctx: TemplateCtx) {
  // Uses Lovable Email's enqueue_email RPC (created by setup_email_infra).
  // If the RPC is missing, the error surfaces and the row is retried/failed.
  const { error } = await supabaseAdmin.rpc(
    "enqueue_email" as never,
    {
      p_to: ctx.email,
      p_subject: tpl.subject,
      p_html: tpl.html(ctx),
      p_text: tpl.text(ctx),
      p_priority: "transactional",
      p_idempotency_key: row.dedupe_key,
    } as never,
  );
  if (error) {
    // If the function doesn't exist yet, surface a clean error.
    if (/function .*enqueue_email.* does not exist/i.test(error.message)) {
      throw new Error("email_infra_not_configured");
    }
    throw new Error(error.message);
  }
}

// ── Channel: whatsapp (Twilio via connector gateway) ─────────────────────
async function dispatchWhatsApp(
  _row: QueueRow,
  tpl: Template,
  ctx: TemplateCtx,
  phoneE164: string,
) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const twilioKey = process.env.TWILIO_API_KEY;
  if (!lovableKey || !twilioKey) throw new Error("whatsapp_not_configured");
  const from = process.env.TWILIO_WHATSAPP_FROM; // e.g. "whatsapp:+14155238886"
  if (!from) throw new Error("whatsapp_from_missing");

  const res = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": twilioKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      To: `whatsapp:${phoneE164}`,
      From: from,
      Body: tpl.text(ctx),
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`twilio_${res.status}:${t.slice(0, 200)}`);
  }
}

// ── Main drain ───────────────────────────────────────────────────────────
export async function dispatchReengagementQueue(): Promise<{
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
}> {
  const { data: rows, error } = await supabaseAdmin
    .from("reengagement_queue")
    .select("id, user_id, reason, channel, payload, attempts, dedupe_key")
    .eq("status", "pending")
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(BATCH);
  if (error) throw error;

  let sent = 0,
    failed = 0,
    skipped = 0;
  for (const r of (rows ?? []) as QueueRow[]) {
    const tpl = TEMPLATES[r.reason];
    if (!tpl) {
      await markFailed(r, "unknown_reason", true);
      skipped++;
      continue;
    }

    // Load recipient profile + email
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("display_name")
      .eq("id", r.user_id)
      .maybeSingle();
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(r.user_id);
    const email = authUser?.user?.email ?? null;
    if (!email) {
      await markFailed(r, "no_email_on_file", true);
      skipped++;
      continue;
    }
    const ctx: TemplateCtx = {
      name: (prof?.display_name as string) || (email.split("@")[0] ?? "amigo"),
      email,
      payload: r.payload ?? {},
    };

    try {
      if (r.channel === "whatsapp") {
        const phone = (authUser?.user?.phone as string) || "";
        if (!phone) throw new Error("no_phone_on_file");
        await dispatchWhatsApp(r, tpl, ctx, phone.startsWith("+") ? phone : `+${phone}`);
      } else {
        await dispatchEmail(r, tpl, ctx);
      }
      await supabaseAdmin
        .from("reengagement_queue")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          attempts: r.attempts + 1,
          error_text: null,
        })
        .eq("id", r.id);
      sent++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const giveUp =
        r.attempts + 1 >= MAX_ATTEMPTS ||
        msg === "email_infra_not_configured" ||
        msg === "whatsapp_not_configured";
      await markFailed(r, msg, giveUp);
      failed++;
    }
  }
  console.log("[retention:dispatch]", { processed: rows?.length ?? 0, sent, failed, skipped });
  return { processed: rows?.length ?? 0, sent, failed, skipped };
}

async function markFailed(r: QueueRow, reason: string, giveUp: boolean) {
  await supabaseAdmin
    .from("reengagement_queue")
    .update({
      status: giveUp ? "failed" : "pending",
      attempts: r.attempts + 1,
      error_text: reason.slice(0, 500),
      scheduled_at: giveUp
        ? new Date().toISOString()
        : new Date(Date.now() + Math.min(60, 5 * Math.pow(2, r.attempts)) * 60_000).toISOString(),
    })
    .eq("id", r.id);
}
