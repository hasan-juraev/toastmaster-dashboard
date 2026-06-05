import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Vote, VoteCategory } from "../types/database";

export interface VoteTally {
  member_id: string;
  member_name: string;
  count: number;
}

export interface CategoryResult {
  category: VoteCategory;
  tally: VoteTally[];
  winner: VoteTally | null;
}

export function useVotes(meetingId: string) {
  return useQuery<Vote[]>({
    queryKey: ["votes", meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("votes")
        .select("*")
        .eq("meeting_id", meetingId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data ?? []) as Vote[];
    },
    enabled: !!meetingId,
  });
}

export function useVoteResults(meetingId: string, members: { id: string; name: string }[]) {
  const { data: votes = [] } = useVotes(meetingId);

  const memberNameMap = new Map(members.map((m) => [m.id, m.name]));

  const categories: VoteCategory[] = [
    "Best Speaker",
    "Best Table Topics Speaker",
    "Best Evaluator",
  ];

  const results: CategoryResult[] = categories.map((category) => {
    const categoryVotes = votes.filter((v) => v.category === category);

    const countMap = new Map<string, number>();
    for (const vote of categoryVotes) {
      if (!vote.voted_for_member_id) continue;
      countMap.set(
        vote.voted_for_member_id,
        (countMap.get(vote.voted_for_member_id) ?? 0) + 1,
      );
    }

    const tally: VoteTally[] = Array.from(countMap.entries())
      .map(([member_id, count]) => ({
        member_id,
        member_name: memberNameMap.get(member_id) ?? "Unknown",
        count,
      }))
      .sort((a, b) => b.count - a.count);

    const winner = tally.length > 0 ? tally[0] : null;

    return { category, tally, winner };
  });

  return results;
}

export function useSubmitVote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vote: {
      meeting_id: string;
      voter_id: string;
      category: VoteCategory;
      voted_for_member_id: string;
    }) => {
      const { data, error } = await supabase
        .from("votes")
        .upsert(vote, { onConflict: "meeting_id,voter_id,category" })
        .select()
        .single();

      if (error) throw error;
      return data as Vote;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["votes", variables.meeting_id] });
    },
  });
}
