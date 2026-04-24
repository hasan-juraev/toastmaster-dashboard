import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export interface MonthlySpeeches {
  month: string; // e.g. "Jan", "Feb"
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
  monthlySpeechData: MonthlySpeeches[];
  roleDistribution: RoleDistribution[];
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
  "Table Topics Master": "#10b981",
  "General Evaluator": "#ec4899",
  Timer: "#06b6d4",
  Grammarian: "#84cc16",
  "Ah Counter": "#f97316",
};

const FALLBACK_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#f59e0b",
  "#10b981",
  "#ec4899",
  "#06b6d4",
];

export function useAnalytics() {
  return useQuery<AnalyticsData>({
    queryKey: ["analytics"],
    queryFn: async () => {
      // 1. Fetch all speeches
      const { data: speeches, error: speechErr } = await supabase
        .from("speeches")
        .select("id, completed, meeting_id, meetings(date)")
        .eq("completed", true);

      if (speechErr) throw speechErr;

      // 2. Fetch all meeting roles (with role name via join)
      const { data: meetingRoles, error: rolesErr } = await supabase
        .from("meeting_roles")
        .select("id, role_id, roles(name)");

      if (rolesErr) throw rolesErr;

      // 3. Fetch filler word reports
      const { data: ahReports, error: ahErr } = await supabase
        .from("ah_counter_reports")
        .select("ah_count");

      if (ahErr) throw ahErr;

      // --- Speeches delivered ---
      const speechesDelivered = speeches?.length ?? 0;

      // --- Total roles ---
      const totalRoles = meetingRoles?.length ?? 0;

      // --- Filler word average ---
      const fillerWordAvg =
        ahReports && ahReports.length > 0
          ? parseFloat(
              (
                ahReports.reduce((sum, r) => sum + (r.ah_count ?? 0), 0) /
                ahReports.length
              ).toFixed(1),
            )
          : 0;

      // --- Monthly speech data (last 6 months) ---
      const now = new Date();
      const monthlyCounts: Record<string, number> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthlyCounts[MONTH_LABELS[d.getMonth()]] = 0;
      }

      speeches?.forEach((s) => {
        const meetingDate = (s.meetings as unknown as { date: string } | null)
          ?.date;
        if (!meetingDate) return;
        const d = new Date(meetingDate);
        const label = MONTH_LABELS[d.getMonth()];
        if (label in monthlyCounts) {
          monthlyCounts[label] = (monthlyCounts[label] ?? 0) + 1;
        }
      });

      const monthlySpeechData: MonthlySpeeches[] = Object.entries(
        monthlyCounts,
      ).map(([month, count]) => ({ month, count }));

      // --- Role distribution ---
      const roleCounts: Record<string, number> = {};
      meetingRoles?.forEach((mr) => {
        const name =
          (mr.roles as unknown as { name: string } | null)?.name ?? "Other";
        roleCounts[name] = (roleCounts[name] ?? 0) + 1;
      });

      // Group small roles into "Other"
      const MAIN_ROLES = [
        "Speaker",
        "Toastmaster",
        "Evaluator",
        "Table Topics Master",
      ];
      const grouped: Record<string, number> = {};
      Object.entries(roleCounts).forEach(([name, count]) => {
        if (MAIN_ROLES.includes(name)) {
          grouped[name] = (grouped[name] ?? 0) + count;
        } else {
          grouped["Other"] = (grouped["Other"] ?? 0) + count;
        }
      });

      const roleDistribution: RoleDistribution[] = Object.entries(grouped).map(
        ([name, count], i) => ({
          name,
          count,
          color:
            ROLE_COLORS[name] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
        }),
      );

      return {
        speechesDelivered,
        totalRoles,
        fillerWordAvg,
        monthlySpeechData,
        roleDistribution,
      };
    },
  });
}
