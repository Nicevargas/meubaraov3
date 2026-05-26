import type { User } from "@supabase/supabase-js";
import { createSupabaseConnection } from "@/integrations/supabase/connection";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const CANONICAL_ADMIN_EMAIL = "admin@meubarao.com";
const CANONICAL_ADMIN_PASSWORD = "Admin123!";

export type BootstrapResult = {
  status: "exists" | "created" | "repaired" | "recovered" | "disabled";
  email: string;
  userId?: string;
  activeSuperAdmins: number;
  passwordVerified?: boolean;
  roleVerified?: boolean;
  provider?: string | null;
};

export function normalizeAdminEmail(email: string) {
  return email.trim().toLowerCase();
}

async function listAuthUsers(): Promise<User[]> {
  const users: User[] = [];
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`bootstrap: failed to list users — ${error.message}`);
    users.push(...(data?.users ?? []));
    if ((data?.users?.length ?? 0) < 1000) break;
  }
  return users;
}

async function verifySeedPassword(email: string): Promise<{ ok: boolean; reason: string }> {
  const authClient = createSupabaseConnection("public", {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await authClient.auth.signInWithPassword({
    email,
    password: CANONICAL_ADMIN_PASSWORD,
  });

  if (error) return { ok: false, reason: error.message };
  await authClient.auth.signOut();
  return { ok: !!data.user, reason: data.user ? "ok" : "no user returned" };
}

export async function countActiveSuperAdmins(): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("user_roles")
    .select("user_id", { count: "exact", head: true })
    .eq("role", "super_admin")
    .is("disabled_at", null);

  if (error) {
    console.error("[admin-bootstrap] count error", error.message);
    throw new Error("bootstrap: failed to count super admins");
  }
  return count ?? 0;
}

export async function ensureCanonicalSuperAdmin(options: {
  source: "login-bootstrap" | "manual-recovery";
  forcePasswordReset: boolean;
  allowRecreate: boolean;
}): Promise<BootstrapResult> {
  const email = normalizeAdminEmail(CANONICAL_ADMIN_EMAIL);
  const activeBefore = await countActiveSuperAdmins();

  console.info("[admin-bootstrap] audit start", {
    source: options.source,
    email,
    activeSuperAdmins: activeBefore,
    forcePasswordReset: options.forcePasswordReset,
  });

  let user =
    (await listAuthUsers()).find((u) => normalizeAdminEmail(u.email ?? "") === email) ?? null;
  let status: BootstrapResult["status"] = "exists";
  let passwordVerified = false;
  let passwordWasReset = false;

  if (!user) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: CANONICAL_ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: "Super Admin" },
    });
    if (error || !data.user) throw new Error("bootstrap: failed to create canonical super_admin");
    user = data.user;
    status = "created";
    passwordWasReset = true;
    passwordVerified = true;
    console.warn("[admin-bootstrap] super_admin CREATED", { email, userId: user.id });
  }

  const { data: existingRole, error: roleLookupError } = await supabaseAdmin
    .from("user_roles")
    .select("id, disabled_at, must_change_password")
    .eq("user_id", user.id)
    .eq("role", "super_admin")
    .maybeSingle();

  if (roleLookupError)
    throw new Error(`bootstrap: failed role lookup — ${roleLookupError.message}`);

  const shouldVerifyPassword =
    options.forcePasswordReset || !existingRole || existingRole.must_change_password;
  if (shouldVerifyPassword && status !== "created") {
    const check = await verifySeedPassword(email);
    passwordVerified = check.ok;
    console.info("[admin-bootstrap] password integrity check", {
      email,
      ok: check.ok,
      reason: check.reason,
    });

    if (!check.ok || options.forcePasswordReset) {
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        email,
        password: CANONICAL_ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: {
          ...(user.user_metadata ?? {}),
          display_name: user.user_metadata?.display_name ?? "Super Admin",
        },
      });

      if (error || !data.user) {
        if (!options.allowRecreate || existingRole?.disabled_at === null) {
          throw new Error("bootstrap: failed to repair canonical password");
        }
        await supabaseAdmin.auth.admin.deleteUser(user.id);
        const recreated = await supabaseAdmin.auth.admin.createUser({
          email,
          password: CANONICAL_ADMIN_PASSWORD,
          email_confirm: true,
          user_metadata: { display_name: "Super Admin" },
        });
        if (recreated.error || !recreated.data.user)
          throw new Error("bootstrap: failed to recreate corrupted canonical admin");
        user = recreated.data.user;
      } else {
        user = data.user;
      }

      passwordWasReset = true;
      passwordVerified = true;
      status = options.forcePasswordReset ? "recovered" : "repaired";
      console.warn("[admin-bootstrap] seed password repaired", { email, userId: user.id });
    }
  }

  if (!existingRole || existingRole.disabled_at || passwordWasReset) {
    const nextMustChange =
      passwordWasReset || !existingRole ? true : existingRole.must_change_password;
    const { error } = existingRole
      ? await supabaseAdmin
          .from("user_roles")
          .update({ disabled_at: null, must_change_password: nextMustChange })
          .eq("id", existingRole.id)
      : await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: user.id, role: "super_admin", must_change_password: true });
    if (error) throw new Error(`bootstrap: failed to assign super_admin role — ${error.message}`);
  }

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .upsert(
      { id: user.id, display_name: "Super Admin", onboarding_completed: true },
      { onConflict: "id" },
    );
  if (profileError) throw new Error(`bootstrap: failed profile sync — ${profileError.message}`);

  const activeAfter = await countActiveSuperAdmins();
  console.info("[admin-bootstrap] audit complete", {
    email,
    userId: user.id,
    status,
    activeSuperAdmins: activeAfter,
    passwordVerified,
    roleVerified: true,
    provider: user.app_metadata?.provider ?? null,
  });

  return {
    status,
    email,
    userId: user.id,
    activeSuperAdmins: activeAfter,
    passwordVerified,
    roleVerified: true,
    provider: user.app_metadata?.provider ?? null,
  };
}
