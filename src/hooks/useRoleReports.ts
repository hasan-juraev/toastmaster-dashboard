import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type {
  AhCounterReport,
  EvaluatorReport,
  GrammarianReport,
  TimerReport,
} from "../types/database";

interface MeetingRoleReports {
  ahCounterReports: AhCounterReport[];
  grammarianReports: GrammarianReport[];
  evaluatorReports: EvaluatorReport[];
  timerReports: TimerReport[];
}

export function useMeetingRoleReports(meetingId: string) {
  return useQuery<MeetingRoleReports>({
    queryKey: ["role_reports", meetingId],
    queryFn: async () => {
      const [
        { data: ahCounterReports, error: ahCounterError },
        { data: grammarianReports, error: grammarianError },
        { data: evaluatorReports, error: evaluatorError },
        { data: timerReports, error: timerError },
      ] = await Promise.all([
        supabase.from("ah_counter_reports").select("*").eq("meeting_id", meetingId),
        supabase.from("grammarian_reports").select("*").eq("meeting_id", meetingId),
        supabase.from("evaluator_reports").select("*").eq("meeting_id", meetingId),
        supabase.from("timer_reports").select("*").eq("meeting_id", meetingId),
      ]);

      if (ahCounterError) throw ahCounterError;
      if (grammarianError) throw grammarianError;
      if (evaluatorError) throw evaluatorError;
      if (timerError) throw timerError;

      return {
        ahCounterReports: (ahCounterReports ?? []) as AhCounterReport[],
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
      const query = report.id
        ? supabase
            .from("grammarian_reports")
            .update({
              meeting_role_id: report.meeting_role_id,
              meeting_id: report.meeting_id,
              member_id: report.member_id,
              grammar_errors: report.grammar_errors,
              notable_phrases: report.notable_phrases,
              score: report.score,
              notes: report.notes,
            })
            .eq("id", report.id)
        : supabase.from("grammarian_reports").insert(report);

      const { data, error } = await query.select().single();

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

export function useUpsertAhCounterReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      report: Omit<AhCounterReport, "id" | "created_at"> & { id?: string },
    ) => {
      const { data, error } = await supabase
        .from("ah_counter_reports")
        .upsert(
          {
            meeting_id: report.meeting_id,
            speaker_id: report.speaker_id,
            meeting_role_id: report.meeting_role_id,
            ah_count: report.ah_count,
            notes: report.notes,
          },
          { onConflict: "meeting_id,speaker_id" },
        )
        .select()
        .single();

      if (error) throw error;
      return data as AhCounterReport;
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
      const query = report.id
        ? supabase
            .from("evaluator_reports")
            .update({
              meeting_role_id: report.meeting_role_id,
              meeting_id: report.meeting_id,
              member_id: report.member_id,
              speech_id: report.speech_id,
              quality_score: report.quality_score,
              strengths: report.strengths,
              improvement_notes: report.improvement_notes,
            })
            .eq("id", report.id)
        : supabase.from("evaluator_reports").insert(report);

      const { data, error } = await query.select().single();

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
        .upsert(
          {
            meeting_role_id: report.meeting_role_id,
            meeting_id: report.meeting_id,
            member_id: report.member_id,
            speech_id: report.speech_id,
            target_seconds: report.target_seconds,
            actual_seconds: report.actual_seconds,
            notes: report.notes,
          },
          { onConflict: "meeting_id,speech_id" },
        )
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
