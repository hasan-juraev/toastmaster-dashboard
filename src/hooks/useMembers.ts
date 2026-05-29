import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Member } from "../types/database";

export function useMembers() {
  return useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as Member[];
    },
  });
}

export function useCreateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (member: Omit<Member, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("members")
        .insert(member)
        .select()
        .single();

      if (error) throw error;
      return data as Member;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Member> & { id: string }) => {
      const { data, error } = await supabase
        .from("members")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Member;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });
}

export function useDeleteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Nullify all nullable FK references so historical records are preserved
      const nullifyResults = await Promise.all([
        supabase.from("meeting_roles").update({ member_id: null }).eq("member_id", id),
        supabase.from("speeches").update({ speaker_id: null }).eq("speaker_id", id),
        supabase.from("speeches").update({ evaluator_id: null }).eq("evaluator_id", id),
        supabase.from("grammarian_reports").update({ member_id: null }).eq("member_id", id),
        supabase.from("ah_counter_reports").update({ speaker_id: null }).eq("speaker_id", id),
        supabase.from("evaluator_reports").update({ member_id: null }).eq("member_id", id),
        supabase.from("timer_reports").update({ member_id: null }).eq("member_id", id),
        supabase.from("speech_comments").update({ commenter_id: null }).eq("commenter_id", id),
        supabase.from("profiles").update({ member_id: null }).eq("member_id", id),
      ]);

      for (const { error } of nullifyResults) {
        if (error) throw error;
      }

      // votes.voter_id is non-nullable — delete those rows entirely
      const { error: votesError } = await supabase
        .from("votes")
        .delete()
        .or(`voter_id.eq.${id},voted_for_member_id.eq.${id}`);
      if (votesError) throw votesError;

      const { error } = await supabase.from("members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });
}
