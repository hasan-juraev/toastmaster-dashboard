import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { AuthContext } from "./AuthContext";
import type { Profile } from "../types/database";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms),
    ),
  ]);
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  try {
    const query = supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    const { data } = await withTimeout(Promise.resolve(query), 4000);
    return (data as Profile | null) ?? null;
  } catch {
    return null;
  }
}

async function autoLinkByEmail(userId: string, email: string): Promise<Profile | null> {
  try {
    const { data: member } = await supabase
      .from("members")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    if (!member) return null;

    const { data: updated } = await supabase
      .from("profiles")
      .update({ member_id: member.id })
      .eq("id", userId)
      .select("*")
      .maybeSingle();

    return (updated as Profile | null) ?? null;
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
    withTimeout(supabase.auth.getSession(), 5000)
      .then(async ({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          let p = await fetchProfile(session.user.id);
          if (p && p.member_id === null && session.user.email) {
            p = (await autoLinkByEmail(session.user.id, session.user.email)) ?? p;
          }
          setProfile(p);
        }
      })
      .catch(() => {
        // Backend unreachable or timed out — unblock the UI
      })
      .finally(() => {
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        let p = await fetchProfile(session.user.id);
        if (p && p.member_id === null && session.user.email) {
          p = (await autoLinkByEmail(session.user.id, session.user.email)) ?? p;
        }
        setProfile(p);
      } else {
        setProfile(null);
      }
    });

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
