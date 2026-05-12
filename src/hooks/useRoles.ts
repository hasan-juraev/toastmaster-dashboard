import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Role, MeetingRole } from "../types/database";

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
        .upsert(role)
        .select()
        .single();

      if (error) {
        // Handle unique constraint violation for duplicate blocking
        if (error.code === "23505") {
          throw new Error(
            "Duplicate assignment blocked: This role is already assigned.",
          );
        }
        throw error;
      }
      return data as MeetingRole;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["meeting_roles", variables.meeting_id],
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
