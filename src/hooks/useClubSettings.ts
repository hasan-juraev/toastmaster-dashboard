import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

interface ClubSettings {
  id: number;
  total_meetings_override: number | null;
  updated_at: string;
}

export function useClubSettings() {
  return useQuery({
    queryKey: ["club_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("club_settings")
        .select("*")
        .single();
      if (error) throw error;
      return data as ClubSettings;
    },
  });
}

export function useUpdateTotalMeetingsOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (value: number | null) => {
      const { data, error } = await supabase
        .from("club_settings")
        .update({ total_meetings_override: value, updated_at: new Date().toISOString() })
        .eq("id", 1)
        .select()
        .single();
      if (error) throw error;
      return data as ClubSettings;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["club_settings"], updated);
    },
  });
}
