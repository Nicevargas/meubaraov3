// Admin server functions for the Memory v2 architecture.
// Super-admin only. Surfaces operational metrics and exposes manual
// controls for the TTL sweep + consolidation jobs and per-user audits.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  clearUserIdentity,
  consolidateAllMemories,
  recalculateUserIdentity,
  runIdempotentJob,
  runMemoryTtlSweep,
} from "@/lib/memory.server";

async function assertSuperAdmin(userId: string): Promise<void> {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role, disabled_at")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .is("disabled_at", null)
    .maybeSingle();
  if (!data) throw new Error("Forbidden: super_admin only");
}

// ─── Stats dashboard ───────────────────────────────────────────────────────
export const getMemoryV2Stats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.userId);

    const nowIso = new Date().toISOString();

    const [
      chunksAll,
      eventsAll,
      summariesAll,
      identityAll,
      stateAll,
      archivedAll,
      chunksExpired,
      eventsExpired,
      eventsSample,
      identityHistorySample,
      consolidationRunsRecent,
      jobRunsRecent,
    ] = await Promise.all([
      supabaseAdmin
        .from("temporary_conversation_chunks")
        .select("id", { head: true, count: "exact" }),
      supabaseAdmin.from("user_memory_events").select("id", { head: true, count: "exact" }),
      supabaseAdmin.from("user_memory_summaries").select("id", { head: true, count: "exact" }),
      supabaseAdmin.from("user_identity_memory").select("user_id", { head: true, count: "exact" }),
      supabaseAdmin.from("user_emotional_state").select("user_id", { head: true, count: "exact" }),
      supabaseAdmin.from("archived_memory").select("id", { head: true, count: "exact" }),
      supabaseAdmin
        .from("temporary_conversation_chunks")
        .select("id", { head: true, count: "exact" })
        .lt("expires_at", nowIso),
      supabaseAdmin
        .from("user_memory_events")
        .select("id", { head: true, count: "exact" })
        .lt("expires_at", nowIso),
      supabaseAdmin
        .from("user_memory_events")
        .select(
          "user_id, entry_type, confidence, importance, emotional_weight, canonical_key, reinforcement_count",
        )
        .limit(5000),
      supabaseAdmin
        .from("memory_identity_history")
        .select("id, user_id, key, prev_value, new_value, confidence, status, reason, recorded_at")
        .order("recorded_at", { ascending: false })
        .limit(20),
      supabaseAdmin
        .from("memory_consolidation_runs")
        .select("user_id, ran_at, before_count, after_count, removed_count, details")
        .order("ran_at", { ascending: false })
        .limit(10),
      supabaseAdmin
        .from("memory_job_runs")
        .select("id, job_name, status, started_at, finished_at, details, error")
        .order("started_at", { ascending: false })
        .limit(20),
    ]);

    const sample = eventsSample.data ?? [];
    const typeCounts: Record<string, number> = {
      fact: 0,
      belief: 0,
      emotion: 0,
      fantasy: 0,
      roleplay: 0,
      preference: 0,
    };
    let confSum = 0;
    let impSum = 0;
    let ewSum = 0;
    const byUser = new Map<string, number>();
    const canonicalSeen = new Map<string, number>();
    let duplicateCollisions = 0;
    for (const r of sample) {
      typeCounts[r.entry_type] = (typeCounts[r.entry_type] ?? 0) + 1;
      confSum += Number(r.confidence);
      impSum += Number(r.importance);
      ewSum += Number(r.emotional_weight);
      byUser.set(r.user_id, (byUser.get(r.user_id) ?? 0) + 1);
      const ck = `${r.user_id}:${r.canonical_key}`;
      const prev = canonicalSeen.get(ck) ?? 0;
      if (prev > 0) duplicateCollisions++;
      canonicalSeen.set(ck, prev + 1);
    }
    const n = Math.max(1, sample.length);

    const topUsers = [...byUser.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([userId, count]) => ({ userId, eventCount: count }));

    // Free users that wrongly have persisted memory (defensive check).
    const userIdsWithEvents = [...byUser.keys()];
    let freeWithMemory: { userId: string; eventCount: number }[] = [];
    if (userIdsWithEvents.length > 0) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, plan")
        .in("id", userIdsWithEvents);
      const freeIds = new Set((profs ?? []).filter((p) => p.plan === "free").map((p) => p.id));
      freeWithMemory = topUsers
        .filter((u) => freeIds.has(u.userId))
        .concat(
          [...byUser.entries()]
            .filter(([uid]) => freeIds.has(uid))
            .map(([userId, count]) => ({ userId, eventCount: count })),
        )
        .filter((v, i, a) => a.findIndex((x) => x.userId === v.userId) === i)
        .slice(0, 20);
    }

    const lastTtl = (jobRunsRecent.data ?? []).find((r) => r.job_name === "ttl_sweep") ?? null;
    const lastCons = (jobRunsRecent.data ?? []).find((r) => r.job_name === "consolidation") ?? null;
    const recentErrors = (jobRunsRecent.data ?? []).filter((r) => r.status === "error").slice(0, 5);

    const consolidatedEvents = sample.filter((r) => (r.reinforcement_count ?? 1) > 1).length;

    // ── Operational derived metrics ────────────────────────────────────
    const activeUsersWithMem = byUser.size || 1;
    const avgMemPerUser = sample.length / activeUsersWithMem;

    // Compression done in last 24h (sum of details.compressed across runs)
    const dayAgo = new Date(Date.now() - 86400_000).toISOString();
    const { data: dayRuns } = await supabaseAdmin
      .from("memory_consolidation_runs")
      .select("removed_count, details")
      .gte("ran_at", dayAgo)
      .limit(500);
    let compressedToday = 0;
    let archivedDeletedToday = 0;
    for (const r of dayRuns ?? []) {
      const d = (r.details ?? {}) as { compressed?: number; archived?: number; deleted?: number };
      compressedToday += d.compressed ?? 0;
      archivedDeletedToday += (d.archived ?? 0) + (d.deleted ?? 0);
    }
    // Token savings estimate: each merged/compressed event ≈ 80 tokens saved
    const estTokenSavingsToday = (consolidatedEvents + compressedToday) * 80;
    // Dedup efficiency = collisions / sampled (higher means more dedup happening)
    const dedupEfficiency =
      sample.length > 0 ? Number((duplicateCollisions / sample.length).toFixed(3)) : 0;
    // Decay rate = archived+deleted / (events + archived+deleted) over 24h
    const decayRate =
      (eventsAll.count ?? 0) > 0
        ? Number(
            (archivedDeletedToday / ((eventsAll.count ?? 0) + archivedDeletedToday)).toFixed(3),
          )
        : 0;
    // Users with excessive memory: > 60 events on premium, > 180 on elite
    const excessiveUsers = topUsers.filter((u) => u.eventCount > 60).slice(0, 10);

    return {
      layers: {
        temporaryChunks: chunksAll.count ?? 0,
        events: eventsAll.count ?? 0,
        summaries: summariesAll.count ?? 0,
        identities: identityAll.count ?? 0,
        emotionalStates: stateAll.count ?? 0,
        archived: archivedAll.count ?? 0,
      },
      expiredPendingCleanup: {
        chunks: chunksExpired.count ?? 0,
        events: eventsExpired.count ?? 0,
      },
      operational: {
        compressedToday,
        archivedOrDeletedToday: archivedDeletedToday,
        estTokenSavingsToday,
        avgMemPerUser: Number(avgMemPerUser.toFixed(1)),
        dedupEfficiency,
        decayRate,
        excessiveUsers,
      },
      pipeline: {
        sampledEvents: sample.length,
        duplicateCollisions,
        consolidatedEvents,
        avgConfidence: Number((confSum / n).toFixed(3)),
        avgImportance: Number((impSum / n).toFixed(3)),
        avgEmotionalWeight: Number((ewSum / n).toFixed(3)),
        typeCounts,
      },
      topUsers,
      freeWithMemory,
      jobs: {
        lastTtlSweep: lastTtl,
        lastConsolidation: lastCons,
        recentRuns: jobRunsRecent.data ?? [],
        recentConsolidations: consolidationRunsRecent.data ?? [],
        recentErrors,
      },
      identityHistorySample: identityHistorySample.data ?? [],
    };
  });

