import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../app/AuthContext";
import { useMembers } from "../hooks/useMembers";
import { useMeetings } from "../hooks/useMeetings";
import { AppShell } from "../components/ui/AppShell";

function formatMeetingDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function formatShortMeetingDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function getMeetingTime(status: string) {
  return status === "completed" ? "Completed meeting" : "7:30 AM";
}

function MetricCard({
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
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <span className="material-symbols-outlined text-[1.15rem]">
            {icon}
          </span>
        </div>
        <span className="rounded-full bg-app-panel-soft px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-app-text-muted">
          Live
        </span>
      </div>
      <p className="mt-5 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-app-text-subtle">
        {label}
      </p>
      <div className="mt-2 text-[2rem] font-bold leading-none text-app-text sm:text-[2.2rem]">
        {value}
      </div>
    </div>
  );
}

function AgendaItem({
  time,
  title,
  subtitle,
  active,
}: {
  time: string;
  title: string;
  subtitle: string;
  active?: boolean;
}) {
  return (
    <article
      className={`rounded-[1.5rem] border p-4 shadow-app-card transition md:p-5 ${
        active
          ? "border-primary/20 bg-primary/[0.05]"
          : "border-app-border bg-app-panel"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex w-full flex-row items-center justify-between rounded-[1.2rem] bg-slate-50 px-3 py-3 text-center sm:min-w-[4.5rem] sm:w-auto sm:flex-col sm:justify-center">
          <span className="text-lg font-bold leading-none text-app-text">
            {time}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold leading-tight text-app-text md:text-[1.15rem]">
                {title}
              </h3>
              <p className="mt-1 text-sm text-app-text-muted">{subtitle}</p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: members } = useMembers();
  const { data: meetings } = useMeetings();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const displayName = user?.email?.split("@")[0] ?? "Member";
  const activeMembers = members?.filter((member) => member.active) ?? [];
  const totalMembers = members?.length ?? 0;
  const nextMeeting = meetings?.find(
    (meeting) => meeting.status !== "completed",
  );
  const completedMeetings =
    meetings?.filter((meeting) => meeting.status === "completed").length ?? 0;
  const scheduledMeetings =
    meetings?.filter((meeting) => meeting.status !== "completed").length ?? 0;
  const completionRate = meetings?.length
    ? Math.round((completedMeetings / meetings.length) * 100)
    : 0;

  return (
    <AppShell>
      <section className="space-y-8 pt-6 md:space-y-10 md:pt-10">
        <header className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(22rem,0.7fr)] lg:items-start">
          <div className="app-panel overflow-hidden rounded-[2rem] p-6 md:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="app-eyebrow">Next Event</p>
                <h1 className="mt-2 text-[2rem] font-bold tracking-[-0.04em] text-app-text sm:text-[2.35rem] md:text-[3rem]">
                  {nextMeeting?.theme || "Morning Toastmasters"}
                </h1>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-app-text-muted md:text-base">
                  <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 font-medium text-primary">
                    <span className="material-symbols-outlined text-[1rem]">
                      schedule
                    </span>
                    {nextMeeting
                      ? `${formatMeetingDate(nextMeeting.date)} • ${getMeetingTime(nextMeeting.status)}`
                      : "No upcoming meeting scheduled"}
                  </span>
                  {nextMeeting?.location ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-app-panel-soft px-3 py-1.5">
                      <span className="material-symbols-outlined text-[1rem] text-app-text-subtle">
                        location_on
                      </span>
                      {nextMeeting.location}
                    </span>
                  ) : null}
                </div>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-full border border-app-border bg-app-panel-soft px-4 py-2.5 text-sm font-semibold text-app-text transition hover:border-primary/30 hover:text-primary"
              >
                Sign Out
              </button>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon="group"
                label="Active Members"
                value={activeMembers.length}
              />
              <MetricCard
                icon="calendar_month"
                label="Upcoming Meetings"
                value={scheduledMeetings}
              />
              <MetricCard
                icon="task_alt"
                label="Completed Meetings"
                value={completedMeetings}
              />
              <Link
                to="/analytics"
                className="app-panel rounded-[1.6rem] p-5 transition hover:border-primary/40 hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <span className="material-symbols-outlined text-[1.15rem]">
                      bar_chart
                    </span>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-emerald-600">
                    Reports
                  </span>
                </div>
                <p className="mt-5 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-app-text-subtle">
                  Club Insights
                </p>
                <div className="mt-2 text-[2rem] font-bold italic leading-none text-app-text">
                  Ready
                </div>
              </Link>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="app-panel rounded-[2rem] p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="app-eyebrow">Meeting Theme</p>
                  <p className="mt-2 text-[1.65rem] font-semibold italic leading-tight text-app-text">
                    {nextMeeting?.theme
                      ? `"${nextMeeting.theme}"`
                      : '"Plan the next meeting"'}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_16px_30px_rgba(59,130,246,0.25)]">
                  <span className="material-symbols-outlined text-[1.35rem]">
                    campaign
                  </span>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-app-text-muted">
                {nextMeeting?.location ||
                  "Set a location on the meetings screen."}
              </p>
            </div>
          </aside>
        </header>

        <section className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="mt-2 app-section-title">Today&apos;s Agenda</h2>
            </div>
          </div>

          {nextMeeting ? (
            <div className="grid gap-4 xl:grid-cols-3">
              <AgendaItem
                time="19:30"
                title="Sergeant-at-Arms Opens"
                subtitle={displayName}
                active
              />
              <AgendaItem
                time="19:45"
                title="Speaker Session"
                subtitle="Add speeches from the meeting detail screen"
              />
              <AgendaItem
                time="20:00"
                title="Prepared Speech"
                subtitle={`Finalize open roles for ${nextMeeting.theme || "the meeting"}`}
              />
            </div>
          ) : (
            <div className="app-panel rounded-[1.75rem] p-6">
              <p className="text-lg font-semibold text-app-text">
                No agenda yet
              </p>
              <p className="mt-2 text-sm text-app-text-muted">
                Create a meeting first, then assign roles and speeches from the
                meeting detail page.
              </p>
            </div>
          )}
        </section>
      </section>
    </AppShell>
  );
}
