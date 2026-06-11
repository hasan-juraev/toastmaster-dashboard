import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type {
  AhCounterReport,
  EvaluatorReport,
  GrammarianMemberEntry,
  GrammarianReport,
  TimerReport,
} from "../types/database";

type ReportType = "ah_counter" | "grammarian" | "evaluator" | "timer";

function invalidateReportQuery(
  queryClient: ReturnType<typeof useQueryClient>,
  type: ReportType,
  meetingId: string,
) {
  queryClient.invalidateQueries({ queryKey: ["role_reports", type, meetingId] });
  queryClient.invalidateQueries({ queryKey: ["analytics"] });
}

export function useAhCounterReports(meetingId: string) {
  return useQuery<AhCounterReport[]>({
    queryKey: ["role_reports", "ah_counter", meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ah_counter_reports").select("*").eq("meeting_id", meetingId);
      if (error) throw error;
      return (data ?? []) as AhCounterReport[];
    },
    enabled: !!meetingId,
  });
}

export function useGrammarianReports(meetingId: string) {
  return useQuery<GrammarianReport[]>({
    queryKey: ["role_reports", "grammarian", meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grammarian_reports").select("*").eq("meeting_id", meetingId);
      if (error) throw error;
      return (data ?? []) as GrammarianReport[];
    },
    enabled: !!meetingId,
  });
}

export function useEvaluatorReports(meetingId: string) {
  return useQuery<EvaluatorReport[]>({
    queryKey: ["role_reports", "evaluator", meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evaluator_reports").select("*").eq("meeting_id", meetingId);
      if (error) throw error;
      return (data ?? []) as EvaluatorReport[];
    },
    enabled: !!meetingId,
  });
}

export function useTimerReports(meetingId: string) {
  return useQuery<TimerReport[]>({
    queryKey: ["role_reports", "timer", meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("timer_reports").select("*").eq("meeting_id", meetingId);
      if (error) throw error;
      return (data ?? []) as TimerReport[];
    },
    enabled: !!meetingId,
  });
}

export function useMeetingRoleReports(meetingId: string) {
  const ahCounter  = useAhCounterReports(meetingId);
  const grammarian = useGrammarianReports(meetingId);
  const evaluator  = useEvaluatorReports(meetingId);
  const timer      = useTimerReports(meetingId);

  return {
    data: {
      ahCounterReports:  ahCounter.data  ?? [],
      grammarianReports: grammarian.data ?? [],
      evaluatorReports:  evaluator.data  ?? [],
      timerReports:      timer.data      ?? [],
    },
    isLoading: ahCounter.isLoading || grammarian.isLoading || evaluator.isLoading || timer.isLoading,
    error: ahCounter.error ?? grammarian.error ?? evaluator.error ?? timer.error,
  };
}

export function useUpsertGrammarianReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      report: Omit<GrammarianReport, "id" | "created_at"> & { id?: string },
    ) => {
      const { data, error } = await supabase
        .from("grammarian_reports")
        .upsert(
          {
            ...(report.id ? { id: report.id } : {}),
            meeting_role_id:  report.meeting_role_id,
            meeting_id:       report.meeting_id,
            member_id:        report.member_id,
            grammar_errors:   report.grammar_errors,
            notable_phrases:  report.notable_phrases,
            score:            report.score,
            notes:            report.notes,
            word_of_the_day:  report.word_of_the_day,
          },
          { onConflict: "meeting_role_id" },
        )
        .select()
        .single();

      if (error) throw error;
      return data as GrammarianReport;
    },
    onSuccess: (_data, variables) => {
      if (variables.meeting_id) invalidateReportQuery(queryClient, "grammarian", variables.meeting_id);
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
            meeting_id:      report.meeting_id,
            speaker_id:      report.speaker_id,
            meeting_role_id: report.meeting_role_id,
            ah_count:        report.ah_count,
            notes:           report.notes,
          },
          { onConflict: "meeting_id,speaker_id" },
        )
        .select()
        .single();

      if (error) throw error;
      return data as AhCounterReport;
    },
    onSuccess: (_data, variables) => {
      if (variables.meeting_id) invalidateReportQuery(queryClient, "ah_counter", variables.meeting_id);
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
        .upsert(
          {
            ...(report.id ? { id: report.id } : {}),
            meeting_role_id:   report.meeting_role_id,
            meeting_id:        report.meeting_id,
            member_id:         report.member_id,
            speech_id:         report.speech_id,
            quality_score:     report.quality_score,
            strengths:         report.strengths,
            improvement_notes: report.improvement_notes,
          },
          { onConflict: "meeting_role_id" },
        )
        .select()
        .single();

      if (error) throw error;
      return data as EvaluatorReport;
    },
    onSuccess: (_data, variables) => {
      if (variables.meeting_id) invalidateReportQuery(queryClient, "evaluator", variables.meeting_id);
    },
  });
}

export function useGrammarianMemberEntries(grammarianReportId: string | undefined) {
  return useQuery<GrammarianMemberEntry[]>({
    queryKey: ["grammarian_member_entries", grammarianReportId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grammarian_member_entries")
        .select("*")
        .eq("grammarian_report_id", grammarianReportId!);
      if (error) throw error;
      return (data ?? []) as GrammarianMemberEntry[];
    },
    enabled: !!grammarianReportId,
  });
}

export function useUpsertGrammarianMemberEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      entry: Omit<GrammarianMemberEntry, "id" | "created_at"> & { id?: string },
    ) => {
      const { data, error } = await supabase
        .from("grammarian_member_entries")
        .upsert(
          {
            ...(entry.id ? { id: entry.id } : {}),
            grammarian_report_id: entry.grammarian_report_id,
            subject_member_id:    entry.subject_member_id,
            error_count:          entry.error_count,
            notes:                entry.notes,
          },
          { onConflict: "grammarian_report_id,subject_member_id" },
        )
        .select()
        .single();
      if (error) throw error;
      return data as GrammarianMemberEntry;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["grammarian_member_entries", variables.grammarian_report_id],
      });
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
            meeting_id:      report.meeting_id,
            member_id:       report.member_id,
            speech_id:       report.speech_id,
            target_seconds:  report.target_seconds,
            actual_seconds:  report.actual_seconds,
            notes:           report.notes,
          },
          { onConflict: "meeting_id,speech_id" },
        )
        .select()
        .single();

      if (error) throw error;
      return data as TimerReport;
    },
    onSuccess: (_data, variables) => {
      if (variables.meeting_id) invalidateReportQuery(queryClient, "timer", variables.meeting_id);
    },
  });
}
