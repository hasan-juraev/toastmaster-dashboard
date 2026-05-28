import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useMyMeetingRole } from "../hooks/useRoles";
import { useProfile } from "../hooks/useProfile";
import { AppShell } from "../components/ui/AppShell";
import type { Meeting } from "../types/database";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export default function MyRoleDashboard() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const { memberId } = useProfile();

  const { data: meeting, isLoading: meetingLoading } = useQuery<Meeting | null>({
    queryKey: ["meeting", meetingId],
    queryFn: async () => {
      const { data } = await supabase
        .from("meetings")
        .select("*")
        .eq("id", meetingId!)
        .single();
      return data ?? null;
    },
    enabled: !!meetingId,
  });

  const { data: myRole, isLoading: roleLoading } = useMyMeetingRole(
    meetingId ?? "",
    memberId,
  );

  const isLoading = meetingLoading || roleLoading;
  const roleName = myRole?.roles?.name;

  return (
    <AppShell>
      <section className="space-y-6 pt-8 pb-6 md:space-y-8 md:pt-10">
        <div>
          <Link to="/role-signup" className="text-sm font-medium text-primary">
            ← Role Signup
          </Link>
        </div>

        {isLoading ? (
          <div className="app-panel rounded-[1.5rem] px-5 py-10 text-center text-app-text-muted">
            Loading…
          </div>
        ) : !myRole ? (
          <div className="app-panel rounded-[1.5rem] px-5 py-10 text-center text-app-text-muted">
            <p>You don't have a role assigned for this meeting.</p>
            <Link
              to="/role-signup"
              className="mt-3 inline-block text-sm font-medium text-primary"
            >
              Sign up for a role →
            </Link>
          </div>
        ) : (
          <>
            <div className="app-panel rounded-[2rem] p-6 md:p-7">
              <p className="app-eyebrow">My Role</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight text-app-text md:text-[3rem]">
                {roleName ?? "Assigned Role"}
              </h1>
              {meeting && (
                <p className="mt-3 text-base text-app-text-muted">
                  {formatDate(meeting.date)}
                  {meeting.theme ? ` — ${meeting.theme}` : ""}
                </p>
              )}

              <div className="mt-4 flex items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                    myRole.status === "completed"
                      ? "bg-emerald-50 text-emerald-600"
                      : myRole.status === "in_progress"
                        ? "bg-blue-50 text-blue-600"
                        : "bg-amber-50 text-amber-600"
                  }`}
                >
                  {myRole.status ?? "assigned"}
                </span>
              </div>
            </div>

            <div className="app-panel rounded-[2rem] p-6">
              <RoleActionPanel roleName={roleName ?? ""} meetingId={meetingId ?? ""} />
            </div>

            {meetingId && (
              <div className="text-center">
                <Link
                  to={`/meetings/${meetingId}`}
                  className="text-sm font-medium text-primary hover:text-primary/80"
                >
                  View full meeting details →
                </Link>
              </div>
            )}
          </>
        )}
      </section>
    </AppShell>
  );
}

function RoleActionPanel({ roleName, meetingId }: { roleName: string; meetingId: string }) {
  switch (roleName) {
    case "Toastmaster":
      return <ToastmasterPanel meetingId={meetingId} />;
    case "Ah-Counter":
      return <AhCounterPanel meetingId={meetingId} />;
    case "Grammarian":
      return <GrammarianPanel meetingId={meetingId} />;
    case "Timer":
      return <TimerPanel meetingId={meetingId} />;
    case "Evaluator":
      return <EvaluatorPanel meetingId={meetingId} />;
    case "Speaker":
      return <SpeakerPanel meetingId={meetingId} />;
    case "General Evaluator":
      return <GeneralEvaluatorPanel meetingId={meetingId} />;
    default:
      return (
        <div>
          <p className="app-eyebrow">Role Guide</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-app-text">
            {roleName}
          </h2>
          <p className="mt-3 text-sm text-app-text-muted">
            Your admin will capture notes and scores for this role. Refer to your
            Toastmasters manual for role responsibilities.
          </p>
        </div>
      );
  }
}

function ToastmasterPanel({ meetingId }: { meetingId: string }) {
  return (
    <div>
      <p className="app-eyebrow">Your Role</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-app-text">
        Toastmaster of the Day
      </h2>
      <div className="mt-5 space-y-3 text-sm text-app-text-muted">
        <p>As Toastmaster, you are the host and conductor of today's meeting.</p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>Open and close the meeting</li>
          <li>Introduce each speaker and role holder</li>
          <li>Set and announce the meeting theme</li>
          <li>Keep the meeting running on time</li>
          <li>Facilitate Table Topics if no Table Topics Master is assigned</li>
        </ul>
        <p className="mt-2">
          Your admin can set the theme and theme question in the{" "}
          <Link to={`/meetings/${meetingId}`} className="text-primary hover:underline">
            meeting detail page
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function AhCounterPanel({ meetingId }: { meetingId: string }) {
  return (
    <div>
      <p className="app-eyebrow">Your Role</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-app-text">
        Ah-Counter
      </h2>
      <div className="mt-5 space-y-3 text-sm text-app-text-muted">
        <p>Track filler words (ah, um, er, so, like, you know) for each speaker.</p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>Make a tally mark for each filler word you hear</li>
          <li>Track separately for each speaker</li>
          <li>Report counts at the end of the meeting</li>
          <li>Be encouraging — the goal is awareness, not criticism</li>
        </ul>
        <p className="mt-2">
          Your admin will enter the filler counts in the{" "}
          <Link to={`/meetings/${meetingId}`} className="text-primary hover:underline">
            role assignment panel
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function GrammarianPanel({ meetingId }: { meetingId: string }) {
  return (
    <div>
      <p className="app-eyebrow">Your Role</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-app-text">
        Grammarian
      </h2>
      <div className="mt-5 space-y-3 text-sm text-app-text-muted">
        <p>Monitor grammar usage and introduce the Word of the Day.</p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>Introduce and define the Word of the Day at the start</li>
          <li>Note grammar errors throughout the meeting</li>
          <li>Record any noteworthy or creative phrases</li>
          <li>Give your grammar report at the end</li>
        </ul>
        <p className="mt-2">
          Your admin will log grammar errors and notable phrases in the{" "}
          <Link to={`/meetings/${meetingId}`} className="text-primary hover:underline">
            role assignment panel
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function TimerPanel({ meetingId }: { meetingId: string }) {
  return (
    <div>
      <p className="app-eyebrow">Your Role</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-app-text">
        Timer
      </h2>
      <div className="mt-5 space-y-3 text-sm text-app-text-muted">
        <p>Track speaking times for all speakers against their targets.</p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>Know the time limits for each speech type before the meeting</li>
          <li>Use green / yellow / red signals at appropriate intervals</li>
          <li>Record actual times for each speaker</li>
          <li>Report times at the end of the meeting</li>
        </ul>
        <p className="mt-2">
          Your admin will enter target and actual times in the{" "}
          <Link to={`/meetings/${meetingId}`} className="text-primary hover:underline">
            role assignment panel
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function EvaluatorPanel({ meetingId }: { meetingId: string }) {
  return (
    <div>
      <p className="app-eyebrow">Your Role</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-app-text">
        Evaluator
      </h2>
      <div className="mt-5 space-y-3 text-sm text-app-text-muted">
        <p>Give a constructive evaluation of your assigned speaker.</p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>Review the speaker's manual project objectives beforehand</li>
          <li>Note 2–3 specific strengths to praise</li>
          <li>Identify 1–2 improvement areas with actionable suggestions</li>
          <li>Keep your evaluation to 2–3 minutes</li>
          <li>Be positive, specific, and encouraging</li>
        </ul>
        <p className="mt-2">
          Your admin will log your evaluation scores and notes in the{" "}
          <Link to={`/meetings/${meetingId}`} className="text-primary hover:underline">
            role assignment panel
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function SpeakerPanel({ meetingId }: { meetingId: string }) {
  return (
    <div>
      <p className="app-eyebrow">Your Role</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-app-text">
        Speaker
      </h2>
      <div className="mt-5 space-y-3 text-sm text-app-text-muted">
        <p>Deliver a prepared speech from your Toastmasters manual.</p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>Know your speech project objectives and time limits</li>
          <li>Prepare and practice your speech in advance</li>
          <li>Provide your speech title and planned time to the Toastmaster</li>
          <li>Stay within your allotted time</li>
          <li>Welcome your evaluator's feedback</li>
        </ul>
        <p className="mt-2">
          Your speech details are tracked in the{" "}
          <Link to={`/meetings/${meetingId}`} className="text-primary hover:underline">
            meeting detail page
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function GeneralEvaluatorPanel({ meetingId }: { meetingId: string }) {
  return (
    <div>
      <p className="app-eyebrow">Your Role</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-app-text">
        General Evaluator
      </h2>
      <div className="mt-5 space-y-3 text-sm text-app-text-muted">
        <p>Evaluate the overall meeting and lead the evaluation segment.</p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>Observe the meeting flow, timing, and organisation</li>
          <li>Introduce each evaluator during the evaluation segment</li>
          <li>Comment on roles not evaluated individually (Toastmaster, Timer, Grammarian, etc.)</li>
          <li>Give an overall meeting assessment: what worked, what could improve</li>
        </ul>
        <p className="mt-2">
          Your admin will log your overall score and notes in the{" "}
          <Link to={`/meetings/${meetingId}`} className="text-primary hover:underline">
            role assignment panel
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
