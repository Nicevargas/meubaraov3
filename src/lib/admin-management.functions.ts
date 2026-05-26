// Admin lifecycle management — create / disable / promote / demote / self-rotate password.
// All mutating operations require super_admin. Read operations require admin or super_admin.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { AdminRole } from "@/lib/admin.functions";

const ASSIGNABLE_ROLES = [
  "super_admin",
  "admin",
  "moderator",
  "support",
  "finance",
  "analytics",
] as const;
type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

async function rolesOf(userId: string): Promise<AdminRole[]> {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .is("disabled_at", null);
  return (data ?? []).map((r) => r.role as AdminRole);
}

function isSuper(roles: AdminRole[]) {
  return roles.includes("super_admin");
}

async function requireSuperAdmin(callerId: string) {
  const roles = await rolesOf(callerId);
  if (!isSuper(roles)) {
    console.warn("[admin-mgmt] access denied — caller not super_admin", { callerId, roles });
    throw new Error("Forbidden: super_admin only");
  }
  return roles;
}

async function countActiveSuperAdmins(): Promise<number> {
  const { count } = await supabaseAdmin
    .from("user_roles")
    .select("user_id", { count: "exact", head: true })
    .eq("role", "super_admin")
    .is("disabled_at", null);
  return count ?? 0;
}

function generateTempPassword(): string {
  // Random unguessable password — never returned to the caller.
  // Used only to satisfy auth.admin.createUser() so the row exists and
  // can immediately receive a password-reset email.
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += charset[b % charset.length];
  return out + "!9Aa";
}

function resolveSiteUrl(): string {
  const raw = process.env.SITE_URL ?? "https://meubarao.com";
  // Never leak localhost into production invite emails.
  if (/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(raw)) {
    return "https://meubarao.com";
  }
  return raw.replace(/\/$/, "");
}

async function sendAdminInviteEmail(
  email: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const redirectTo = `${resolveSiteUrl()}/reset-password`;
  console.warn("[admin-invite] dispatching recovery email", { email, redirectTo });
  const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) {
    console.error("[admin-invite] email dispatch failed", { email, error: error.message });
    return { ok: false, error: error.message };
  }
  console.info("[admin-invite] email dispatched", { email });
  return { ok: true };
}

// ── List admins ─────────────────────────────────────────────────────────
export const listAdminAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const callerRoles = await rolesOf(context.userId);
    if (callerRoles.length === 0) throw new Error("Forbidden");

    const { data: rows, error } = await supabaseAdmin
      .from("user_roles")
      .select("id, user_id, role, disabled_at, must_change_password, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const userIds = [...new Set((rows ?? []).map((r) => r.user_id))];
    if (userIds.length === 0) return { accounts: [] };

    const [{ data: authList }, { data: profiles }] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      supabaseAdmin.from("profiles").select("id, display_name").in("id", userIds),
    ]);
    const emailMap = new Map<string, string>();
    const lastSignIn = new Map<string, string | null>();
    for (const u of authList?.users ?? []) {
      if (u.email) emailMap.set(u.id, u.email);
      lastSignIn.set(u.id, u.last_sign_in_at ?? null);
    }
    const nameMap = new Map<string, string | null>();
    for (const p of profiles ?? []) nameMap.set(p.id, p.display_name);

    // Aggregate per-user roles
    const byUser = new Map<
      string,
      {
        userId: string;
        email: string | null;
        displayName: string | null;
        roles: { role: AdminRole; disabled: boolean; mustChangePassword: boolean }[];
        lastSignInAt: string | null;
        createdAt: string;
      }
    >();
    for (const r of rows ?? []) {
      const existing = byUser.get(r.user_id);
      const entry = {
        role: r.role as AdminRole,
        disabled: !!r.disabled_at,
        mustChangePassword: !!r.must_change_password,
      };
      if (existing) {
        existing.roles.push(entry);
      } else {
        byUser.set(r.user_id, {
          userId: r.user_id,
          email: emailMap.get(r.user_id) ?? null,
          displayName: nameMap.get(r.user_id) ?? null,
          roles: [entry],
          lastSignInAt: lastSignIn.get(r.user_id) ?? null,
          createdAt: r.created_at,
        });
      }
    }

    // Non-super admins MUST NOT see super_admins
    let accounts = [...byUser.values()];
    if (!isSuper(callerRoles)) {
      accounts = accounts.filter((a) => !a.roles.some((r) => r.role === "super_admin"));
    }

    return { accounts };
  });

