// Brute-force gate for admin login. Called from /admin/login on the client.
// Returns { blocked } so the UI can refuse before any further attempt.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequestHeader } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { hashIp } from "@/lib/ops.server";

const Input = z.object({
  email: z.string().email().max(254),
  success: z.boolean(),
});

export const registerAdminLoginAttempt = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }) => {
    const ipRaw = getRequestHeader("x-forwarded-for") ?? getRequestHeader("cf-connecting-ip") ?? "";
    const ua = (getRequestHeader("user-agent") ?? "").slice(0, 240);
    const ipHash = await hashIp(ipRaw.split(",")[0]?.trim() || null);

    const { data: res, error } = await supabaseAdmin.rpc("register_admin_login_attempt", {
      _email: data.email,
      _ip_hash: ipHash ?? "",
      _success: data.success,
      _user_agent: ua,
    });
    if (error) {
      console.error("[admin-login:gate] rpc failed", error);
      return { blocked: false, recentFailures: 0 };
    }
    const r = (res ?? {}) as { blocked?: boolean; recent_failures?: number };
    return {
      blocked: !!r.blocked,
      recentFailures: Number(r.recent_failures ?? 0),
    };
  });
