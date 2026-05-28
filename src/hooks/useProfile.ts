import { useAuth } from "../app/AuthContext";

export function useProfile() {
  const { profile, memberId, isAdmin } = useAuth();
  return {
    profile,
    memberId,
    isAdmin,
    isLinked: memberId !== null,
  };
}
