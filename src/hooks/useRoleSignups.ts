import { useEffect } from "react";
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

// Kept live via Supabase Realtime (no polling)
export function useMeetingRoleSignups(meetingId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
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
  });

  useEffect(() => {
    if (!meetingId) return;

    const channel = supabase
      .channel(`role_member_signups_${meetingId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "role_member_signups",
          filter: `meeting_id=eq.${meetingId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["role_member_signups", meetingId] });
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [meetingId, queryClient]);

  return query;
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
