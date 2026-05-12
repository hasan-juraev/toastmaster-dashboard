import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export interface MonthlySpeeches {
  month: string;
  count: number;
}

export interface RoleDistribution {
  name: string;
  count: number;
  color: string;
}

export interface AnalyticsData {
  speechesDelivered: number;
  totalRoles: number;
  fillerWordAvg: number;
  roleCompletionRate: number;
  monthlySpeechData: MonthlySpeeches[];
  roleDistribution: RoleDistribution[];
  roleStatusCounts: {
    assigned: number;
    inProgress: number;
    completed: number;
    skipped: number;
  };
  memberRoleProgress: Array<{
    memberName: string;
    rolesCompleted: number;
    distinctRoleCount: number;
    topRole: string;
  }>;
  grammarianStats: {
    reportsLogged: number;
    avgErrors: number;
    avgScore: number;
    notablePhrasesAvg: number;
  };
  evaluatorStats: {
    reportsLogged: number;
    avgQuality: number;
  };
  timerStats: {
    reportsLogged: number;
    avgDelta: number;
    onTimeRate: number;
  };
  facilitatorStats: {
    avgScore: number;
    toastmasterAvg: number;
    generalEvaluatorAvg: number;
  };
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const ROLE_COLORS: Record<string, string> = {
  Speaker: "#3b82f6",
  Toastmaster: "#8b5cf6",
  Evaluator: "#f59e0b",
  "General Evaluator": "#ec4899",
  Timer: "#06b6d4",
  Grammarian: "#84cc16",
  "Ah-Counter": "#f97316",
};

const FALLBACK_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#f59e0b",
  "#10b981",
  "#ec4899",
  "#06b6d4",
];

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return parseFloat(
    (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1),
  );
}

