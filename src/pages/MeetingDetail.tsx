import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Meeting } from "../types/database";
import RoleAssignment from "../components/meetings/RoleAssignment";
import VotingSection from "../components/meetings/VotingSection";
import SpeechComments from "../components/meetings/SpeechComments";
import { AppShell } from "../components/ui/AppShell";
import { useMeetingRoles, useMyMeetingRole } from "../hooks/useRoles";
import { useProfile } from "../hooks/useProfile";
import { useMembers } from "../hooks/useMembers";
import { useAhCounterReports, useTimerReports } from "../hooks/useRoleReports";

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

function MemberRolesView({
  meetingId,
  memberId,
}: {
  meetingId: string;
  memberId: string | null;
}) {
  const { data: meetingRoles = [] } = useMeetingRoles(meetingId);
  const { data: members = [] } = useMembers();
  const { data: myRole } = useMyMeetingRole(meetingId, memberId);

  return (
    <div>
      <p className="app-eyebrow">Roles</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-app-text">
        Meeting Roles
      </h2>

      {myRole && (
        <div className="mt-4 rounded-[1.35rem] border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-sm font-semibold text-emerald-700">
            Your role:{" "}
            <span className="font-bold">
              {(myRole as { roles?: { name: string } | null }).roles?.name ?? "Assigned"}
            </span>
          </p>
          <Link
            to={`/my-role/${meetingId}`}
            className="mt-1 inline-block text-sm font-medium text-emerald-600 underline-offset-2 hover:underline"
          >
            Go to My Role Dashboard →
          </Link>
        </div>
      )}

      {meetingRoles.length === 0 ? (
        <p className="mt-4 text-sm text-app-text-muted">
          No roles have been set up for this meeting yet.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {meetingRoles.map((role) => {
            const member = members.find((m) => m.id === role.member_id);
            const isMyRole = role.member_id === memberId;
            return (
              <div
                key={role.id}
                className={`flex items-center justify-between gap-3 rounded-[1.25rem] border px-4 py-3 ${
                  isMyRole
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-app-border bg-app-panel-soft"
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-app-text">
                    {(role as { roles?: { name: string } | null } & typeof role).roles?.name ?? "Role"}
                  </p>
                  <p className="text-xs text-app-text-muted">
                    {member ? member.name : "Unassigned"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    role.status === "completed"
                      ? "bg-emerald-50 text-emerald-600"
                      : role.member_id
                        ? "bg-blue-50 text-blue-600"
                        : "bg-app-panel text-app-text-muted"
                  }`}
                >
                  {role.status ?? (role.member_id ? "assigned" : "open")}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function fmtSecs(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function MeetingFeedbackCard({
  meetingId,
  memberId,
  speeches,
}: {
  meetingId: string;
  memberId: string;
  speeches: MeetingSpeech[];
}) {
  const { data: ahReports = [] } = useAhCounterReports(meetingId);
  const { data: timerReports = [] } = useTimerReports(meetingId);

  const myAhReport = ahReports.find((r) => r.speaker_id === memberId);
  const mySpeeches = speeches.filter((s) => s.speaker_id === memberId);
  const myTimerReports = timerReports.filter((r) =>
    mySpeeches.some((s) => s.id === r.speech_id),
  );

  if (!myAhReport && myTimerReports.length === 0) return null;

  return (
    <div className="app-panel rounded-[2rem] p-6">
      <p className="app-eyebrow">Feedback Received</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-app-text">
        Your Meeting Feedback
      </h2>

      {myAhReport && (
        <div className="mt-4 rounded-[1.25rem] border border-app-border bg-app-panel-soft p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
            Filler Words (Ah-Counter)
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-3xl font-bold tabular-nums text-app-text">
              {myAhReport.ah_count}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                myAhReport.ah_count <= 2
                  ? "bg-emerald-50 text-emerald-600"
                  : myAhReport.ah_count <= 5
                    ? "bg-amber-50 text-amber-600"
                    : "bg-red-50 text-red-600"
              }`}
            >
              {myAhReport.ah_count <= 2
                ? "Excellent"
                : myAhReport.ah_count <= 5
                  ? "Good"
                  : "High"}
            </span>
          </div>
          {myAhReport.notes && (
            <p className="mt-2 text-sm text-app-text-muted">{myAhReport.notes}</p>
          )}
        </div>
      )}

      {myTimerReports.length > 0 && (
        <div className="mt-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
            Speech Timing (Timer)
          </p>
          {myTimerReports.map((tr) => {
            const speech = mySpeeches.find((s) => s.id === tr.speech_id);
            const delta =
              tr.target_seconds != null && tr.actual_seconds != null
                ? tr.actual_seconds - tr.target_seconds
                : null;
            return (
              <div
                key={tr.id}
                className="rounded-[1.2rem] border border-app-border bg-app-panel-soft p-4"
              >
                <p className="text-sm font-semibold text-app-text">
                  {speech?.title ?? "Speech"}
                </p>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-app-text-muted">
                  {tr.target_seconds != null && (
                    <span>
                      Target:{" "}
                      <span className="font-medium text-app-text">
                        {fmtSecs(tr.target_seconds)}
                      </span>
                    </span>
                  )}
                  {tr.actual_seconds != null && (
                    <span>
                      Actual:{" "}
                      <span className="font-medium text-app-text">
                        {fmtSecs(tr.actual_seconds)}
                      </span>
                    </span>
                  )}
                  {delta != null && (
                    <span
                      className={`font-semibold ${
                        Math.abs(delta) <= 15
                          ? "text-emerald-600"
                          : delta > 0
                            ? "text-orange-500"
                            : "text-sky-500"
                      }`}
                    >
                      {delta > 0 ? "+" : ""}
                      {delta}s{" "}
                      {Math.abs(delta) <= 15
                        ? "— on time"
                        : delta > 0
                          ? "— over"
                          : "— under"}
                    </span>
                  )}
                </div>
                {tr.notes && (
                  <p className="mt-1.5 text-sm text-app-text-muted">{tr.notes}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function MeetingDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: meetingRoles } = useMeetingRoles(id ?? "");
  const { isAdmin, memberId } = useProfile();

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
          {isAdmin ? (
            <RoleAssignment meetingId={meeting.id} speeches={speeches} />
          ) : (
            <MemberRolesView meetingId={meeting.id} memberId={memberId} />
          )}
        </div>

        <div className="app-panel rounded-[2rem] p-6">
          <VotingSection meetingId={meeting.id} currentMemberId={memberId} isAdmin={isAdmin} />
        </div>

        {!isAdmin && memberId && speeches.some((s) => s.speaker_id === memberId) && (
          <MeetingFeedbackCard
            meetingId={meeting.id}
            memberId={memberId}
            speeches={speeches}
          />
        )}

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
                  <SpeechComments
                    speechId={speech.id}
                    currentMemberId={memberId}
                    isAdmin={isAdmin}
                  />
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
