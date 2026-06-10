import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useProfile } from "./useProfile";

export interface GrammarianPoint {
  date: string;
  label: string;
  grammarErrors: number;
  notablePhrases: number;
  score: number | null;
}

export interface AhCounterPoint {
  date: string;
  label: string;
  ahCount: number;
}

export interface TimerPoint {
  date: string;
  xLabel: string;
  speechTitle: string;
  delta: number;
  targetSeconds: number;
  actualSeconds: number;
  onTime: boolean;
}

export interface MyAnalyticsData {
  memberName: string;
  speechesDelivered: number;
  rolesFilled: number;
  completedRoles: number;
  roleCompletionRate: number;
  monthlySpeeches: Array<{ month: string; count: number }>;
  grammarianSeries: GrammarianPoint[];
  ahCounterSeries: AhCounterPoint[];
  timerSeries: TimerPoint[];
  summaryStats: {
    grammarian: { timesServed: number; avgErrors: number; avgScore: number };
    ahCounter: { timesTracked: number; avgFillers: number };
    timer: { speechesTimed: number; avgDelta: number; onTimeRate: number };
  };
}

function formatLabel(dateStr: string): string {
  if (!dateStr) return "?";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getLast6Months(): Array<{ key: string; label: string }> {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("en-US", { month: "short" }),
    };
  });
}

