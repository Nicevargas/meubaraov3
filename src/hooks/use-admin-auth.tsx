import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { adminSupabase } from "@/integrations/supabase/admin-client";

export function useAdminAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = adminSupabase.auth.onAuthStateChange((event, s) => {
      console.info("[admin-auth] state change", { event, hasSession: !!s, userId: s?.user?.id });
      setSession(s);
      setUser(s?.user ?? null);
    });

    adminSupabase.auth.getSession().then(({ data }) => {
      console.info("[admin-auth] hydrate", {
        hasSession: !!data.session,
        userId: data.session?.user?.id,
      });
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    return adminSupabase.auth.signInWithPassword({ email, password });
  }
  async function signOut() {
    return adminSupabase.auth.signOut();
  }

  return { session, user, loading, isAuthenticated: !!user, signIn, signOut };
}
