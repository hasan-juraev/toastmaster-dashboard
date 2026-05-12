export interface Member {
  id: string;
  name: string;
  email: string | null;
  active: boolean;
  created_at: string;
}

export interface Meeting {
  id: string;
  date: string;
  theme: string | null;
  location: string | null;
  status: string;
  created_at: string;
}

export interface Role {
  id: string;
  name: string;
}

export type MeetingRoleStatus =
  | "unassigned"
  | "assigned"
  | "in_progress"
  | "completed"
  | "skipped";

export interface MeetingRole {
  id: string;
  meeting_id: string;
  role_id: string;
  member_id: string | null;
  allow_duplicate: boolean;
  status: MeetingRoleStatus | null;
  completed_at: string | null;
  notes: string | null;
  score: number | null;
}

export interface Speech {
  id: string;
  meeting_id: string;
  speaker_id: string | null;
  title: string | null;
  manual_time: string | null;
  evaluator_id: string | null;
  completed: boolean;
}

export interface GrammarianReport {
  id: string;
  meeting_role_id: string | null;
  meeting_id: string | null;
  member_id: string | null;
  grammar_errors: number;
  notable_phrases: number;
  score: number | null;
  notes: string | null;
  created_at: string;
}

export interface AhCounterReport {
  id: string;
  meeting_id: string | null;
  speaker_id: string | null;
  ah_count: number;
  notes: string | null;
}

export interface EvaluatorReport {
  id: string;
  meeting_role_id: string | null;
  meeting_id: string | null;
  member_id: string | null;
  speech_id: string | null;
  quality_score: number | null;
  strengths: string | null;
  improvement_notes: string | null;
  created_at: string;
}

export interface TimerReport {
  id: string;
  meeting_role_id: string | null;
  meeting_id: string | null;
  member_id: string | null;
  target_seconds: number | null;
  actual_seconds: number | null;
  notes: string | null;
  created_at: string;
}

export interface Vote {
  id: string;
  meeting_id: string | null;
  category: string | null;
  voted_for_member_id: string | null;
}
