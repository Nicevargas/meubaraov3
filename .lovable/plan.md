# Auth flow fix — recovery isolation + admin invite email

Two surgical fixes. No UI redesign, no admin system rewrite, no branding changes. Only auth state architecture, recovery isolation, and admin onboarding email delivery.

## Issue 1 — Recovery state persists / app stuck on reset screen

### Root cause

- `src/routes/reset-password.tsx` derives `mode = "update"` from `window.location.hash.includes("type=recovery")` once on mount, but never:
  - listens to Supabase's `PASSWORD_RECOVERY` event,
  - clears the URL hash after handling it,
  - signs out the transient recovery session after `updateUser`,
  - redirects away once the password is saved.
- Supabase opens a temporary session when the recovery link is clicked (`detectSessionInUrl: true` on the public client). After `updateUser` we leave that session active, so `__root.tsx`'s `onAuthStateChange` invalidates routes and the user is now "logged in" with the recovery URL still present. Reloading `/reset-password` re-enters update mode because the page state is the only source of truth.
- There is no global "recovery in progress" boundary — protected routes don't know to keep the user on `/reset-password` and away from `/app` until a clean password rotation is done.

### Fix (frontend only, no schema/backend changes)

1. **`src/routes/reset-password.tsx`** — make recovery transient and event-driven:
   - Listen to `supabase.auth.onAuthStateChange`; switch to `update` mode ONLY on `PASSWORD_RECOVERY`. Remove the `window.location.hash` sniff as the sole trigger (keep it as a fallback for SSR-first paint only).
   - After a successful `supabase.auth.updateUser({ password })`:
     - call `supabase.auth.signOut()` to drop the recovery session,
     - clear the URL hash via `history.replaceState(null, "", "/reset-password")`,
     - reset local state (`setMode("request")`, clear password field),
     - `navigate({ to: "/login", search: { redirect: "/app" } })`.
   - On any unmount or `SIGNED_OUT` event, reset local state.
   - If the page mounts with no recovery hash AND no `PASSWORD_RECOVERY` event arrives within a short window, stay in `request` mode (never render the update form without a live recovery session).

2. **`src/routes/__root.tsx`** — add a single global recovery boundary:
   - Track a transient `isRecovering` flag (React state at root) set to `true` on `PASSWORD_RECOVERY`, cleared on `SIGNED_OUT` or successful navigation to `/login`.
   - While `isRecovering`, if the user navigates anywhere other than `/reset-password`, redirect back to `/reset-password`. This prevents the recovery session from leaking into `/app` or `/admin`.
   - Do NOT persist this flag to `localStorage`/`sessionStorage`. It must live only in memory for the active tab.

3. **`src/routes/_authenticated.tsx` and `src/routes/admin.tsx`** — add a guard that rejects sessions whose only purpose is recovery: if the most recent auth event was `PASSWORD_RECOVERY` and no clean `SIGNED_IN` has happened since, redirect to `/reset-password`. Once `updateUser` succeeds and we sign out, this naturally clears.

4. **Force-change-password modal (`ForcePasswordChangeModal`)** — already calls `changeMyPassword` and lifts the gate. No change needed beyond ensuring the gate flag in `user_roles.must_change_password` is cleared by that server fn (verify only — read-only check).

5. **Debug logging** — temporary `console.info("[auth]", event, { hasSession, path })` in the root state-change listener and in `reset-password.tsx` for: `PASSWORD_RECOVERY`, `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`, recovery cleanup, redirect decisions. Will be removed after validation.

### Explicit safety rules (preserved)

- No flags in `localStorage` / `sessionStorage`.
- No persistence of `PASSWORD_RECOVERY` across reload — a fresh load with no recovery hash and no recovery event = normal login screen.
- Super-admin access, multi-admin roles, RLS, Supabase wiring untouched.

## Issue 2 — Newly created admins never receive an invite email

### Root cause

`adminCreateUser` in `src/lib/admin-users.functions.ts` calls `supabaseAdmin.auth.admin.createUser({ email, password: tempPwd, email_confirm: true })` and returns the temp password to the UI. It **never** triggers an email. The new admin has no link, no notification, and the temp password is exposed in the API response — a security and onboarding bug.

