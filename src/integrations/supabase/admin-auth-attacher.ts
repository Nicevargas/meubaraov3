// When a serverFn is invoked from inside the /admin area, override the
// Authorization header with the ADMIN session's bearer token. Registered
// AFTER `attachSupabaseAuth` in `src/start.ts` so it wins on header merge.
import { createMiddleware } from "@tanstack/react-start";
import { adminSupabase } from "./admin-client";

export const attachAdminAuth = createMiddleware({ type: "function" }).client(async ({ next }) => {
  if (typeof window === "undefined") return next();
  if (!window.location.pathname.startsWith("/admin")) return next();
  const { data } = await adminSupabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return next();
  console.info("[admin-auth] attaching admin bearer to serverFn");
  return next({ headers: { Authorization: `Bearer ${token}` } });
});
