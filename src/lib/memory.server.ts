// Memory architecture v2 — server-side pipeline.
// Layers: temporary_conversation_chunks → user_memory_events → user_memory_summaries
//         → user_identity_memory (+ archived_memory for Elite).
//
// Public entry points:
//   - ingestExtractedFragments()   : dedup + score + persist (called from extract)
//   - retrieveMemoryContext()      : top-K retrieval for chat prompt injection
//   - consolidateAllMemories()     : cron — compression + decay + identity update
//   - captureAllPersonalityDrift() : retained from v1 for admin observability
//   - wipeUserMemory()             : downgrade-to-free hard wipe
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { resolveUserEntitlement } from "@/lib/entitlement.server";

// ─── Tier model ─────────────────────────────────────────────────────────────
export type MemoryTier = "free" | "premium" | "elite";

export async function getMemoryTier(userId: string): Promise<MemoryTier> {
  try {
    const ent = await resolveUserEntitlement(userId);
    const raw = String(ent.tier ?? "free").toLowerCase();
    if (raw === "elite") return "elite";
    if (raw === "free") return "free";
    return "premium"; // any paid tier that isn't elite
  } catch {
    return "free";
  }
}

const TIER_EVENT_TTL_DAYS: Record<MemoryTier, number> = {
  free: 0, // free never persists events
  premium: 30,
  elite: 90,
};
const TIER_MAX_SUMMARIES: Record<MemoryTier, number> = {
  free: 0,
  premium: 10,
  elite: 30,
};
const TIER_MAX_EVENTS: Record<MemoryTier, number> = {
  free: 0,
  premium: 80,
  elite: 240,
};

// ─── Text utilities ────────────────────────────────────────────────────────
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
const STOP = new Set([
  "a",
  "o",
  "e",
  "de",
  "do",
  "da",
  "das",
  "dos",
  "um",
  "uma",
  "que",
  "com",
  "para",
  "por",
  "no",
  "na",
  "nos",
  "nas",
  "em",
  "se",
  "sua",
  "seu",
  "suas",
  "seus",
  "ela",
  "ele",
  "eu",
  "me",
  "te",
  "mim",
  "ti",
  "is",
  "of",
  "the",
  "and",
  "to",
  "an",
  "on",
  "at",
  "as",
  "it",
  "be",
  "this",
  "that",
  "tem",
  "tinha",
  "ter",
  "muito",
  "mais",
  "mas",
  "como",
  "quando",
  "onde",
  "porque",
  "pra",
  "pro",
  "ja",
  "ainda",
]);
function tokens(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter((t) => t.length > 2 && !STOP.has(t));
}
function tokenSet(text: string): Set<string> {
  return new Set(tokens(text));
}
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

// Canonical key = category + top-3 sorted significant tokens.
// Two near-identical fragments collide on the same key and are merged.
export function makeCanonicalKey(category: string, content: string): string {
  const top = tokens(content).slice(0, 12).sort().slice(0, 3).join("-");
  return `${category.toLowerCase().slice(0, 30)}:${top}`.slice(0, 80);
}

// ─── Decay scoring ─────────────────────────────────────────────────────────
function recencyBoost(lastReinforcedAt: string | null): number {
  if (!lastReinforcedAt) return 0;
  const days = (Date.now() - Date.parse(lastReinforcedAt)) / 86400_000;
  // halves every 14 days
  return Math.max(0, Math.min(1, Math.pow(0.5, days / 14)));
}
export function computeDecayScore(input: {
  importance: number;
  emotional_weight: number;
  confidence: number;
  last_reinforced_at: string | null;
}): number {
  return Math.max(
    0,
    Math.min(
      1,
      input.importance * 0.4 +
        input.emotional_weight * 0.3 +
        recencyBoost(input.last_reinforced_at) * 0.2 +
        input.confidence * 0.1,
    ),
  );
}
const ARCHIVE_THRESHOLD = 0.25;
const DELETE_THRESHOLD = 0.1;

// ─── Ingest extracted fragments ────────────────────────────────────────────
export type ExtractedFragment = {
  category: string;
  entry_type: "fact" | "belief" | "emotion" | "fantasy" | "roleplay" | "preference";
  emotion: string | null;
  content: string;
  intensity?: number;
  confidence?: number;
  importance?: number;
  emotional_weight?: number;
};

// Cap por categoria — fantasy/belief não podem dominar a memória ativa.
const SOFT_CATEGORY_CAP_PCT = 0.3;
const SOFT_CAPPED_TYPES = new Set(["fantasy", "belief"]);

