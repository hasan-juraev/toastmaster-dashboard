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
      const rolePayload = {
        member_id: role.member_id,
        allow_duplicate: role.allow_duplicate,
        status: role.status,
        completed_at: role.completed_at,
        notes: role.notes,
        score: role.score,
      };

      const runUpdate = async (id: string) =>
        supabase
          .from("meeting_roles")
          .update(rolePayload)
          .eq("id", id)
          .select()
          .single();

      const runInsert = async () =>
        supabase.from("meeting_roles").insert(role).select().single();

      const { data, error } = role.id
        ? await runUpdate(role.id)
        : await runInsert();

      if (error) {
        if (error.code === "23505") {
          const { data: existingRole, error: existingRoleError } = await supabase
            .from("meeting_roles")
            .select("id")
            .eq("meeting_id", role.meeting_id)
            .eq("role_id", role.role_id)
            .maybeSingle();

          if (existingRoleError) {
            throw existingRoleError;
          }

          if (existingRole?.id) {
            const { data: updatedRole, error: updateError } = await runUpdate(
              existingRole.id,
            );

            if (updateError) {
              throw updateError;
            }

            return updatedRole as MeetingRole;
          }

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
