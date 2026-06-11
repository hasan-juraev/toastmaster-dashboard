import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Role, MeetingRole } from "../types/database";

export interface MeetingRoleWithDetails extends MeetingRole {
  roles: { name: string } | null;
  members: { name: string } | null;
}

export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as Role[];
    },
  });
}

export function useMeetingRoles(meetingId: string) {
  return useQuery({
    queryKey: ["meeting_roles", meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_roles")
        .select("*")
        .eq("meeting_id", meetingId);

      if (error) throw error;
      return data as MeetingRole[];
    },
    enabled: !!meetingId,
  });
}

export function useUpsertMeetingRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      role: Pick<MeetingRole, "meeting_id" | "role_id"> &
        Partial<Omit<MeetingRole, "id" | "meeting_id" | "role_id">> & { id?: string },
    ) => {
      const { data, error } = await supabase
        .from("meeting_roles")
        .upsert(
          {
            meeting_id: role.meeting_id,
            role_id: role.role_id,
            member_id: role.member_id,
            status: role.status,
            completed_at: role.completed_at,
            notes: role.notes,
            score: role.score,
          },
          { onConflict: "meeting_id,role_id" },
        )
        .select()
        .single();

      if (error) throw error;
      return data as MeetingRole;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["meeting_roles", variables.meeting_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["open_meeting_roles", variables.meeting_id],
      });
    },
  });
}

export function useDeleteMeetingRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string; meeting_id: string }) => {
      const { error } = await supabase
        .from("meeting_roles")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["meeting_roles", variables.meeting_id],
      });
    },
  });
}

// Toggle signup_open flag on an existing meeting_role row
export function useToggleSignupOpen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, signup_open, meeting_id }: { id: string; signup_open: boolean; meeting_id: string }) => {
      const { error } = await supabase
        .from("meeting_roles")
        .update({ signup_open })
        .eq("id", id);
      if (error) throw error;
      return { meeting_id };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["meeting_roles", variables.meeting_id] });
      queryClient.invalidateQueries({ queryKey: ["open_meeting_roles", variables.meeting_id] });
    },
  });
}

// Race-condition-safe role claim via RPC
export function useClaimMeetingRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (meetingRoleId: string) => {
      const { data, error } = await supabase
        .rpc("claim_meeting_role", { p_meeting_role_id: meetingRoleId });
      if (error) throw error;
      return data as MeetingRole;
    },
    onSuccess: (data) => {
      const mid = data?.meeting_id;
      if (mid) {
        queryClient.invalidateQueries({ queryKey: ["meeting_roles", mid] });
        queryClient.invalidateQueries({ queryKey: ["open_meeting_roles", mid] });
        queryClient.invalidateQueries({ queryKey: ["my_meeting_role", mid] });
      }
    },
  });
}

export function useUnclaimMeetingRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ meetingRoleId }: { meetingRoleId: string; meetingId: string }) => {
      const { error } = await supabase
        .rpc("unclaim_meeting_role", { p_meeting_role_id: meetingRoleId });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      const mid = variables.meetingId;
      queryClient.invalidateQueries({ queryKey: ["meeting_roles", mid] });
      queryClient.invalidateQueries({ queryKey: ["open_meeting_roles", mid] });
      queryClient.invalidateQueries({ queryKey: ["my_meeting_role", mid] });
    },
  });
}

export function useCompleteMyMeetingRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (meetingRoleId: string) => {
      const { error } = await supabase.rpc("complete_my_meeting_role", {
        p_meeting_role_id: meetingRoleId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting_roles"] });
      queryClient.invalidateQueries({ queryKey: ["my_meeting_role"] });
    },
  });
}

// Current user's role assignment for a specific meeting
export function useMyMeetingRole(meetingId: string, memberId: string | null) {
  return useQuery({
    queryKey: ["my_meeting_role", meetingId, memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_roles")
        .select("*, roles(name)")
        .eq("meeting_id", meetingId)
        .eq("member_id", memberId!)
        .maybeSingle();
      if (error) throw error;
      return data as (MeetingRole & { roles: { name: string } | null }) | null;
    },
    enabled: !!meetingId && !!memberId,
  });
}

// Open role slots for signup page — kept live via Supabase Realtime (no polling)
export function useOpenMeetingRoles(meetingId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["open_meeting_roles", meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_roles")
        .select("*, roles(name), members(name)")
        .eq("meeting_id", meetingId);
      if (error) throw error;
      return data as MeetingRoleWithDetails[];
    },
    enabled: !!meetingId,
  });

  useEffect(() => {
    if (!meetingId) return;

    const channel = supabase
      .channel(`open_meeting_roles_${meetingId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "meeting_roles",
          filter: `meeting_id=eq.${meetingId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["open_meeting_roles", meetingId] });
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [meetingId, queryClient]);

  return query;
}