export async function ingestExtractedFragments(
  userId: string,
  fragments: ExtractedFragment[],
  requestStartedAt: Date = new Date(),
): Promise<{ saved: number; merged: number; skipped: number; fenced: number }> {
  const tier = await getMemoryTier(userId);
  if (tier === "free") return { saved: 0, merged: 0, skipped: fragments.length, fenced: 0 };
  if (fragments.length === 0) return { saved: 0, merged: 0, skipped: 0, fenced: 0 };

  // Wipe fence: se o profile foi wipado depois que a request começou, aborta tudo.
  // (defesa em profundidade — o RPC também checa por evento.)
  const { data: prof } = await supabaseAdmin
    .from("profiles")
    .select("memory_wipe_at")
    .eq("id", userId)
    .maybeSingle();
  const wipeAt = prof?.memory_wipe_at ? new Date(prof.memory_wipe_at as unknown as string) : null;
  if (wipeAt && wipeAt > requestStartedAt) {
    return { saved: 0, merged: 0, skipped: 0, fenced: fragments.length };
  }

  // Cap por categoria: conta quantos events ativos já são fantasy/belief.
  // Se já passou de 30%, ignora novos do mesmo tipo neste batch.
  const { count: totalActive } = await supabaseAdmin
    .from("user_memory_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  const { count: softCapped } = await supabaseAdmin
    .from("user_memory_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("entry_type", ["fantasy", "belief"]);
  const overCap =
    (totalActive ?? 0) > 0 && (softCapped ?? 0) / (totalActive ?? 1) >= SOFT_CATEGORY_CAP_PCT;

  const ttlDays = TIER_EVENT_TTL_DAYS[tier];
  const expiresAt = new Date(Date.now() + ttlDays * 86400_000).toISOString();
  const reqStartedIso = requestStartedAt.toISOString();

  let saved = 0;
  let merged = 0;
  let skipped = 0;
  let fenced = 0;

  for (const raw of fragments.slice(0, 8)) {
    const content = String(raw.content ?? "")
      .trim()
      .slice(0, 240);
    if (!content) {
      skipped++;
      continue;
    }
    const entryType = (raw.entry_type ?? "emotion") as ExtractedFragment["entry_type"];
    if (overCap && SOFT_CAPPED_TYPES.has(entryType)) {
      skipped++;
      continue;
    }
    const category = String(raw.category ?? "general")
      .toLowerCase()
      .slice(0, 40);
    const canonicalKey = makeCanonicalKey(category, content);
    const importance = clamp01(raw.importance ?? 0.5);
    const emotional_weight = clamp01(raw.emotional_weight ?? raw.intensity ?? 0.5);
    const confidence = clamp01(raw.confidence ?? 0.5);
    const intensity = clamp01(raw.intensity ?? emotional_weight);

    // RPC: upsert atômico com cap de reinforcement, cooldown anti-rumination
    // e wipe-fence dentro do mesmo statement (à prova de race condition).
    const { data: action, error } = await supabaseAdmin.rpc("ingest_memory_event", {
      _user_id: userId,
      _category: category,
      _canonical_key: canonicalKey,
      _entry_type: entryType,
      _emotion: raw.emotion ? String(raw.emotion).slice(0, 40) : null,
      _content: content,
      _importance: importance,
      _emotional_weight: emotional_weight,
      _confidence: confidence,
      _intensity: intensity,
      _expires_at: expiresAt,
      _request_started_at: reqStartedIso,
    } as never);

    if (error) {
      skipped++;
      continue;
    }
    if (action === "merged") merged++;
    else if (action === "inserted") saved++;
    else if (action === "rejected_wipe_fence") fenced++;
    else skipped++;
  }

  // Cap total active events per user (cheap pruning, real decay runs in cron)
  await enforceEventCap(userId, TIER_MAX_EVENTS[tier]);

  return { saved, merged, skipped, fenced };
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

async function enforceEventCap(userId: string, cap: number): Promise<void> {
  if (cap <= 0) return;
  const { data } = await supabaseAdmin
    .from("user_memory_events")
    .select("id")
    .eq("user_id", userId)
    .order("decay_score", { ascending: false })
    .range(cap, cap + 200);
  if (data && data.length > 0) {
    await supabaseAdmin
      .from("user_memory_events")
      .delete()
      .in(
        "id",
        data.map((r) => r.id),
      );
  }
}

// ─── Retrieval ─────────────────────────────────────────────────────────────
export type MemoryContext = {
  tier: MemoryTier;
  identity: Record<string, unknown> | null;
  state: {
    primary_emotion: string | null;
    intensity: number;
    context_summary: string | null;
  } | null;
  summaries: { theme: string; summary: string; emotional_weight: number }[];
  events: { category: string; emotion: string | null; content: string; emotional_weight: number }[];
};

export async function retrieveMemoryContext(userId: string): Promise<MemoryContext> {
  const tier = await getMemoryTier(userId);
  if (tier === "free") {
    return { tier, identity: null, state: null, summaries: [], events: [] };
  }

  const [identityRes, stateRes, summariesRes, eventsRes] = await Promise.all([
    supabaseAdmin
      .from("user_identity_memory")
      .select("profile")
      .eq("user_id", userId)
      .maybeSingle(),
    supabaseAdmin
      .from("user_emotional_state")
      .select("primary_emotion, intensity, context_summary")
      .eq("user_id", userId)
      .maybeSingle(),
    supabaseAdmin
      .from("user_memory_summaries")
      .select("theme, summary, emotional_weight, decay_score, confidence")
      .eq("user_id", userId)
      .gte("confidence", 0.4)
      .order("decay_score", { ascending: false })
      .limit(6),
    supabaseAdmin
      .from("user_memory_events")
      .select("category, emotion, content, emotional_weight, decay_score, entry_type, confidence")
      .eq("user_id", userId)
      .gte("confidence", 0.4)
      .order("decay_score", { ascending: false })
      .limit(8),
  ]);

  // Diversidade temática: no máximo 30% do top-K pode ser fantasy/belief.
  // Evita que fantasia romântica/crenças dominem o contexto injetado.
  type EventRow = {
    category: string;
    emotion: string | null;
    content: string;
    emotional_weight: number | null;
    decay_score: number | null;
    entry_type: string | null;
    confidence: number | null;
  };
  const rawEvents = (eventsRes.data ?? []) as EventRow[];
  const eventRows = enforceDiversityCap(rawEvents, 2);

  if (eventRows.length > 0) {
    await supabaseAdmin
      .from("user_memory_events")
      .update({ last_reinforced_at: new Date().toISOString() } as never)
      .eq("user_id", userId)
      .in(
        "content",
        eventRows.map((r) => r.content),
      );
  }

  return {
    tier,
    identity: (identityRes.data?.profile as Record<string, unknown> | null) ?? null,
    state: stateRes.data
      ? {
          primary_emotion: stateRes.data.primary_emotion ?? null,
          intensity: Number(stateRes.data.intensity ?? 0),
          context_summary: stateRes.data.context_summary ?? null,
        }
      : null,
    summaries: (summariesRes.data ?? []).map((s) => ({
      theme: s.theme,
      summary: s.summary,
      emotional_weight: Number(s.emotional_weight ?? 0),
    })),
    events: eventRows.map((e) => ({
      category: e.category,
      emotion: e.emotion,
      content: e.content,
      emotional_weight: Number(e.emotional_weight ?? 0),
    })),
  };
}

// Limita quantos eventos do top-K podem ser fantasy/belief.
// `maxSoftCap` é o teto absoluto desses tipos (≈30% de um top-K = 6/8).
function enforceDiversityCap<T extends { entry_type: string | null }>(
  rows: T[],
  maxSoftCap: number,
): T[] {
  const out: T[] = [];
  let softUsed = 0;
  for (const r of rows) {
    const soft = r.entry_type === "fantasy" || r.entry_type === "belief";
    if (soft && softUsed >= maxSoftCap) continue;
    out.push(r);
    if (soft) softUsed++;
    if (out.length >= 6) break; // top-K final
  }
  return out;
}

// Render retrieved context as a single compact system block (≤ ~600 tokens).
export function renderMemoryContextBlock(ctx: MemoryContext): string | null {
  if (ctx.tier === "free") return null;
  const lines: string[] = [];
  if (ctx.identity) {
    const i = ctx.identity as {
      patterns?: Array<{ key: string; value: string; confidence: number; status: string }>;
    };
    const bits: string[] = [];
    for (const p of i.patterns ?? []) {
      // Use soft hedged language since identity is probabilistic.
      const hedge = p.status === "reinforced" ? "tende a" : "talvez";
      bits.push(`${p.key}: ${hedge} ${p.value} (${Math.round(p.confidence * 100)}%)`);
    }
    if (bits.length)
      lines.push(`Identidade emocional dela (probabilística): ${bits.slice(0, 4).join(" · ")}`);
  }
  if (ctx.state?.primary_emotion) {
    lines.push(
      `Estado atual: ${ctx.state.primary_emotion}${ctx.state.context_summary ? ` — ${ctx.state.context_summary.slice(0, 120)}` : ""}`,
    );
  }
  if (ctx.summaries.length) {
    lines.push("Temas recorrentes:");
    for (const s of ctx.summaries) lines.push(`  · ${s.theme}: ${s.summary.slice(0, 180)}`);
  }
  if (ctx.events.length) {
    lines.push("Eco recente:");
    for (const e of ctx.events)
      lines.push(`  · (${e.category}${e.emotion ? `, ${e.emotion}` : ""}) ${e.content}`);
  }
  if (lines.length === 0) return null;
  return (
    "Memória emocional dela (use como contexto sutil — NUNCA cite literalmente, deixe apenas colorir presença):\n" +
    lines.join("\n")
  );
}

// ─── Downgrade wipe ────────────────────────────────────────────────────────
// Marca profiles.memory_wipe_at ANTES de deletar. ingestExtractedFragments
// e o RPC ingest_memory_event verificam isso para impedir que uma mensagem
// em voo (extract iniciado antes do wipe) "ressuscite" memória depois.
export async function wipeUserMemory(userId: string): Promise<void> {
  const wipeAt = new Date().toISOString();
  await supabaseAdmin
    .from("profiles")
    .update({ memory_wipe_at: wipeAt } as never)
    .eq("id", userId);

  await Promise.all([
    supabaseAdmin.from("temporary_conversation_chunks").delete().eq("user_id", userId),
    supabaseAdmin.from("user_memory_events").delete().eq("user_id", userId),
    supabaseAdmin.from("user_memory_summaries").delete().eq("user_id", userId),
    supabaseAdmin.from("user_identity_memory").delete().eq("user_id", userId),
    supabaseAdmin.from("user_emotional_state").delete().eq("user_id", userId),
    supabaseAdmin.from("archived_memory").delete().eq("user_id", userId),
  ]);
  await supabaseAdmin.from("memory_identity_history").insert({
    user_id: userId,
    key: "*",
    new_value: null,
    status: "cleared",
    reason: "wipe_user_memory",
  } as never);
}

// ─── Consolidation cron worker ─────────────────────────────────────────────
// Runs every 6h. Per-user: dedup pass, compression pass, decay + archive,
// identity reinforcement.
export async function consolidateAllMemories(): Promise<{
  usersProcessed: number;
  eventsCompressed: number;
  eventsArchived: number;
  eventsDeleted: number;
  identityUpdates: number;
}> {
  const { data: rows } = await supabaseAdmin
    .from("user_memory_events")
    .select("user_id")
    .limit(20000);
  const counts = new Map<string, number>();
  for (const r of rows ?? []) counts.set(r.user_id, (counts.get(r.user_id) ?? 0) + 1);
  const userIds = [...counts.keys()];

  let eventsCompressed = 0;
  let eventsArchived = 0;
  let eventsDeleted = 0;
  let identityUpdates = 0;
  for (const uid of userIds) {
    try {
      const r = await consolidateUser(uid);
      eventsCompressed += r.compressed;
      eventsArchived += r.archived;
      eventsDeleted += r.deleted;
      identityUpdates += r.identity;
    } catch (err) {
      console.error("[memory:consolidate] user failed", uid, err);
    }
  }
  return {
    usersProcessed: userIds.length,
    eventsCompressed,
    eventsArchived,
    eventsDeleted,
    identityUpdates,
  };
}

async function consolidateUser(userId: string): Promise<{
  compressed: number;
  archived: number;
  deleted: number;
  identity: number;
}> {
  const tier = await getMemoryTier(userId);
  if (tier === "free") {
    // free tier should have nothing — defensive wipe
    await wipeUserMemory(userId);
    return { compressed: 0, archived: 0, deleted: 0, identity: 0 };
  }

  // 1. Recompute decay_score for all events
  const { data: events } = await supabaseAdmin
    .from("user_memory_events")
    .select(
      "id, category, canonical_key, content, importance, emotional_weight, confidence, last_reinforced_at, reinforcement_count, emotion, entry_type",
    )
    .eq("user_id", userId);
  const evList = events ?? [];

  let deleted = 0;
  let archived = 0;
  for (const e of evList) {
    const decay = computeDecayScore({
      importance: Number(e.importance),
      emotional_weight: Number(e.emotional_weight),
      confidence: Number(e.confidence),
      last_reinforced_at: e.last_reinforced_at,
    });
    if (decay < DELETE_THRESHOLD) {
      await supabaseAdmin.from("user_memory_events").delete().eq("id", e.id);
      deleted++;
    } else if (decay < ARCHIVE_THRESHOLD && tier === "elite") {
      await supabaseAdmin.from("archived_memory").insert({
        user_id: userId,
        category: e.category,
        compressed_summary: e.content,
        source_count: e.reinforcement_count ?? 1,
      } as never);
      await supabaseAdmin.from("user_memory_events").delete().eq("id", e.id);
      archived++;
    } else if (decay < ARCHIVE_THRESHOLD) {
      await supabaseAdmin.from("user_memory_events").delete().eq("id", e.id);
      deleted++;
    } else {
      await supabaseAdmin
        .from("user_memory_events")
        .update({ decay_score: decay } as never)
        .eq("id", e.id);
    }
  }

  // 2. Compress: cluster surviving events by category, if a cluster has ≥3
  //    reinforced events, create/update a summary.
  const { data: survivors } = await supabaseAdmin
    .from("user_memory_events")
    .select(
      "category, content, emotion, emotional_weight, importance, confidence, reinforcement_count",
    )
    .eq("user_id", userId);
  const byCategory = new Map<string, typeof survivors>();
  for (const e of survivors ?? []) {
    const arr = byCategory.get(e.category) ?? [];
    arr.push(e);
    byCategory.set(e.category, arr);
  }
  let compressed = 0;
  for (const [category, items] of byCategory.entries()) {
    if (!items || items.length < 3) continue;
    const topEmotion = pickDominant(items.map((i) => i.emotion).filter(Boolean) as string[]);
    const avgEW = avg(items.map((i) => Number(i.emotional_weight)));
    const avgImp = avg(items.map((i) => Number(i.importance)));
    const avgConf = avg(items.map((i) => Number(i.confidence)));
    const summaryText = items
      .slice(0, 5)
      .map((i) => i.content)
      .join(" · ")
      .slice(0, 400);
    const theme = `${category}${topEmotion ? ` / ${topEmotion}` : ""}`.slice(0, 80);
    const lastReinforcedAt = new Date().toISOString();
    const decay = computeDecayScore({
      importance: avgImp,
      emotional_weight: avgEW,
      confidence: avgConf,
      last_reinforced_at: lastReinforcedAt,
    });

    // Upsert by (user_id, theme)
    const { data: existing } = await supabaseAdmin
      .from("user_memory_summaries")
      .select("id, source_event_count")
      .eq("user_id", userId)
      .eq("theme", theme)
      .maybeSingle();
    if (existing) {
      await supabaseAdmin
        .from("user_memory_summaries")
        .update({
          summary: summaryText,
          source_event_count: (existing.source_event_count ?? 0) + items.length,
          importance: avgImp,
          emotional_weight: avgEW,
          confidence: avgConf,
          decay_score: decay,
          last_reinforced_at: lastReinforcedAt,
          updated_at: lastReinforcedAt,
        } as never)
        .eq("id", existing.id);
    } else {
      await supabaseAdmin.from("user_memory_summaries").insert({
        user_id: userId,
        theme,
        summary: summaryText,
        source_event_count: items.length,
        importance: avgImp,
        emotional_weight: avgEW,
        confidence: avgConf,
        decay_score: decay,
        last_reinforced_at: lastReinforcedAt,
      } as never);
    }
    compressed += items.length;
  }

  // Cap summaries per tier
  await capSummaries(userId, TIER_MAX_SUMMARIES[tier]);

  // 3. Identity reinforcement (only confident, repeated patterns escalate)
  const identity = await refreshIdentity(userId);

  await supabaseAdmin.from("memory_consolidation_runs").insert({
    user_id: userId,
    before_count: evList.length,
    after_count: (survivors ?? []).length,
    removed_count: deleted + archived,
    details: { compressed, archived, deleted, identity, tier },
  } as never);

  return { compressed, archived, deleted, identity };
}

function avg(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((s, n) => s + n, 0) / xs.length;
}
function pickDominant(xs: string[]): string | null {
  if (xs.length === 0) return null;
  const counts = new Map<string, number>();
  for (const x of xs) counts.set(x, (counts.get(x) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

async function capSummaries(userId: string, cap: number): Promise<void> {
  if (cap <= 0) return;
  const { data } = await supabaseAdmin
    .from("user_memory_summaries")
    .select("id")
    .eq("user_id", userId)
    .order("decay_score", { ascending: false })
    .range(cap, cap + 100);
  if (data && data.length > 0) {
    await supabaseAdmin
      .from("user_memory_summaries")
      .delete()
      .in(
        "id",
        data.map((r) => r.id),
      );
  }
}

// ─── Identity v2.1 — probabilistic, history-tracked, conservative ──────────
//
// Rules:
// - Never declare attachment style as fact. Always store as
//   "possible_<x>_tendency" with a confidence ≤ 1.
// - Require N reinforcements AND a confidence floor to escalate to
//   `status="reinforced"`. Below floor → `status="probabilistic"`.
// - Fantasy / roleplay / belief never feed identity.
// - Every change is appended to memory_identity_history for reversibility.
// - User-facing labels stay soft ("possible_...") — no clinical wording.

const IDENTITY_REINFORCE_MIN = 4;
const IDENTITY_CONFIDENCE_FLOOR = 0.6;
const IDENTITY_REINFORCED_FLOOR = 0.75;

type IdentityPattern = {
  key: string;
  value: string;
  confidence: number;
  evidence_count: number;
  last_reinforced: string;
  status: "probabilistic" | "reinforced";
};

function softAttachmentLabel(dominantEmotion: string | null): string | null {
  if (!dominantEmotion) return null;
  const e = dominantEmotion.toLowerCase();
  if (["ansiedade", "medo", "inseguranca", "insegurança"].includes(e))
    return "possible_anxious_attachment_tendency";
  if (["raiva", "frustracao", "frustração", "irritacao"].includes(e))
    return "possible_avoidant_attachment_tendency";
  if (["tristeza", "saudade", "solidao", "solidão"].includes(e))
    return "possible_preoccupied_attachment_tendency";
  if (["calma", "alegria", "gratidao", "gratidão"].includes(e))
    return "possible_secure_attachment_tendency";
  return null;
}

async function refreshIdentity(userId: string): Promise<number> {
  // Mutex cross-request: impede 2 recálculos de identidade da mesma usuária
  // ao mesmo tempo (consolidação concorrente, admin recalc + cron, etc.).
  const lockKey = `mem.identity:${userId}`;
  const { data: gotLock } = await supabaseAdmin.rpc("try_memory_lock", {
    _key: lockKey,
    _ttl_seconds: 60,
  } as never);
  if (!gotLock) {
    console.info("[memory:refreshIdentity] skipped (lock held)", { userId });
    return 0;
  }
  try {
    return await refreshIdentityLocked(userId);
  } finally {
    await supabaseAdmin.rpc("release_memory_lock", { _key: lockKey } as never);
  }
}

async function refreshIdentityLocked(userId: string): Promise<number> {
  const { data: events } = await supabaseAdmin
    .from("user_memory_events")
    .select("category, entry_type, confidence, reinforcement_count, emotion")
    .eq("user_id", userId);
  const rows = events ?? [];
  if (rows.length === 0) return 0;

  // Identity is only fed by fact / preference / repeated emotion.
  // Belief / fantasy / roleplay NEVER contribute.
  const eligible = rows.filter(
    (r) =>
      (r.entry_type === "fact" || r.entry_type === "preference" || r.entry_type === "emotion") &&
      Number(r.confidence) >= IDENTITY_CONFIDENCE_FLOOR &&
      Number(r.reinforcement_count ?? 1) >= IDENTITY_REINFORCE_MIN,
  );
  if (eligible.length === 0) return 0;

  // Dominant emotion across ALL eligible rows (not just one bucket).
  const emotions = eligible.map((r) => r.emotion).filter((e): e is string => Boolean(e));
  const dominantEmotion = pickDominant(emotions);

  const patternCounts = new Map<string, number>();
  for (const e of eligible) {
    patternCounts.set(
      e.category,
      (patternCounts.get(e.category) ?? 0) + (e.reinforcement_count ?? 1),
    );
  }
  const dominantPatterns = [...patternCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k]) => k);

  const avgConfidence = eligible.reduce((s, r) => s + Number(r.confidence), 0) / eligible.length;
  // Confidence is dampened by sample size (5 eligible ≈ 0.45 scale, 20 ≈ 0.86).
  const sampleScale = Math.min(1, eligible.length / 12);
  const baseConfidence = clamp01(avgConfidence * (0.4 + 0.6 * sampleScale));

  const attachmentValue = softAttachmentLabel(dominantEmotion);
  const nowIso = new Date().toISOString();

  const patterns: IdentityPattern[] = [];
  if (attachmentValue) {
    patterns.push({
      key: "attachment_pattern",
      value: attachmentValue,
      confidence: baseConfidence,
      evidence_count: eligible.length,
      last_reinforced: nowIso,
      status: baseConfidence >= IDENTITY_REINFORCED_FLOOR ? "reinforced" : "probabilistic",
    });
  }
  if (dominantPatterns.length > 0) {
    patterns.push({
      key: "recurring_themes",
      value: dominantPatterns.slice(0, 3).join(", "),
      confidence: clamp01(baseConfidence * 0.9),
      evidence_count: eligible.length,
      last_reinforced: nowIso,
      status: baseConfidence >= IDENTITY_REINFORCED_FLOOR ? "reinforced" : "probabilistic",
    });
  }
  if (dominantEmotion) {
    patterns.push({
      key: "dominant_emotion_tendency",
      value: dominantEmotion,
      confidence: clamp01(baseConfidence * 0.95),
      evidence_count: emotions.length,
      last_reinforced: nowIso,
      status: baseConfidence >= IDENTITY_REINFORCED_FLOOR ? "reinforced" : "probabilistic",
    });
  }

  if (patterns.length === 0) return 0;

  // Diff against previous profile and write history entries only on change.
  const { data: prior } = await supabaseAdmin
    .from("user_identity_memory")
    .select("profile")
    .eq("user_id", userId)
    .maybeSingle();
  const priorPatterns = (prior?.profile as { patterns?: IdentityPattern[] } | null)?.patterns ?? [];

  const historyRows: Record<string, unknown>[] = [];
  for (const p of patterns) {
    const prev = priorPatterns.find((x) => x.key === p.key);
    if (!prev || prev.value !== p.value || Math.abs(prev.confidence - p.confidence) >= 0.05) {
      historyRows.push({
        user_id: userId,
        key: p.key,
        prev_value: prev?.value ?? null,
        new_value: p.value,
        confidence: p.confidence,
        evidence_count: p.evidence_count,
        status: p.status,
        reason: "consolidation_refresh",
      });
    }
  }
  if (historyRows.length > 0) {
    await supabaseAdmin.from("memory_identity_history").insert(historyRows as never);
  }

  const profile = {
    patterns,
    summary_confidence: baseConfidence,
    last_refreshed_at: nowIso,
  };

  await supabaseAdmin.from("user_identity_memory").upsert(
    {
      user_id: userId,
      profile,
      evidence_count: eligible.length,
      last_updated_at: nowIso,
    } as never,
    { onConflict: "user_id" },
  );
  return 1;
}

// ─── Public admin/job helpers ──────────────────────────────────────────────

export async function runMemoryTtlSweep(): Promise<{
  chunksDeleted: number;
  eventsDeleted: number;
}> {
  const nowIso = new Date().toISOString();
  const [chunks, events] = await Promise.all([
    supabaseAdmin
      .from("temporary_conversation_chunks")
      .delete({ count: "exact" })
      .lt("expires_at", nowIso),
    supabaseAdmin.from("user_memory_events").delete({ count: "exact" }).lt("expires_at", nowIso),
  ]);
  return {
    chunksDeleted: chunks.count ?? 0,
    eventsDeleted: events.count ?? 0,
  };
}

// Idempotent wrapper around a memory job.
// - Skips if a recent success/run finished within `cooldownMs`.
// - Defensively releases "running" rows older than STUCK_MS so a dead
//   worker doesn't deadlock the lock forever.
// - Wraps the work in a hard timeout to prevent infinite loops.
// - Always logs duration + outcome to memory_job_runs.
const STUCK_MS = 20 * 60_000; // any "running" past this is dead
const HARD_TIMEOUT_MS = 9 * 60_000; // per-run budget

export async function runIdempotentJob<T>(
  jobName: "ttl_sweep" | "consolidation",
  cooldownMs: number,
  fn: () => Promise<T>,
): Promise<
  | { status: "skipped"; reason: string; runId: null; result: null; durationMs: number }
  | { status: "success"; runId: string; result: T; durationMs: number }
  | { status: "error"; runId: string; error: string; durationMs: number }
> {
  const t0 = Date.now();
  // 1. Defensive watchdog — release stuck runs.
  await supabaseAdmin
    .from("memory_job_runs")
    .update({
      status: "error",
      finished_at: new Date().toISOString(),
      error: "stuck_run_released_by_watchdog",
    } as never)
    .eq("job_name", jobName)
    .eq("status", "running")
    .lt("started_at", new Date(Date.now() - STUCK_MS).toISOString());

  // 2. Cooldown check.
  const { data: recent } = await supabaseAdmin
    .from("memory_job_runs")
    .select("id, status, started_at")
    .eq("job_name", jobName)
    .gte("started_at", new Date(Date.now() - cooldownMs).toISOString())
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recent && (recent.status === "running" || recent.status === "success")) {
    return {
      status: "skipped",
      reason: `recent ${recent.status} run at ${recent.started_at}`,
      runId: null,
      result: null,
      durationMs: Date.now() - t0,
    };
  }

  // 3. Claim a run.
  const { data: started, error: startErr } = await supabaseAdmin
    .from("memory_job_runs")
    .insert({ job_name: jobName, status: "running" } as never)
    .select("id")
    .single();
  if (startErr || !started) {
    return {
      status: "error",
      runId: "",
      error: startErr?.message ?? "insert failed",
      durationMs: Date.now() - t0,
    };
  }
  const runId = (started as { id: string }).id;
  try {
    const result = await Promise.race<T>([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error("hard_timeout")), HARD_TIMEOUT_MS),
      ),
    ]);
    const durationMs = Date.now() - t0;
    await supabaseAdmin
      .from("memory_job_runs")
      .update({
        status: "success",
        finished_at: new Date().toISOString(),
        details: {
          ...(typeof result === "object" && result ? (result as Record<string, unknown>) : {}),
          durationMs,
        } as never,
      } as never)
      .eq("id", runId);
    return { status: "success", runId, result, durationMs };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const durationMs = Date.now() - t0;
    await supabaseAdmin
      .from("memory_job_runs")
      .update({
        status: "error",
        finished_at: new Date().toISOString(),
        error: msg.slice(0, 2000),
        details: { durationMs } as never,
      } as never)
      .eq("id", runId);
    return { status: "error", runId, error: msg, durationMs };
  }
}

