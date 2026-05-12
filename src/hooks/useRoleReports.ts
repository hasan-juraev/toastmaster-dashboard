import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type {
  EvaluatorReport,
  GrammarianReport,
  TimerReport,
} from "../types/database";

interface MeetingRoleReports {
  grammarianReports: GrammarianReport[];
  evaluatorReports: EvaluatorReport[];
  timerReports: TimerReport[];
}

export function useMeetingRoleReports(meetingId: string) {
  return useQuery<MeetingRoleReports>({
    queryKey: ["role_reports", meetingId],
    queryFn: async () => {
      const [
        { data: grammarianReports, error: grammarianError },
        { data: evaluatorReports, error: evaluatorError },
        { data: timerReports, error: timerError },
      ] = await Promise.all([
        supabase.from("grammarian_reports").select("*").eq("meeting_id", meetingId),
        supabase.from("evaluator_reports").select("*").eq("meeting_id", meetingId),
        supabase.from("timer_reports").select("*").eq("meeting_id", meetingId),
      ]);

      if (grammarianError) throw grammarianError;
      if (evaluatorError) throw evaluatorError;
      if (timerError) throw timerError;

      return {
        grammarianReports: (grammarianReports ?? []) as GrammarianReport[],
        evaluatorReports: (evaluatorReports ?? []) as EvaluatorReport[],
        timerReports: (timerReports ?? []) as TimerReport[],
      };
    },
    enabled: !!meetingId,
  });
}

function invalidateRoleReportQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  meetingId: string,
) {
  queryClient.invalidateQueries({ queryKey: ["role_reports", meetingId] });
  queryClient.invalidateQueries({ queryKey: ["analytics"] });
}

export function useUpsertGrammarianReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      report: Omit<GrammarianReport, "id" | "created_at"> & { id?: string },
    ) => {
      const { data, error } = await supabase
        .from("grammarian_reports")
        .upsert(report)
        .select()
        .single();

      if (error) throw error;
      return data as GrammarianReport;
    },
    onSuccess: (_data, variables) => {
      if (variables.meeting_id) {
        invalidateRoleReportQueries(queryClient, variables.meeting_id);
      }
    },
  });
}

export function useUpsertEvaluatorReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      report: Omit<EvaluatorReport, "id" | "created_at"> & { id?: string },
    ) => {
      const { data, error } = await supabase
        .from("evaluator_reports")
        .upsert(report)
        .select()
        .single();

      if (error) throw error;
      return data as EvaluatorReport;
    },
    onSuccess: (_data, variables) => {
      if (variables.meeting_id) {
        invalidateRoleReportQueries(queryClient, variables.meeting_id);
      }
    },
  });
}

export function useUpsertTimerReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      report: Omit<TimerReport, "id" | "created_at"> & { id?: string },
    ) => {
      const { data, error } = await supabase
        .from("timer_reports")
        .upsert(report)
        .select()
        .single();

      if (error) throw error;
      return data as TimerReport;
    },
    onSuccess: (_data, variables) => {
      if (variables.meeting_id) {
        invalidateRoleReportQueries(queryClient, variables.meeting_id);
      }
    },
  });
}
