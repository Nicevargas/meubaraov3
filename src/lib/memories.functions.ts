import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  getMemoryTier,
  ingestExtractedFragments,
  retrieveMemoryContext,
  type ExtractedFragment,
} from "@/lib/memory.server";

const MsgSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(8000),
});

const ExtractInput = z.object({
  messages: z.array(MsgSchema).min(1).max(12),
});

const EXTRACT_PROMPT = `Você analisa um trecho curto de conversa entre uma mulher e o Meu Barão.
Extraia APENAS fragmentos emocionalmente úteis, psicologicamente coerentes e duradouros.

Para cada fragmento decida o TIPO:
- "fact"        → fato objetivo confirmado por ela (nome, profissão, filhos)
- "preference"  → preferência clara e estável (gosta de silêncio, prefere noite)
- "emotion"     → estado/padrão emocional recorrente (medo de abandono)
- "belief"      → crença subjetiva dela (acredita ser sensitiva, espiritual)
- "fantasy"     → desejo simbólico/romântico (não trate como fato)
- "roleplay"    → ela está encenando um cenário (não trate como fato)

Critérios para extrair:
- Tem valor de longo prazo (não é só clima passageiro)
- Confirmado pela usuária, não suposto pelo Barão
- Não é cumprimento, small talk ou conteúdo sensível (CPF, endereço, senha)
- Não é sexual explícito

CADA fragmento DEVE ter:
- type ∈ {fact, belief, emotion, fantasy, roleplay, preference}
- category (slug curto: relationship_loss, work_stress, attachment, self_image, ...)
- content (frase compactada em 3ª pessoa, máx 140 chars)
- emotion (palavra única ou null)
- intensity 0..1
- importance 0..1
- emotional_weight 0..1
- confidence 0..1   (quão certo você está; crenças/fantasias devem ser ≤ 0.5)

Responda em JSON estrito:
{"fragments":[{"type":"emotion","category":"relationship_loss","content":"...","emotion":"saudade","intensity":0.7,"importance":0.6,"emotional_weight":0.8,"confidence":0.75}]}

Se nada for útil, responda {"fragments":[]}.`;

export const extractMemories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ExtractInput.parse(input))
  .handler(async ({ data, context }) => {
    const requestStartedAt = new Date();
    const key = process.env.DEEPSEEK_API_KEY;
    if (!key) return { saved: 0, merged: 0, skipped: 0 };

    const tier = await getMemoryTier(context.userId);
    if (tier === "free") {
      return { saved: 0, merged: 0, skipped: 0, locked: true as const };
    }

    const transcript = data.messages
      .map((m) => `${m.role === "user" ? "USUÁRIA" : "MEU BARÃO"}: ${m.content}`)
      .join("\n");

    const upstream = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: EXTRACT_PROMPT },
          { role: "user", content: transcript },
        ],
        temperature: 0.2,
        max_tokens: 700,
      }),
    });

    if (!upstream.ok) return { saved: 0, merged: 0, skipped: 0 };
    const raw = (await upstream.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = raw.choices?.[0]?.message?.content ?? "{}";

    let parsed: {
      fragments?: Array<Partial<ExtractedFragment & { type?: string }>>;
    } = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      return { saved: 0, merged: 0, skipped: 0 };
    }
    const allowedTypes: ExtractedFragment["entry_type"][] = [
      "fact",
      "belief",
      "emotion",
      "fantasy",
      "roleplay",
      "preference",
    ];
    const fragments: ExtractedFragment[] = (parsed.fragments ?? [])
      .filter((f) => typeof f.content === "string" && f.content.trim().length > 0)
      .map((f) => {
        const t = String(f.type ?? "emotion") as ExtractedFragment["entry_type"];
        return {
          category: String(f.category ?? "general"),
          entry_type: allowedTypes.includes(t) ? t : "emotion",
          emotion: f.emotion ?? null,
          content: String(f.content).trim(),
          intensity: typeof f.intensity === "number" ? f.intensity : 0.5,
          confidence: typeof f.confidence === "number" ? f.confidence : 0.5,
          importance: typeof f.importance === "number" ? f.importance : 0.5,
          emotional_weight: typeof f.emotional_weight === "number" ? f.emotional_weight : 0.5,
        };
      });

    return ingestExtractedFragments(context.userId, fragments, requestStartedAt);
  });

// Server-side helper used by the chat route. Returns top-K, ready-to-inject.
export const getRelevantMemories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = await retrieveMemoryContext(context.userId);
    // Flatten to legacy shape consumers expect: list of {type, content, emotion}
    if (ctx.tier === "free") return [];
    return ctx.events.map((e) => ({
      type: e.category,
      content: e.content,
      emotion: e.emotion,
    }));
  });

// Used by the new memories page to show summaries + identity.
export const getMemoryDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tier = await getMemoryTier(context.userId);
    if (tier === "free") {
      return { tier, identity: null, summaries: [], events: [] };
    }
    const [identity, summaries, events] = await Promise.all([
      supabaseAdmin
        .from("user_identity_memory")
        .select("profile, evidence_count, last_updated_at")
        .eq("user_id", context.userId)
        .maybeSingle(),
      supabaseAdmin
        .from("user_memory_summaries")
        .select(
          "id, theme, summary, source_event_count, emotional_weight, decay_score, last_reinforced_at",
        )
        .eq("user_id", context.userId)
        .order("decay_score", { ascending: false })
        .limit(20),
      supabaseAdmin
        .from("user_memory_events")
        .select("id, category, emotion, content, emotional_weight, decay_score, last_reinforced_at")
        .eq("user_id", context.userId)
        .order("decay_score", { ascending: false })
        .limit(40),
    ]);
    return {
      tier,
      identity: identity.data ?? null,
      summaries: summaries.data ?? [],
      events: events.data ?? [],
    };
  });