export async function clearUserIdentity(userId: string, actor: string): Promise<void> {
  const { data: prior } = await supabaseAdmin
    .from("user_identity_memory")
    .select("profile")
    .eq("user_id", userId)
    .maybeSingle();
  await supabaseAdmin.from("user_identity_memory").delete().eq("user_id", userId);
  await supabaseAdmin.from("memory_identity_history").insert({
    user_id: userId,
    key: "*",
    prev_value: prior ? JSON.stringify(prior.profile).slice(0, 500) : null,
    new_value: null,
    status: "cleared",
    reason: `admin_clear:${actor}`,
  } as never);
}

export async function recalculateUserIdentity(userId: string): Promise<number> {
  return refreshIdentity(userId);
}

// ─── Personality drift (retained from v1) ──────────────────────────────────
const DRIFT_WINDOW_DAYS = 7;

type Snapshot = {
  avg_msg_length: number;
  msg_count_window: number;
  dominant_emotion: string | null;
  emotion_distribution: Record<string, number>;
  memory_count: number;
  segment: string | null;
};

async function buildSnapshot(userId: string): Promise<Snapshot | null> {
  const since = new Date(Date.now() - DRIFT_WINDOW_DAYS * 86400_000).toISOString();
  const { data: msgs } = await supabaseAdmin
    .from("chat_messages")
    .select("content")
    .eq("user_id", userId)
    .eq("role", "user")
    .gte("created_at", since)
    .limit(500);
  const userMsgs = msgs ?? [];
  if (userMsgs.length === 0) return null;
  const avgLen = userMsgs.reduce((s, m) => s + String(m.content).length, 0) / userMsgs.length;

  const { data: mems } = await supabaseAdmin
    .from("user_memory_events")
    .select("emotion")
    .eq("user_id", userId);
  const dist: Record<string, number> = {};
  for (const m of mems ?? []) {
    const e = (m.emotion ?? "").toString().trim().toLowerCase();
    if (!e) continue;
    dist[e] = (dist[e] ?? 0) + 1;
  }
  const dominant = Object.entries(dist).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const { data: seg } = await supabaseAdmin
    .from("user_segments")
    .select("segment")
    .eq("user_id", userId)
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    avg_msg_length: Number(avgLen.toFixed(1)),
    msg_count_window: userMsgs.length,
    dominant_emotion: dominant,
    emotion_distribution: dist,
    memory_count: (mems ?? []).length,
    segment: seg?.segment ?? null,
  };
}

