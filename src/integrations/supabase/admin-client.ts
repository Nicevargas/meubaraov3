// Dedicated Supabase client for the /admin backoffice.
// Uses a SEPARATE storage key so admin sessions never collide with the
// public customer session managed by `client.ts`.
import { createSupabaseConnection } from "./connection";

export const ADMIN_STORAGE_KEY = "mb-admin-auth";

function build() {
  return createSupabaseConnection("public", {
    auth: {
      storageKey: ADMIN_STORAGE_KEY,
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
      // Critical: do NOT read OAuth callbacks here — the public client owns them.
      detectSessionInUrl: false,
    },
  });
}

let _admin: ReturnType<typeof build> | undefined;
export const adminSupabase = new Proxy({} as ReturnType<typeof build>, {
  get(_t, prop, recv) {
    if (!_admin) _admin = build();
    return Reflect.get(_admin, prop, recv);
  },
});
