import { useState } from "react";
import { Link } from "react-router-dom";
import { useMeetings, useUpdateMeeting } from "../hooks/useMeetings";
import type { Meeting } from "../types/database";
import MeetingForm from "../components/meetings/MeetingForm";
import RoleSignupModal from "../components/meetings/RoleSignupModal";
import { AppShell } from "../components/ui/AppShell";
import { useProfile } from "../hooks/useProfile";

function formatMeetingDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function formatMeetingLabel(meeting: Meeting) {
  return meeting.theme
    ? `${meeting.theme} — ${formatMeetingDate(meeting.date)}`
    : formatMeetingDate(meeting.date);
}

function MeetingStatusBadge({ status }: { status: string }) {
  const badgeClass =
    status === "completed"
      ? "bg-emerald-50 text-emerald-600"
      : "bg-amber-50 text-amber-600";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${badgeClass}`}
    >
      {status}
    </span>
  );
}

export default function Meetings() {
  const { data: meetings, isLoading, error } = useMeetings();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [signupMeetingId, setSignupMeetingId] = useState<string | null>(null);
  const updateMeeting = useUpdateMeeting();
  const { isAdmin } = useProfile();
  const upcomingCount =
    meetings?.filter((meeting) => meeting.status === "upcoming").length ?? 0;
  const completedCount =
    meetings?.filter((meeting) => meeting.status === "completed").length ?? 0;

  const handleEdit = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    setIsFormOpen(true);
  };

  const handleStatusToggle = async (meeting: Meeting) => {
    const newStatus = meeting.status === "upcoming" ? "completed" : "upcoming";
    try {
      await updateMeeting.mutateAsync({ id: meeting.id, status: newStatus });
    } catch (err) {
      console.error("Error toggling status:", err);
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingMeeting(null);
  };

  return (
    <AppShell>
      <section className="space-y-6 pt-8 pb-6 md:space-y-8 md:pt-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-app-text md:text-[3rem]">
              Meetings
            </h1>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {isAdmin && (
              <button
                onClick={() => setIsFormOpen(true)}
                className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(59,130,246,0.24)] transition hover:bg-primary/90"
              >
                Add Meeting
              </button>
            )}
          </div>
        </div>

        {isFormOpen && (
          <MeetingForm meeting={editingMeeting} onClose={handleCloseForm} />
        )}

        {signupMeetingId &&
          (() => {
            const m = meetings?.find((x) => x.id === signupMeetingId);
            return m ? (
              <RoleSignupModal
                meetingId={signupMeetingId}
                meetingLabel={formatMeetingLabel(m)}
                onClose={() => setSignupMeetingId(null)}
              />
            ) : null;
          })()}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="app-panel rounded-[1.5rem] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-subtle">
              Total Meetings
            </p>
            <div className="mt-3 text-3xl font-bold text-app-text">
              {meetings?.length ?? 0}
            </div>
          </div>
          <div className="app-panel rounded-[1.5rem] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-subtle">
              Upcoming
            </p>
            <div className="mt-3 text-3xl font-bold text-app-text">
              {upcomingCount}
            </div>
          </div>
          <div className="app-panel rounded-[1.5rem] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-subtle">
              Completed
            </p>
            <div className="mt-3 text-3xl font-bold text-app-text">
              {completedCount}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="app-panel rounded-[1.5rem] px-5 py-10 text-center text-app-text-muted">
            Loading meetings...
          </div>
        ) : error ? (
          <div className="rounded-[1.5rem] border border-app-danger/25 bg-app-danger/10 px-4 py-3 text-sm text-red-600">
            Error loading meetings: {error.message}
          </div>
        ) : meetings?.length ? (
          <>
            <div className="space-y-4 md:hidden">
              {meetings.map((meeting) => (
                <article
                  key={meeting.id}
                  className="app-panel rounded-[1.5rem] p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-muted">
                        {formatMeetingDate(meeting.date)}
                      </p>
                      <Link
                        to={`/meetings/${meeting.id}`}
                        className="mt-2 block text-2xl font-semibold leading-tight text-app-text transition hover:text-primary"
                      >
                        {meeting.theme || "Untitled Meeting"}
                      </Link>
                      <p className="mt-2 text-sm text-app-text-muted">
                        {meeting.location || "Location not set"}
                      </p>
                    </div>
                    <MeetingStatusBadge status={meeting.status} />
                  </div>

                  <div className="mt-5 flex gap-3">
                    <Link
                      to={`/meetings/${meeting.id}`}
                      className="flex-1 rounded-xl border border-app-border bg-app-panel-soft px-4 py-3 text-center text-sm font-medium text-app-text"
                    >
                      Open
                    </Link>
                    {meeting.status === "upcoming" && (
                      <button
                        onClick={() => setSignupMeetingId(meeting.id)}
                        className="flex-1 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-center text-sm font-medium text-primary"
                      >
                        Roles
                      </button>
                    )}
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => handleEdit(meeting)}
                          className="rounded-xl border border-app-border bg-app-panel-soft px-4 py-3 text-sm font-medium text-app-text"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleStatusToggle(meeting)}
                          className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white"
                        >
                          {meeting.status === "completed"
                            ? "Reopen"
                            : "Mark Done"}
                        </button>
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-[1.75rem] border border-app-border bg-app-panel shadow-app-card md:block">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-app-border">
                  <thead className="bg-app-panel-soft/60">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-[0.18em] text-app-text-muted">
                        Date
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-[0.18em] text-app-text-muted">
                        Theme
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-[0.18em] text-app-text-muted">
                        Location
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-[0.18em] text-app-text-muted">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-[0.18em] text-app-text-muted">
                        Roles
                      </th>
                      {isAdmin && (
                        <th className="px-6 py-4 text-right text-xs font-medium uppercase tracking-[0.18em] text-app-text-muted">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border">
                    {meetings.map((meeting) => (
                      <tr
                        key={meeting.id}
                        className="transition hover:bg-app-panel-soft/40"
                      >
                        <td className="px-6 py-5 whitespace-nowrap">
                          <Link
                            to={`/meetings/${meeting.id}`}
                            className="font-medium text-primary hover:text-primary/80"
                          >
                            {formatMeetingDate(meeting.date)}
                          </Link>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-sm text-app-text">
                          {meeting.theme || "-"}
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-sm text-app-text-muted">
                          {meeting.location || "-"}
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          {isAdmin ? (
                            <button onClick={() => handleStatusToggle(meeting)}>
                              <MeetingStatusBadge status={meeting.status} />
                            </button>
                          ) : (
                            <MeetingStatusBadge status={meeting.status} />
                          )}
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          {meeting.status === "upcoming" ? (
                            <button
                              onClick={() => setSignupMeetingId(meeting.id)}
                              className="text-sm font-medium text-primary hover:text-primary/80"
                            >
                              View Roles
                            </button>
                          ) : (
                            <span className="text-sm text-app-text-muted">
                              —
                            </span>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-5 whitespace-nowrap text-right">
                            <button
                              onClick={() => handleEdit(meeting)}
                              className="text-sm font-medium text-primary hover:text-primary/80"
                            >
                              Edit
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="app-panel rounded-[1.5rem] px-5 py-12 text-center text-app-text-muted">
            No meetings found. Create your first meeting to get started.
          </div>
        )}
      </section>
    </AppShell>
  );
}