function diffDist(a: Record<string, number>, b: Record<string, number>): number {
  const tA = Object.values(a).reduce((s, v) => s + v, 0) || 1;
  const tB = Object.values(b).reduce((s, v) => s + v, 0) || 1;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let delta = 0;
  for (const k of keys) delta += Math.abs((a[k] ?? 0) / tA - (b[k] ?? 0) / tB);
  return delta / 2;
}

async function snapshotForUser(userId: string): Promise<boolean> {
  const snap = await buildSnapshot(userId);
  if (!snap) return false;
  const { data: prior } = await supabaseAdmin
    .from("personality_snapshots")
    .select("avg_msg_length, dominant_emotion, emotion_distribution, segment")
    .eq("user_id", userId)
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const signals: Record<string, unknown> = {};
  let drift = 0;
  if (prior) {
    const lenDelta =
      Math.abs(snap.avg_msg_length - Number(prior.avg_msg_length ?? 0)) /
      Math.max(1, Number(prior.avg_msg_length ?? 0));
    const distDelta = diffDist(
      (prior.emotion_distribution as Record<string, number>) ?? {},
      snap.emotion_distribution,
    );
    const emotionShift = prior.dominant_emotion !== snap.dominant_emotion ? 1 : 0;
    const segmentShift = prior.segment !== snap.segment ? 1 : 0;
    drift =
      Math.min(1, lenDelta) * 0.25 + distDelta * 0.45 + emotionShift * 0.15 + segmentShift * 0.15;
    signals.length_delta_pct = Number((lenDelta * 100).toFixed(1));
    signals.emotion_distribution_delta = Number(distDelta.toFixed(3));
    signals.dominant_emotion_changed = !!emotionShift;
    signals.segment_changed = !!segmentShift;
    signals.previous_dominant = prior.dominant_emotion;
    signals.previous_segment = prior.segment;
  } else {
    signals.first_snapshot = true;
  }

  await supabaseAdmin.from("personality_snapshots").insert({
    user_id: userId,
    avg_msg_length: snap.avg_msg_length,
    msg_count_window: snap.msg_count_window,
    dominant_emotion: snap.dominant_emotion,
    emotion_distribution: snap.emotion_distribution,
    memory_count: snap.memory_count,
    segment: snap.segment,
    drift_score: Number(drift.toFixed(3)),
    drift_signals: signals as never,
  } as never);
  return true;
}

export async function captureAllPersonalityDrift(): Promise<{
  usersProcessed: number;
  snapshotsCreated: number;
}> {
  const since = new Date(Date.now() - DRIFT_WINDOW_DAYS * 86400_000).toISOString();
  const { data: active } = await supabaseAdmin
    .from("chat_messages")
    .select("user_id")
    .gte("created_at", since)
    .limit(5000);
  const ids = new Set<string>();
  for (const r of active ?? []) ids.add(r.user_id);

  let created = 0;
  for (const uid of ids) {
    try {
      if (await snapshotForUser(uid)) created++;
    } catch (err) {
      console.error("[personality:drift] user failed", uid, err);
    }
  }
  return { usersProcessed: ids.size, snapshotsCreated: created };
}
