// Account status server functions — used by the frontend to enforce blocking
// at every authenticated boundary (route layout, root listener, chat endpoint).
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Returns the current account status of the authenticated caller.
 * Single source of truth for "is this user blocked".
 */
export const checkAccountStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: lock } = await supabaseAdmin
      .from("account_locks")
      .select("reason, expires_at, locked_at")
      .eq("user_id", context.userId)
      .is("unlocked_at", null)
      .order("locked_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lock) return { blocked: false as const };
    if (lock.expires_at && new Date(lock.expires_at) < new Date()) {
      return { blocked: false as const };
    }
    return {
      blocked: true as const,
      reason: lock.reason,
      lockedAt: lock.locked_at,
      expiresAt: lock.expires_at,
    };
  });
