import { createServerFn } from "@tanstack/react-start";
import {
  CANONICAL_ADMIN_EMAIL,
  countActiveSuperAdmins,
  ensureCanonicalSuperAdmin,
  normalizeAdminEmail,
  type BootstrapResult,
} from "./admin-bootstrap.server";

export const ensureSuperAdminExists = createServerFn({ method: "POST" }).handler(
  async (): Promise<BootstrapResult> => {
    const recovery = process.env.ENABLE_ADMIN_RECOVERY === "true";

    if (recovery) {
      console.warn("[admin-bootstrap] RECOVERY MODE active — ENABLE_ADMIN_RECOVERY=true");
    }

    return ensureCanonicalSuperAdmin({
      source: "login-bootstrap",
      forcePasswordReset: recovery,
      allowRecreate: recovery,
    });
  },
);

export const recoverSuperAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: { confirmationEmail?: string }) => d)
  .handler(async ({ data }): Promise<BootstrapResult> => {
    const enabled =
      process.env.NODE_ENV !== "production" || process.env.ENABLE_ADMIN_RECOVERY === "true";
    if (!enabled) {
      console.warn("[admin-bootstrap] manual recovery blocked outside development");
      return {
        status: "disabled",
        email: CANONICAL_ADMIN_EMAIL,
        activeSuperAdmins: await countActiveSuperAdmins(),
      };
    }

    if (normalizeAdminEmail(data.confirmationEmail ?? "") !== CANONICAL_ADMIN_EMAIL) {
      throw new Error("Informe o email administrativo canônico para confirmar a recuperação.");
    }

    console.warn("[admin-bootstrap] manual recovery requested", { email: CANONICAL_ADMIN_EMAIL });
    return ensureCanonicalSuperAdmin({
      source: "manual-recovery",
      forcePasswordReset: true,
      allowRecreate: true,
    });
  });
