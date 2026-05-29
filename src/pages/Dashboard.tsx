import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../app/AuthContext";
import { useProfile } from "../hooks/useProfile";
import { useMembers } from "../hooks/useMembers";
import { useMeetings } from "../hooks/useMeetings";
import { useMyMeetingRole } from "../hooks/useRoles";
import { AppShell } from "../components/ui/AppShell";
import type { Meeting } from "../types/database";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function formatLongDate() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

function useCountdown(targetDate: string | undefined) {
  const compute = () => {
    if (!targetDate) return null;
    const ms = Math.max(0, new Date(targetDate).getTime() - Date.now());
    return {
      days: Math.floor(ms / 86400000),
      hours: Math.floor((ms % 86400000) / 3600000),
      minutes: Math.floor((ms % 3600000) / 60000),
    };
  };
  const [value, setValue] = useState(compute);
  useEffect(() => {
    if (!targetDate) return;
    setValue(compute());
    const id = setInterval(() => setValue(compute()), 60_000);
    return () => clearInterval(id);
  }, [targetDate]);
  return value;
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[2.6rem] font-bold leading-none tabular-nums text-app-text">
        {String(value).padStart(2, "0")}
      </span>
      <span className="mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-app-text-subtle">
        {label}
      </span>
    </div>
  );
}

function NextSessionCard({ meeting }: { meeting: Meeting | undefined }) {
  const countdown = useCountdown(meeting?.date);

  if (!meeting) {
    return (
      <div className="app-panel flex min-h-[11rem] flex-col items-center justify-center gap-3 rounded-[2rem] p-6 text-center">
        <span className="material-symbols-outlined text-4xl text-app-text-subtle">
          calendar_month
        </span>
        <p className="text-sm text-app-text-muted">
          No upcoming sessions scheduled
        </p>
      </div>
    );
  }

  return (
    <div className="app-panel rounded-[2rem] p-6">
      <p className="app-eyebrow">Next Session</p>
      <h2 className="mt-2 text-xl font-bold leading-tight text-app-text">
        {meeting.theme || "Upcoming Session"}
      </h2>
      <div className="mt-2 flex flex-wrap gap-3 text-sm text-app-text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[1rem]">
            calendar_month
          </span>
          {formatShortDate(meeting.date)}
        </span>
        {meeting.location && (
          <span className="inline-flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[1rem]">
              location_on
            </span>
            {meeting.location}
          </span>
        )}
      </div>
      {countdown && (
        <div className="mt-5 flex items-end gap-5">
          <CountdownUnit value={countdown.days} label="Days" />
          <span className="mb-3 text-2xl font-light text-app-text-subtle">
            ·
          </span>
          <CountdownUnit value={countdown.hours} label="Hrs" />
          <span className="mb-3 text-2xl font-light text-app-text-subtle">
            ·
          </span>
          <CountdownUnit value={countdown.minutes} label="Min" />
        </div>
      )}
    </div>
  );
}

function RoleTeaser({
  meetingId,
  memberId,
  meetingTheme,
}: {
  meetingId: string;
  memberId: string | null;
  meetingTheme: string | null;
}) {
  const { data: myRole } = useMyMeetingRole(meetingId, memberId);
  if (!myRole?.roles) return null;

  return (
    <Link
      to={`/my-role/${meetingId}`}
      className="app-panel block rounded-[2rem] p-5 transition hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <span className="material-symbols-outlined text-[1.15rem]">
              rate_review
            </span>
          </div>
          <div>
            <p className="app-eyebrow">Your Role · Confirmed</p>
            <p className="mt-0.5 text-lg font-bold leading-tight text-app-text">
              {myRole.roles.name}
              {meetingTheme ? ` — ${meetingTheme}` : ""}
            </p>
          </div>
        </div>
        <span className="material-symbols-outlined mt-0.5 shrink-0 text-primary">
          arrow_forward
        </span>
      </div>
      <p className="mt-3 text-sm text-app-text-muted">Open role guide →</p>
    </Link>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string | number;
}) {
  return (
    <div className="app-panel rounded-[1.6rem] p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <span className="material-symbols-outlined text-[1.1rem]">{icon}</span>
      </div>
      <p className="mt-4 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-app-text-subtle">
        {label}
      </p>
      <div className="mt-1.5 text-[2rem] font-bold leading-none text-app-text">
        {value}
      </div>
    </div>
  );
}

