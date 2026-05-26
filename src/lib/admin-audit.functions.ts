// Read access to the role-change audit log. Super admin only.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const listAuditLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        limit: z.number().int().min(1).max(500).optional(),
        targetEmail: z.string().email().optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    // Verify caller is super_admin (defense in depth on top of RLS).
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role, disabled_at")
      .eq("user_id", context.userId)
      .eq("role", "super_admin")
      .is("disabled_at", null)
      .maybeSingle();
    if (!roles) {
      console.warn("[admin-audit] denied — not super_admin", { userId: context.userId });
      throw new Error("Forbidden: super_admin only");
    }

    let q = supabaseAdmin
      .from("admin_audit_log")
      .select(
        "id, occurred_at, actor_email, target_email, action, old_role, new_role, ip_address, details",
      )
      .order("occurred_at", { ascending: false })
      .limit(data.limit ?? 200);
    if (data.targetEmail) q = q.eq("target_email", data.targetEmail);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });
