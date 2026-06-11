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

export interface SpeakerFillerStat {
  memberName: string;
  avgFillers: number;
  meetingsTracked: number;
}

export interface SpeakerTimingStat {
  memberName: string;
  avgDelta: number;
  onTimeRate: number;
  speechesTimed: number;
}

export interface AnalyticsData {
  speechesDelivered: number;
  totalSpeechesPlanned: number;
  speakerCompletionRate: number;
  totalRoles: number;
  fillerWordAvg: number;
  fillerReportsLogged: number;
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
  speakerFillerStats: SpeakerFillerStat[];
  speakerTimingStats: SpeakerTimingStat[];
}

// Colors are a UI concern — applied client-side after the RPC returns name+count
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

type RpcResult = Omit<AnalyticsData, "roleDistribution" | "speakerFillerStats" | "speakerTimingStats"> & {
  roleDistribution: Array<{ name: string; count: number }>;
  speakerFillerStats: SpeakerFillerStat[] | null;
  speakerTimingStats: SpeakerTimingStat[] | null;
};

export function useAnalytics() {
  return useQuery<AnalyticsData>({
    queryKey: ["analytics"],
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_analytics");
      if (error) throw error;

      const raw = data as unknown as RpcResult;

      return {
        ...raw,
        roleDistribution: raw.roleDistribution.map(({ name, count }, index) => ({
          name,
          count,
          color: ROLE_COLORS[name] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length],
        })),
        speakerFillerStats:  raw.speakerFillerStats  ?? [],
        speakerTimingStats:  raw.speakerTimingStats  ?? [],
      };
    },
  });
}