### Fix

1. **`adminCreateUser` (`src/lib/admin-users.functions.ts`)**:
   - Keep `createUser` (so the row exists and the role can be attached immediately with `must_change_password: true`), but:
     - remove `password: tempPwd` and stop returning `tempPassword`,
     - keep `email_confirm: true` (admin-created, no double opt-in needed),
     - immediately after role insert, call `supabaseAdmin.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo: \`${SITE_URL}/reset-password\` } })`AND`supabaseAdmin.auth.resetPasswordForEmail(email, { redirectTo: ... })` so Supabase Auth actually dispatches the email through its configured SMTP/Lovable Emails pipeline.
     - log success/failure of the dispatch in `admin_audit_log` (`actionType: "admin_invite_email_sent" | "admin_invite_email_failed"`) with `errorText` populated on failure.
     - return `{ userId, inviteSent: boolean, inviteError?: string }` (no password ever returned).
   - `SITE_URL` resolution: `process.env.SITE_URL ?? "https://meubarao.com"` (same convention used elsewhere in the file). Reject `localhost` in production by falling back to the canonical domain.

2. **Resend invite** — add a new server fn `adminResendInvite(userId)` in the same file. Super-admin only, rate-limited, audit-logged. Reuses the same `resetPasswordForEmail` + `generateLink` path and surfaces success/failure.

3. **Admin UI feedback (`src/routes/admin.users.$userId.tsx` and the create-user dialog)** — minimal UI only, no redesign:
   - After create, show: "Convite enviado para X" or an explicit error toast with the failure reason.
   - Add a "Reenviar convite" button on the user detail page wired to `adminResendInvite`.

4. **Failure surfacing** — never silently swallow email dispatch errors; show the Supabase error message verbatim in the admin toast and store it in `admin_audit_log.error_text`.

5. **Security** — temp password generation removed entirely; admin never sees or transmits raw passwords. All access flows through the email-delivered recovery link.

6. **Debug logging** — temporary `console.warn("[admin-invite]", ...)` around link generation, email dispatch, and audit insertion for validation.

### Operational note (not code — surface to user)

If emails still don't arrive after the code fix, the cause is Supabase Auth SMTP / Lovable Emails configuration: sender domain, SPF/DKIM, and the `SITE_URL` / redirect allowlist must be configured under Cloud → Emails and Cloud → Auth Settings. The code fix guarantees the email is _requested_; delivery requires the domain to be verified.

## Files to change

- `src/routes/reset-password.tsx` — event-driven recovery, post-update cleanup, redirect.
- `src/routes/__root.tsx` — transient `isRecovering` boundary, redirect guard, expanded auth event listener with logging.
- `src/routes/_authenticated.tsx` — block recovery-only sessions from entering `/app`.
- `src/routes/admin.tsx` — same recovery-only block for `/admin/*`.
- `src/lib/admin-users.functions.ts` — `adminCreateUser` rewrite (no temp password, send email, audit), new `adminResendInvite` server fn.
- `src/routes/admin.users.$userId.tsx` (and the existing create-user dialog component) — small UI: invite status toast + "Reenviar convite" button.

## Out of scope

- No new tables, no migrations, no RLS changes.
- No changes to the persona/chat prompts, mobile menu, branding, pricing, or memory system.
- No replacement of the existing admin or super-admin architecture.

## Validation

1. Create a new admin → verify the new user receives a password setup email (check Cloud → Emails log + `admin_audit_log`).
2. Click the email link → land on `/reset-password` in update mode, set a new password → automatic sign-out, redirect to `/login`, log in normally → land in `/admin` with no recovery UI.
3. Reload `/reset-password` directly (no hash) → shows "request" mode, never the update form.
4. Trigger a recovery link, then navigate to `/app` mid-flow → redirected back to `/reset-password` until rotation completes.
5. Sign out, sign back in → no recovery state anywhere; localStorage/sessionStorage contain no recovery flags.
6. "Reenviar convite" delivers a fresh link and audit-logs the dispatch.