const QUICK_ACCESS = [
  { label: "Roles", icon: "assignment_ind", to: "/role-signup" },
  { label: "Sessions", icon: "calendar_month", to: "/meetings" },
  { label: "Members", icon: "groups", to: "/members" },
  { label: "Analytics", icon: "bar_chart", to: "/analytics" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { memberId } = useProfile();
  const { data: members } = useMembers();
  const { data: meetings } = useMeetings();

  const memberRecord = memberId
    ? members?.find((m) => m.id === memberId)
    : null;
  const firstName = memberRecord
    ? memberRecord.name.split(" ")[0]
    : (user?.email?.split("@")[0].split(".")[0] ?? "there");
  const displayName =
    firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();

  const greeting = getGreeting();
  const nextMeeting = meetings?.find(
    (m) => m.status === "upcoming" || m.status === "in_progress",
  );
  const activeMembers = members?.filter((m) => m.active).length ?? 0;
  const completedCount =
    meetings?.filter((m) => m.status === "completed").length ?? 0;
  const upcomingCount =
    meetings?.filter((m) => m.status === "upcoming").length ?? 0;

  return (
    <AppShell>
      <section className="space-y-5 pt-6 md:space-y-7 md:pt-10">
        {/* Mobile greeting */}
        <div className="md:hidden">
          <p className="text-sm text-app-text-muted">{greeting}</p>
          <h1 className="mt-0.5 text-[2rem] font-bold leading-tight tracking-tight text-app-text">
            {displayName},
            <br />
            <span className="text-primary">ready to lead?</span>
          </h1>
        </div>

        {/* Desktop: hero card + next session side-by-side */}
        <header className="hidden md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.6fr)] md:items-stretch md:gap-5">
          <div className="hero-card relative flex flex-col justify-between rounded-[2rem] p-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] opacity-40">
                {greeting} · {formatLongDate()}
              </p>
              <h1 className="mt-4 text-[2.4rem] font-bold leading-[1.1] tracking-tight">
                Hey {displayName},
                <br />
                <span className="text-blue-400">
                  let&apos;s make it count
                </span>{" "}
                this week.
              </h1>
              {/* {nextMeeting && (
                <p className="mt-3 text-sm opacity-55">
                  {nextMeeting.theme
                    ? `Next session: "${nextMeeting.theme}" — your guide is waiting.`
                    : "Check your role for the next session."}
                </p>
              )} */}
            </div>
          </div>
          <NextSessionCard meeting={nextMeeting} />
        </header>

        {/* Mobile: next session card */}
        <div className="md:hidden">
          <NextSessionCard meeting={nextMeeting} />
        </div>

        {/* Role teaser (members only) */}
        {memberId && nextMeeting && (
          <RoleTeaser
            meetingId={nextMeeting.id}
            memberId={memberId}
            meetingTheme={nextMeeting.theme}
          />
        )}

        {/* Quick access — mobile only */}
        <div className="md:hidden">
          <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-app-text-subtle">
            Quick access
          </p>
          <div className="grid grid-cols-4 gap-3">
            {QUICK_ACCESS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="app-panel flex flex-col items-center gap-2 rounded-[1.25rem] p-3 text-center"
              >
                <span className="material-symbols-outlined text-[1.4rem] text-primary">
                  {item.icon}
                </span>
                <span className="text-[0.65rem] font-semibold text-app-text-muted">
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Club health stats */}
        <div>
          <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-app-text-subtle md:hidden">
            Club health
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              icon="groups"
              label="Active Members"
              value={activeMembers}
            />
            <StatCard
              icon="event_available"
              label="Sessions Done"
              value={completedCount}
            />
            <StatCard icon="upcoming" label="Upcoming" value={upcomingCount} />
            <StatCard
              icon="assignment_ind"
              label="Total Sessions"
              value={meetings?.length ?? 0}
            />
          </div>
        </div>

        {/* Session theme question — desktop */}
        {nextMeeting?.theme_question && (
          <div className="app-panel hidden rounded-[2rem] p-6 md:block">
            <p className="app-eyebrow">This Session&apos;s Theme</p>
            <p className="mt-3 text-xl font-semibold italic leading-relaxed text-app-text">
              &ldquo;{nextMeeting.theme_question}&rdquo;
            </p>
          </div>
        )}
      </section>
    </AppShell>
  );
}
