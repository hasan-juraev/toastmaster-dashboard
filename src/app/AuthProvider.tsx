import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { AuthContext } from "./AuthContext";
import type { Profile } from "../types/database";

async function loadProfile(userId: string, email: string | undefined): Promise<Profile | null> {
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 2000),
    );
    const rpc = supabase
      .rpc("get_or_link_profile", { p_user_id: userId, p_email: email ?? null })
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) throw error;
        return (data as Profile | null) ?? null;
      });
    return await Promise.race([rpc, timeout]);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setProfile(await loadProfile(session.user.id, session.user.email));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setProfile(await loadProfile(session.user.id, session.user.email));
        } else {
          setProfile(null);
        }
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  const memberId = profile?.member_id ?? null;
  const isAdmin = profile?.club_role === "admin";

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, memberId, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}