export function useMyAnalytics() {
  const { memberId } = useProfile();

  return useQuery<MyAnalyticsData>({
    queryKey: ["my-analytics", memberId],
    enabled: !!memberId,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const [
        { data: memberRow },
        { data: speeches },
        { data: roles },
        { data: grammarReports },
        { data: ahReports },
        { data: timerReports },
      ] = await Promise.all([
        supabase.from("members").select("name").eq("id", memberId!).single(),
        supabase
          .from("speeches")
          .select("id, meetings(date)")
          .eq("speaker_id", memberId!)
          .eq("completed", true),
        supabase
          .from("meeting_roles")
          .select("id, status")
          .eq("member_id", memberId!),
        supabase
          .from("grammarian_reports")
          .select("grammar_errors, notable_phrases, score, meetings(date)")
          .eq("member_id", memberId!),
        supabase
          .from("ah_counter_reports")
          .select("ah_count, meetings(date)")
          .eq("speaker_id", memberId!),
        supabase
          .from("timer_reports")
          .select(
            "target_seconds, actual_seconds, speech_id, meetings(date), speeches(title, completed)",
          )
          .eq("member_id", memberId!)
          .not("speech_id", "is", null),
      ]);

      const memberName = (memberRow as { name: string } | null)?.name ?? "You";

      // Role stats
      const rolesFilled = roles?.length ?? 0;
      const completedRoles =
        roles?.filter((r) => r.status === "completed").length ?? 0;
      const roleCompletionRate =
        rolesFilled > 0
          ? Math.round((completedRoles / rolesFilled) * 100)
          : 0;

      // Grammarian series
      const grammarianSeries: GrammarianPoint[] = (grammarReports ?? [])
        .map((r) => {
          const date = (r.meetings as { date: string } | null)?.date ?? "";
          return {
            date,
            label: formatLabel(date),
            grammarErrors: r.grammar_errors ?? 0,
            notablePhrases: r.notable_phrases ?? 0,
            score: r.score ?? null,
          };
        })
        .filter((p) => p.date !== "")
        .sort((a, b) => a.date.localeCompare(b.date));

      // Ah Counter series
      const ahCounterSeries: AhCounterPoint[] = (ahReports ?? [])
        .map((r) => {
          const date = (r.meetings as { date: string } | null)?.date ?? "";
          return {
            date,
            label: formatLabel(date),
            ahCount: r.ah_count ?? 0,
          };
        })
        .filter((p) => p.date !== "")
        .sort((a, b) => a.date.localeCompare(b.date));

      // Timer series: prepared speeches only (completed = true, both seconds set)
      const preparedTimers = (timerReports ?? []).filter((r) => {
        const speech = r.speeches as {
          title: string;
          completed: boolean;
        } | null;
        return (
          speech?.completed === true &&
          r.target_seconds != null &&
          r.actual_seconds != null
        );
      });

      // Count how many speeches per date to decide whether to suffix labels
      const dateTotals: Record<string, number> = {};
      preparedTimers.forEach((r) => {
        const date = (r.meetings as { date: string } | null)?.date ?? "";
        dateTotals[date] = (dateTotals[date] ?? 0) + 1;
      });

      const dateIdx: Record<string, number> = {};
      const timerSeries: TimerPoint[] = preparedTimers
        .sort((a, b) => {
          const da = (a.meetings as { date: string } | null)?.date ?? "";
          const db = (b.meetings as { date: string } | null)?.date ?? "";
          return da.localeCompare(db);
        })
        .map((r) => {
          const date = (r.meetings as { date: string } | null)?.date ?? "";
          const speech = r.speeches as {
            title: string;
            completed: boolean;
          } | null;
          dateIdx[date] = (dateIdx[date] ?? 0) + 1;
          const delta = (r.actual_seconds ?? 0) - (r.target_seconds ?? 0);
          const baseLabel = formatLabel(date);
          const xLabel =
            dateTotals[date] > 1
              ? `${baseLabel} #${dateIdx[date]}`
              : baseLabel;
          return {
            date,
            xLabel,
            speechTitle: speech?.title ?? "Untitled",
            delta,
            targetSeconds: r.target_seconds ?? 0,
            actualSeconds: r.actual_seconds ?? 0,
            onTime: Math.abs(delta) <= 15,
          };
        })
        .filter((p) => p.date !== "");

      // Monthly speeches (last 6 months)
      const months6 = getLast6Months();
      const monthlyCounts: Record<string, number> = {};
      (speeches ?? []).forEach((s) => {
        const date = (s.meetings as { date: string } | null)?.date;
        if (date) {
          const key = date.substring(0, 7);
          monthlyCounts[key] = (monthlyCounts[key] ?? 0) + 1;
        }
      });
      const monthlySpeeches = months6.map(({ key, label }) => ({
        month: label,
        count: monthlyCounts[key] ?? 0,
      }));

      // Summary stats
      const avgErrors =
        grammarianSeries.length > 0
          ? parseFloat(
              (
                grammarianSeries.reduce((s, r) => s + r.grammarErrors, 0) /
                grammarianSeries.length
              ).toFixed(1),
            )
          : 0;
      const scorePoints = grammarianSeries.filter((r) => r.score != null);
      const avgScore =
        scorePoints.length > 0
          ? parseFloat(
              (
                scorePoints.reduce((s, r) => s + (r.score ?? 0), 0) /
                scorePoints.length
              ).toFixed(1),
            )
          : 0;
      const avgFillers =
        ahCounterSeries.length > 0
          ? parseFloat(
              (
                ahCounterSeries.reduce((s, r) => s + r.ahCount, 0) /
                ahCounterSeries.length
              ).toFixed(1),
            )
          : 0;
      const avgDelta =
        timerSeries.length > 0
          ? parseFloat(
              (
                timerSeries.reduce((s, r) => s + r.delta, 0) /
                timerSeries.length
              ).toFixed(1),
            )
          : 0;
      const onTimeRate =
        timerSeries.length > 0
          ? Math.round(
              (timerSeries.filter((r) => r.onTime).length / timerSeries.length) *
                100,
            )
          : 0;

      return {
        memberName,
        speechesDelivered: speeches?.length ?? 0,
        rolesFilled,
        completedRoles,
        roleCompletionRate,
        monthlySpeeches,
        grammarianSeries,
        ahCounterSeries,
        timerSeries,
        summaryStats: {
          grammarian: {
            timesServed: grammarianSeries.length,
            avgErrors,
            avgScore,
          },
          ahCounter: {
            timesTracked: ahCounterSeries.length,
            avgFillers,
          },
          timer: {
            speechesTimed: timerSeries.length,
            avgDelta,
            onTimeRate,
          },
        },
      };
    },
  });
}
