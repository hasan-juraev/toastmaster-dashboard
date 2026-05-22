import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Meeting } from "../types/database";
import RoleAssignment from "../components/meetings/RoleAssignment";
import VotingSection from "../components/meetings/VotingSection";
import SpeechComments from "../components/meetings/SpeechComments";
import { AppShell } from "../components/ui/AppShell";
import { useMeetingRoles } from "../hooks/useRoles";

interface MeetingSpeech {
  id: string;
  title: string | null;
  manual_time: string | null;
  completed: boolean;
  speaker_id: string | null;
  evaluator_id: string | null;
}

interface MeetingDetailData {
  meeting: Meeting;
  speeches: MeetingSpeech[];
}

export default function MeetingDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: meetingRoles } = useMeetingRoles(id ?? "");

  const { data, isLoading, error } = useQuery<MeetingDetailData>({
    queryKey: ["meeting-detail", id],
    queryFn: async () => {
      const [
        { data: meeting, error: meetingError },
        { data: speeches, error: speechesError },
      ] = await Promise.all([
        supabase.from("meetings").select("*").eq("id", id).single(),
        supabase
          .from("speeches")
          .select("id, title, manual_time, completed, speaker_id, evaluator_id")
          .eq("meeting_id", id)
          .order("created_at", { ascending: true }),
      ]);

      if (meetingError) throw meetingError;
      if (speechesError) throw speechesError;

      return {
        meeting: meeting as Meeting,
        speeches: (speeches ?? []) as MeetingSpeech[],
      };
    },
    enabled: !!id,
  });

  const meeting = data?.meeting;
  const speeches = data?.speeches ?? [];
  const assignedCount =
    meetingRoles?.filter((assignment) => assignment.member_id).length ?? 0;
  const openCount = meetingRoles?.filter((r) => !r.member_id).length ?? 0;
  const inProgressCount =
    meetingRoles?.filter((assignment) => assignment.status === "in_progress")
      .length ?? 0;
  const completedRoleCount =
    meetingRoles?.filter((assignment) => assignment.status === "completed")
      .length ?? 0;

  if (isLoading) {
    return (
      <AppShell>
        <div className="pt-10 text-center text-app-text-muted">
          Loading meeting details...
        </div>
      </AppShell>
    );
  }

  if (error || !meeting) {
    return (
      <AppShell>
        <div className="pt-10">
          <div className="rounded-[1.5rem] border border-app-danger/25 bg-app-danger/10 px-4 py-3 text-sm text-red-600">
            Error loading meeting details
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="space-y-6 pt-8 pb-6 md:space-y-8 md:pt-10">
        <div>
          <Link to="/meetings" className="text-sm font-medium text-primary">
            ← Back to Meetings
          </Link>
        </div>

        <div className="grid gap-6 xl:grid-cols-1">
          <div className="app-panel rounded-[2rem] p-6 md:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="app-eyebrow">Meeting</p>
                <h1 className="mt-2 text-4xl font-semibold tracking-tight text-app-text md:text-[3rem]">
                  {meeting.theme || "Untitled Meeting"}
                </h1>
                <p className="mt-3 text-base text-app-text-muted">
                  {new Date(meeting.date).toLocaleDateString()}
                </p>
                <p className="mt-1 text-base font-medium text-app-text-muted">
                  {meeting.location || "Location not set"}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1.5 text-sm font-semibold uppercase ${
                  meeting.status === "completed"
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-amber-50 text-amber-600"
                }`}
              >
                {meeting.status}
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[1.35rem] bg-app-panel-soft p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                  Assigned Roles
                </p>
                <div className="mt-2 text-3xl font-bold text-app-text">
                  {assignedCount}
                </div>
              </div>
              <div className="rounded-[1.35rem] bg-app-panel-soft p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                  Open Roles
                </p>
                <div className="mt-2 text-3xl font-bold text-app-text">
                  {openCount}
                </div>
              </div>
              <div className="rounded-[1.35rem] bg-app-panel-soft p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                  In Progress
                </p>
                <div className="mt-2 text-3xl font-bold text-app-text">
                  {inProgressCount}
                </div>
              </div>
              <div className="rounded-[1.35rem] bg-app-panel-soft p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                  Completed Roles
                </p>
                <div className="mt-2 text-3xl font-bold text-app-text">
                  {completedRoleCount}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="app-panel rounded-[2rem] p-6">
          <RoleAssignment meetingId={meeting.id} speeches={speeches} />
        </div>

        <div className="app-panel rounded-[2rem] p-6">
          <VotingSection meetingId={meeting.id} />
        </div>

        <div className="app-panel rounded-[2rem] p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="app-eyebrow">Speeches</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-app-text">
                Speech plan
              </h2>
            </div>
          </div>

          {speeches.length ? (
            <div className="mt-5 grid gap-3">
              {speeches.map((speech, index) => (
                <article
                  key={speech.id}
                  className="rounded-[1.35rem] border border-app-border bg-app-panel-soft px-4 py-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                        Speech {index + 1}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-app-text">
                        {speech.title || "Untitled Speech"}
                      </h3>
                      <p className="mt-1 text-sm text-app-text-muted">
                        {speech.manual_time || "Time not set"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                        speech.completed
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-amber-50 text-amber-600"
                      }`}
                    >
                      {speech.completed ? "Completed" : "Planned"}
                    </span>
                  </div>
                  <SpeechComments speechId={speech.id} />
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-[1.25rem] border border-dashed border-app-border bg-app-panel-soft p-8 text-center text-app-text-muted">
              No speeches added yet. Add speeches in the data layer and they
              will appear here.
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
