import { useAuth } from "../app/AuthContext";

export function useProfile() {
  const { profile, memberId, isAdmin, isSuperAdmin } = useAuth();
  return {
    profile,
    memberId,
    isAdmin,
    isSuperAdmin,
  };
}