// ─── Manual controls ───────────────────────────────────────────────────────
export const runMemoryTtlSweepNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.userId);
    // 5 minute cooldown for manual button.
    const res = await runIdempotentJob("ttl_sweep", 5 * 60_000, runMemoryTtlSweep);
    return res;
  });

export const runMemoryConsolidationNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.userId);
    // 15 minute cooldown — consolidation is expensive.
    const res = await runIdempotentJob("consolidation", 15 * 60_000, consolidateAllMemories);
    return res;
  });

// ─── Per-user audit ────────────────────────────────────────────────────────
const UserIdInput = z.object({ userId: z.string().uuid() });

export const auditUserMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => UserIdInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    const uid = data.userId;
    const [profile, identity, state, events, summaries, archived, history, chunks] =
      await Promise.all([
        supabaseAdmin.from("profiles").select("id, display_name, plan").eq("id", uid).maybeSingle(),
        supabaseAdmin
          .from("user_identity_memory")
          .select("profile, evidence_count, last_updated_at")
          .eq("user_id", uid)
          .maybeSingle(),
        supabaseAdmin
          .from("user_emotional_state")
          .select("primary_emotion, secondary_emotion, intensity, context_summary, updated_at")
          .eq("user_id", uid)
          .maybeSingle(),
        supabaseAdmin
          .from("user_memory_events")
          .select(
            "id, category, entry_type, emotion, content, confidence, importance, emotional_weight, decay_score, reinforcement_count, expires_at, last_reinforced_at",
          )
          .eq("user_id", uid)
          .order("decay_score", { ascending: false })
          .limit(50),
        supabaseAdmin
          .from("user_memory_summaries")
          .select(
            "id, theme, summary, source_event_count, confidence, decay_score, last_reinforced_at",
          )
          .eq("user_id", uid)
          .order("decay_score", { ascending: false })
          .limit(30),
        supabaseAdmin
          .from("archived_memory")
          .select("id, category, compressed_summary, source_count, archived_at")
          .eq("user_id", uid)
          .order("archived_at", { ascending: false })
          .limit(30),
        supabaseAdmin
          .from("memory_identity_history")
          .select(
            "id, key, prev_value, new_value, confidence, evidence_count, status, reason, recorded_at",
          )
          .eq("user_id", uid)
          .order("recorded_at", { ascending: false })
          .limit(30),
        supabaseAdmin
          .from("temporary_conversation_chunks")
          .select("id", { head: true, count: "exact" })
          .eq("user_id", uid),
      ]);

    return {
      profile: profile.data,
      identity: identity.data,
      state: state.data,
      events: events.data ?? [],
      summaries: summaries.data ?? [],
      archived: archived.data ?? [],
      identityHistory: history.data ?? [],
      chunkCount: chunks.count ?? 0,
    };
  });

export const clearUserIdentityFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => UserIdInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    await clearUserIdentity(data.userId, context.userId);
    return { ok: true };
  });

export const recalculateUserIdentityFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => UserIdInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    const n = await recalculateUserIdentity(data.userId);
    return { updated: n };
  });
