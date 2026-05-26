// Server fns for the /admin/retention panel.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logAdminAction } from "@/lib/ops.server";

async function assertSuperAdmin(userId: string): Promise<void> {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role, disabled_at")
    .eq("user_id", userId);
  const active = (data ?? []).filter((r) => !r.disabled_at);
  if (!active.some((r) => r.role === "super_admin")) {
    throw new Error("Forbidden: super_admin only");
  }
}
import { dispatchReengagementQueue } from "@/lib/retention-dispatch.server";

export const getRetentionOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.userId);

    const [{ data: queue }, { data: reports }, { data: retries }] = await Promise.all([
      supabaseAdmin
        .from("reengagement_queue")
        .select(
          "id, user_id, reason, channel, status, attempts, scheduled_at, sent_at, error_text, created_at, dedupe_key",
        )
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseAdmin
        .from("daily_ops_reports")
        .select("*")
        .order("report_date", { ascending: false })
        .limit(7),
      supabaseAdmin
        .from("payment_retry_attempts")
        .select("id, payment_id, user_id, attempt_number, status, attempted_at")
        .order("attempted_at", { ascending: false })
        .limit(20),
    ]);

    const counts = (queue ?? []).reduce(
      (acc, r) => {
        const k = r.status as string;
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
      },
      { pending: 0, sent: 0, failed: 0 } as Record<string, number>,
    );

    return { queue: queue ?? [], reports: reports ?? [], retries: retries ?? [], counts };
  });

export const triggerRetentionDispatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ reason: z.string().min(3).max(120) }).parse(d))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.userId);
    const res = await dispatchReengagementQueue();
    await logAdminAction({
      actorId: context.userId,
      actionType: "retention_dispatch_manual",
      payload: { reason: data.reason, ...res },
      status: "success",
    });
    return res;
  });

export const requeueReengagementItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("reengagement_queue")
      .update({
        status: "pending",
        attempts: 0,
        error_text: null,
        scheduled_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAdminAction({
      actorId: context.userId,
      actionType: "reengagement_requeue",
      targetType: "reengagement_queue",
      targetId: data.id,
      status: "success",
    });
    return { ok: true };
  });
