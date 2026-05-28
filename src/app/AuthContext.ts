import { createContext, useContext } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { Profile } from "../types/database";

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: Profile | null;
  memberId: string | null;
  isAdmin: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  profile: null,
  memberId: null,
  isAdmin: false,
});

export function useAuth() {
  return useContext(AuthContext);
}