export function useAnalytics() {
  return useQuery<AnalyticsData>({
    queryKey: ["analytics"],
    queryFn: async () => {
      const [
        { data: speeches, error: speechErr },
        { data: meetingRoles, error: rolesErr },
        { data: ahReports, error: ahErr },
        { data: members, error: membersErr },
        { data: grammarianReports, error: grammarianErr },
        { data: evaluatorReports, error: evaluatorErr },
        { data: timerReports, error: timerErr },
      ] = await Promise.all([
        supabase
          .from("speeches")
          .select("id, completed, meeting_id, meetings(date)")
          .eq("completed", true),
        supabase
          .from("meeting_roles")
          .select("id, role_id, member_id, status, score, roles(name), members(name)"),
        supabase.from("ah_counter_reports").select("ah_count"),
        supabase.from("members").select("id, name"),
        supabase.from("grammarian_reports").select("*"),
        supabase.from("evaluator_reports").select("*"),
        supabase.from("timer_reports").select("*"),
      ]);

      if (speechErr) throw speechErr;
      if (rolesErr) throw rolesErr;
      if (ahErr) throw ahErr;
      if (membersErr) throw membersErr;
      if (grammarianErr) throw grammarianErr;
      if (evaluatorErr) throw evaluatorErr;
      if (timerErr) throw timerErr;

      const speechesDelivered = speeches?.length ?? 0;
      const totalRoles = meetingRoles?.length ?? 0;
      const fillerWordAvg = average((ahReports ?? []).map((report) => report.ah_count ?? 0));

      const now = new Date();
      const monthlyCounts: Record<string, number> = {};
      for (let index = 5; index >= 0; index -= 1) {
        const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
        monthlyCounts[MONTH_LABELS[date.getMonth()]] = 0;
      }

      speeches?.forEach((speech) => {
        const meetingDate =
          (speech.meetings as unknown as { date: string } | null)?.date ?? null;
        if (!meetingDate) {
          return;
        }

        const label = MONTH_LABELS[new Date(meetingDate).getMonth()];
        if (label in monthlyCounts) {
          monthlyCounts[label] = (monthlyCounts[label] ?? 0) + 1;
        }
      });

      const monthlySpeechData: MonthlySpeeches[] = Object.entries(monthlyCounts).map(
        ([month, count]) => ({ month, count }),
      );

      const roleCounts: Record<string, number> = {};
      const roleStatusCounts = {
        assigned: 0,
        inProgress: 0,
        completed: 0,
        skipped: 0,
      };
      const memberProgressMap = new Map<
        string,
        { completed: number; roleCounts: Record<string, number> }
      >();
      const memberNameLookup = new Map((members ?? []).map((member) => [member.id, member.name]));

      (meetingRoles ?? []).forEach((meetingRole) => {
        const roleName =
          (meetingRole.roles as unknown as { name: string } | null)?.name ?? "Other";
        roleCounts[roleName] = (roleCounts[roleName] ?? 0) + 1;

        const normalizedStatus = meetingRole.status ?? "assigned";
        if (normalizedStatus === "completed") {
          roleStatusCounts.completed += 1;
        } else if (normalizedStatus === "in_progress") {
          roleStatusCounts.inProgress += 1;
        } else if (normalizedStatus === "skipped") {
          roleStatusCounts.skipped += 1;
        } else {
          roleStatusCounts.assigned += 1;
        }

        if (!meetingRole.member_id) {
          return;
        }

        const memberName =
          (meetingRole.members as unknown as { name: string } | null)?.name ??
          memberNameLookup.get(meetingRole.member_id) ??
          "Unknown member";
        const current = memberProgressMap.get(memberName) ?? {
          completed: 0,
          roleCounts: {},
        };
        current.roleCounts[roleName] = (current.roleCounts[roleName] ?? 0) + 1;
        if (normalizedStatus === "completed") {
          current.completed += 1;
        }
        memberProgressMap.set(memberName, current);
      });

      const roleDistribution = Object.entries(roleCounts)
        .sort((left, right) => right[1] - left[1])
        .map(([name, count], index) => ({
          name,
          count,
          color: ROLE_COLORS[name] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length],
        }));

      const roleCompletionRate =
        totalRoles > 0
          ? Math.round((roleStatusCounts.completed / totalRoles) * 100)
          : 0;

      const memberRoleProgress = Array.from(memberProgressMap.entries())
        .map(([memberName, progress]) => {
          const topRoleEntry =
            Object.entries(progress.roleCounts).sort((left, right) => right[1] - left[1])[0] ??
            ["No role yet", 0];

          return {
            memberName,
            rolesCompleted: progress.completed,
            distinctRoleCount: Object.keys(progress.roleCounts).length,
            topRole: topRoleEntry[0],
          };
        })
        .sort(
          (left, right) =>
            right.rolesCompleted - left.rolesCompleted ||
            right.distinctRoleCount - left.distinctRoleCount,
        )
        .slice(0, 6);

      const grammarianStats = {
        reportsLogged: grammarianReports?.length ?? 0,
        avgErrors: average(
          (grammarianReports ?? []).map((report) => report.grammar_errors ?? 0),
        ),
        avgScore: average(
          (grammarianReports ?? [])
            .map((report) => report.score)
            .filter((score): score is number => score != null),
        ),
        notablePhrasesAvg: average(
          (grammarianReports ?? []).map((report) => report.notable_phrases ?? 0),
        ),
      };

      const evaluatorStats = {
        reportsLogged: evaluatorReports?.length ?? 0,
        avgQuality: average(
          (evaluatorReports ?? [])
            .map((report) => report.quality_score)
            .filter((score): score is number => score != null),
        ),
      };

      const timerDeltas = (timerReports ?? [])
        .map((report) => {
          if (report.target_seconds == null || report.actual_seconds == null) {
            return null;
          }

          return Math.abs(report.actual_seconds - report.target_seconds);
        })
        .filter((value): value is number => value != null);
      const onTimeCount = timerDeltas.filter((delta) => delta <= 15).length;
      const timerStats = {
        reportsLogged: timerReports?.length ?? 0,
        avgDelta: average(timerDeltas),
        onTimeRate:
          timerDeltas.length > 0 ? Math.round((onTimeCount / timerDeltas.length) * 100) : 0,
      };

      const toastmasterScores = (meetingRoles ?? [])
        .filter(
          (meetingRole) =>
            ((meetingRole.roles as unknown as { name: string } | null)?.name ?? "") ===
              "Toastmaster" && meetingRole.score != null,
        )
        .map((meetingRole) => Number(meetingRole.score ?? 0))
        .filter((score) => Number.isFinite(score));
      const generalEvaluatorScores = (meetingRoles ?? [])
        .filter(
          (meetingRole) =>
            ((meetingRole.roles as unknown as { name: string } | null)?.name ?? "") ===
              "General Evaluator" && meetingRole.score != null,
        )
        .map((meetingRole) => Number(meetingRole.score ?? 0))
        .filter((score) => Number.isFinite(score));
      const allFacilitatorScores = [...toastmasterScores, ...generalEvaluatorScores];
      const facilitatorStats = {
        avgScore: average(allFacilitatorScores),
        toastmasterAvg: average(toastmasterScores),
        generalEvaluatorAvg: average(generalEvaluatorScores),
      };

      return {
        speechesDelivered,
        totalRoles,
        fillerWordAvg,
        roleCompletionRate,
        monthlySpeechData,
        roleDistribution,
        roleStatusCounts,
        memberRoleProgress,
        grammarianStats,
        evaluatorStats,
        timerStats,
        facilitatorStats,
      };
    },
  });
}
