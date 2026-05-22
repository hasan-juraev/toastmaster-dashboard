import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { SpeechComment } from "../types/database";

export function useSpeechComments(speechId: string) {
  return useQuery<SpeechComment[]>({
    queryKey: ["speech_comments", speechId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("speech_comments")
        .select("*")
        .eq("speech_id", speechId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data ?? []) as SpeechComment[];
    },
    enabled: !!speechId,
  });
}

export function useCreateSpeechComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (comment: {
      speech_id: string;
      commenter_id: string | null;
      comment: string;
    }) => {
      const { data, error } = await supabase
        .from("speech_comments")
        .insert(comment)
        .select()
        .single();

      if (error) throw error;
      return data as SpeechComment;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["speech_comments", variables.speech_id],
      });
    },
  });
}

export function useDeleteSpeechComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, speechId }: { id: string; speechId: string }) => {
      const { error } = await supabase
        .from("speech_comments")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { id, speechId };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["speech_comments", variables.speechId],
      });
    },
  });
}
