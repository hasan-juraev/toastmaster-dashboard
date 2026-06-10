import { useState } from "react";
import { Link } from "react-router-dom";
import { useMeetings, useUpdateMeeting, useDeleteMeeting } from "../hooks/useMeetings";
import { useClubSettings, useUpdateTotalMeetingsOverride } from "../hooks/useClubSettings";
import { useMilestoneConfetti } from "../hooks/useMilestoneConfetti";
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

type StatusFilter = "all" | "upcoming" | "completed";

export default function Meetings() {
  const { data: meetings, isLoading, error } = useMeetings();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [signupMeetingId, setSignupMeetingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const updateMeeting = useUpdateMeeting();
  const deleteMeeting = useDeleteMeeting();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { data: clubSettings } = useClubSettings();
  const updateTotalOverride = useUpdateTotalMeetingsOverride();
  const [editingTotal, setEditingTotal] = useState(false);
  const [totalDraft, setTotalDraft] = useState("");
  const { isAdmin } = useProfile();

  const displayedTotal =
    clubSettings?.total_meetings_override ?? meetings?.length ?? 0;

  useMilestoneConfetti(displayedTotal);

  const handleTotalEdit = () => {
    setTotalDraft(String(displayedTotal));
    setEditingTotal(true);
  };

  const handleTotalSave = async () => {
    const parsed = parseInt(totalDraft, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      await updateTotalOverride.mutateAsync(parsed);
    }
    setEditingTotal(false);
  };

  const handleTotalReset = async () => {
    await updateTotalOverride.mutateAsync(null);
    setEditingTotal(false);
  };
  const upcomingCount =
    meetings?.filter((meeting) => meeting.status === "upcoming").length ?? 0;
  const completedCount =
    meetings?.filter((meeting) => meeting.status === "completed").length ?? 0;

  const filteredMeetings =
    statusFilter === "all"
      ? meetings
      : meetings?.filter((m) => m.status === statusFilter);

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

  const handleDelete = async (id: string) => {
    try {
      await deleteMeeting.mutateAsync(id);
    } catch (err) {
      console.error("Error deleting meeting:", err);
    } finally {
      setConfirmDeleteId(null);
    }
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="app-panel rounded-[1.5rem] p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-subtle">
                Total Meetings
              </p>
              {isAdmin && !editingTotal && (
                <button
                  onClick={handleTotalEdit}
                  className="text-xs text-app-text-muted hover:text-primary"
                >
                  Edit
                </button>
              )}
            </div>
            {isAdmin && editingTotal ? (
              <div className="mt-3 space-y-2">
                <input
                  type="number"
                  min={0}
                  value={totalDraft}
                  onChange={(e) => setTotalDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleTotalSave();
                    if (e.key === "Escape") setEditingTotal(false);
                  }}
                  autoFocus
                  className="w-full rounded-xl border border-app-border bg-app-panel-soft px-3 py-2 text-2xl font-bold text-app-text"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleTotalSave}
                    disabled={updateTotalOverride.isPending}
                    className="flex-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    Save
                  </button>
                  {clubSettings?.total_meetings_override != null && (
                    <button
                      onClick={handleTotalReset}
                      disabled={updateTotalOverride.isPending}
                      className="rounded-xl border border-app-border px-3 py-1.5 text-xs text-app-text-muted hover:text-app-text disabled:opacity-50"
                    >
                      Reset
                    </button>
                  )}
                  <button
                    onClick={() => setEditingTotal(false)}
                    className="rounded-xl border border-app-border px-3 py-1.5 text-xs text-app-text-muted hover:text-app-text"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-app-text">
                  {displayedTotal}
                </span>
                {clubSettings?.total_meetings_override != null && (
                  <span className="text-xs text-app-text-subtle">(manual)</span>
                )}
              </div>
            )}
          </div>
          <div className="app-panel rounded-[1.5rem] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-subtle">
              Upcoming
            </p>
            <div className="mt-3 text-3xl font-bold text-app-text">
              {upcomingCount}
            </div>
          </div>
        </div>

        {/* Status filter tabs */}
        {!isLoading && !error && (
          <div className="flex gap-2">
            {(["all", "upcoming", "completed"] as StatusFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`rounded-xl px-4 py-2 text-sm font-medium capitalize transition ${
                  statusFilter === f
                    ? "bg-primary text-white shadow-[0_8px_16px_rgba(59,130,246,0.2)]"
                    : "border border-app-border bg-app-panel text-app-text-muted hover:text-app-text"
                }`}
              >
                {f === "all" ? `All (${meetings?.length ?? 0})` : null}
                {f === "upcoming" ? `Upcoming (${upcomingCount})` : null}
                {f === "completed" ? `Completed (${completedCount})` : null}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="app-panel rounded-[1.5rem] px-5 py-10 text-center text-app-text-muted">
            Loading meetings...
          </div>
        ) : error ? (
          <div className="rounded-[1.5rem] border border-app-danger/25 bg-app-danger/10 px-4 py-3 text-sm text-red-600">
            Error loading meetings: {error.message}
          </div>
        ) : filteredMeetings?.length ? (
          <>
            <div className="space-y-4 md:hidden">
              {filteredMeetings!.map((meeting) => (
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
                        {confirmDeleteId === meeting.id ? (
                          <>
                            <button
                              onClick={() => handleDelete(meeting.id)}
                              disabled={deleteMeeting.isPending}
                              className="rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="rounded-xl border border-app-border bg-app-panel-soft px-4 py-3 text-sm font-medium text-app-text"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(meeting.id)}
                            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600"
                          >
                            Delete
                          </button>
                        )}
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
                    {filteredMeetings!.map((meeting) => (
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
                            <div className="flex items-center justify-end gap-4">
                              <button
                                onClick={() => handleEdit(meeting)}
                                className="text-sm font-medium text-primary hover:text-primary/80"
                              >
                                Edit
                              </button>
                              {confirmDeleteId === meeting.id ? (
                                <>
                                  <button
                                    onClick={() => handleDelete(meeting.id)}
                                    disabled={deleteMeeting.isPending}
                                    className="text-sm font-semibold text-red-600 hover:text-red-500 disabled:opacity-50"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="text-sm font-medium text-app-text-muted hover:text-app-text"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteId(meeting.id)}
                                  className="text-sm font-medium text-red-500 hover:text-red-600"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
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
            {statusFilter === "all"
              ? "No meetings found. Create your first meeting to get started."
              : `No ${statusFilter} meetings.`}
          </div>
        )}
      </section>
    </AppShell>
  );
}