// ── Create admin ────────────────────────────────────────────────────────
export const createAdminAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        email: z.string().email().max(255),
        displayName: z.string().min(1).max(120),
        role: z.enum(ASSIGNABLE_ROLES),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context.userId);
    const tempPassword = generateTempPassword();

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { display_name: data.displayName },
    });
    if (createErr || !created.user) {
      console.error("[admin-mgmt] createUser failed", createErr?.message);
      throw new Error(createErr?.message ?? "failed to create user");
    }

    await supabaseAdmin
      .from("profiles")
      .upsert(
        { id: created.user.id, display_name: data.displayName, onboarding_completed: true },
        { onConflict: "id" },
      );

    const { error: roleErr } = await supabaseAdmin.from("user_roles").insert({
      user_id: created.user.id,
      role: data.role,
      must_change_password: true,
      granted_by: context.userId,
    });
    if (roleErr) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error(roleErr.message);
    }

    console.info("[admin-mgmt] admin created", {
      grantedBy: context.userId,
      newUserId: created.user.id,
      role: data.role,
    });

    // Send password setup email. The new admin defines their own password
    // through the secure recovery link — we never expose the temp password.
    const invite = await sendAdminInviteEmail(data.email);

    return {
      userId: created.user.id,
      email: data.email,
      role: data.role,
      inviteSent: invite.ok,
      inviteError: invite.ok ? null : invite.error,
    };
  });

// ── Resend invite email ────────────────────────────────────────────────
export const resendAdminInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ targetUserId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context.userId);
    const { data: target, error } = await supabaseAdmin.auth.admin.getUserById(data.targetUserId);
    if (error || !target.user?.email) {
      throw new Error(error?.message ?? "User has no email");
    }
    const res = await sendAdminInviteEmail(target.user.email);
    if (!res.ok) throw new Error(res.error);
    return { ok: true, email: target.user.email };
  });

// ── Disable / enable ────────────────────────────────────────────────────
export const setAdminDisabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ targetUserId: z.string().uuid(), disabled: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context.userId);
    if (data.targetUserId === context.userId) {
      throw new Error("You cannot disable your own account");
    }

    if (data.disabled) {
      // Block disabling the last active super_admin
      const targetRoles = await rolesOf(data.targetUserId);
      if (targetRoles.includes("super_admin")) {
        const active = await countActiveSuperAdmins();
        if (active <= 1) throw new Error("Cannot disable the last active super_admin");
      }
    }

    const { error } = await supabaseAdmin
      .from("user_roles")
      .update({ disabled_at: data.disabled ? new Date().toISOString() : null })
      .eq("user_id", data.targetUserId);
    if (error) throw new Error(error.message);

    console.info("[admin-mgmt] admin toggled", {
      callerId: context.userId,
      targetUserId: data.targetUserId,
      disabled: data.disabled,
    });
    return { ok: true };
  });

// ── Promote / demote ────────────────────────────────────────────────────
export const changeAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        targetUserId: z.string().uuid(),
        addRole: z.enum(ASSIGNABLE_ROLES).optional(),
        removeRole: z.enum(ASSIGNABLE_ROLES).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context.userId);

    // Block self-promotion
    if (data.targetUserId === context.userId && data.addRole === "super_admin") {
      throw new Error("Self-promotion is not allowed");
    }

    if (data.removeRole === "super_admin") {
      // Block removing the last super_admin
      const active = await countActiveSuperAdmins();
      if (active <= 1) throw new Error("Cannot remove the last active super_admin");
      if (data.targetUserId === context.userId) {
        throw new Error("You cannot demote yourself from super_admin");
      }
    }

    if (data.removeRole) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.targetUserId)
        .eq("role", data.removeRole);
      if (error) throw new Error(error.message);
    }
    if (data.addRole) {
      const { error } = await supabaseAdmin.from("user_roles").upsert(
        {
          user_id: data.targetUserId,
          role: data.addRole,
          granted_by: context.userId,
          disabled_at: null,
        },
        { onConflict: "user_id,role" },
      );
      if (error) throw new Error(error.message);
    }

    console.info("[admin-mgmt] role changed", {
      callerId: context.userId,
      targetUserId: data.targetUserId,
      addRole: data.addRole,
      removeRole: data.removeRole,
    });
    return { ok: true };
  });

// ── Self password change (clears must_change_password) ──────────────────
export const changeMyPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        newPassword: z
          .string()
          .min(10, "Mínimo 10 caracteres")
          .max(72)
          .regex(/[A-Z]/, "Inclua uma letra maiúscula")
          .regex(/[a-z]/, "Inclua uma letra minúscula")
          .regex(/\d/, "Inclua um número"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const callerRoles = await rolesOf(context.userId);
    if (callerRoles.length === 0) throw new Error("Forbidden");

    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(context.userId, {
      password: data.newPassword,
    });
    if (updErr) throw new Error(updErr.message);

    const { error: clearErr } = await supabaseAdmin
      .from("user_roles")
      .update({ must_change_password: false })
      .eq("user_id", context.userId);
    if (clearErr) throw new Error(clearErr.message);

    console.info("[admin-mgmt] self password changed", { userId: context.userId });
    return { ok: true };
  });
