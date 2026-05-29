import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export interface RoleMemberSignup {
  id: string;
  meeting_id: string;
  role_id: string;
  member_id: string;
  created_at: string;
  members: { name: string } | null;
}

export function useMeetingRoleSignups(meetingId: string) {
  return useQuery({
    queryKey: ["role_member_signups", meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_member_signups")
        .select("*, members(name)")
        .eq("meeting_id", meetingId);
      if (error) throw error;
      return data as RoleMemberSignup[];
    },
    enabled: !!meetingId,
    refetchInterval: 10_000,
  });
}

export function useSignupForRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ meetingId, roleId }: { meetingId: string; roleId: string }) => {
      const { data, error } = await supabase.rpc("signup_for_meeting_role", {
        p_meeting_id: meetingId,
        p_role_id: roleId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["role_member_signups", variables.meetingId] });
    },
  });
}

export function useWithdrawFromRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ meetingId, roleId }: { meetingId: string; roleId: string }) => {
      const { error } = await supabase.rpc("withdraw_from_meeting_role", {
        p_meeting_id: meetingId,
        p_role_id: roleId,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["role_member_signups", variables.meetingId] });
    },
  });
}
