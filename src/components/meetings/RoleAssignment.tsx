import { useEffect, useMemo, useState } from "react";
import { useMembers } from "../../hooks/useMembers";
import {
  useDeleteMeetingRole,
  useMeetingRoles,
  useRoles,
  useUpsertMeetingRole,
} from "../../hooks/useRoles";
import {
  useMeetingRoleReports,
  useUpsertAhCounterReport,
  useUpsertEvaluatorReport,
  useUpsertGrammarianReport,
  useUpsertTimerReport,
} from "../../hooks/useRoleReports";
import type {
  AhCounterReport,
  EvaluatorReport,
  GrammarianReport,
  MeetingRole,
  MeetingRoleStatus,
  Role,
  TimerReport,
} from "../../types/database";

interface SpeechOption {
  id: string;
  title: string | null;
  manual_time: string | null;
  completed: boolean;
  speaker_id: string | null;
  evaluator_id: string | null;
}

interface RoleAssignmentProps {
  meetingId: string;
  speeches: SpeechOption[];
}

interface RoleWorkflowDraft {
  memberId: string;
  status: MeetingRoleStatus;
  notes: string;
  facilitatorScore: string;
  grammarErrors: string;
  notablePhrases: string;
  grammarScore: string;
  evaluatorSpeechId: string;
  qualityScore: string;
  strengths: string;
  improvementNotes: string;
  targetSeconds: string;
  actualSeconds: string;
}

interface AhCounterSpeakerDraft {
  ahCount: string;
  notes: string;
}

interface SpeakerSummary {
  key: string;
  speakerId: string | null;
  speakerName: string;
  titles: string[];
  completedCount: number;
  totalCount: number;
  evaluatorAssignedCount: number;
  plannedTimes: string[];
}

const STATUS_OPTIONS: Array<{ value: MeetingRoleStatus; label: string }> = [
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "skipped", label: "Skipped" },
];

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to update this role assignment.";
}

function getDisplayStatus(assignment?: MeetingRole) {
  if (!assignment?.member_id) {
    return "unassigned";
  }

  return assignment.status ?? "assigned";
}

function toInputValue(value: number | null | undefined) {
  return value == null ? "" : String(value);
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildDraft(
  assignment?: MeetingRole,
  grammarianReport?: GrammarianReport,
  evaluatorReport?: EvaluatorReport,
  timerReport?: TimerReport,
): RoleWorkflowDraft {
  const notes =
    timerReport?.notes ??
    grammarianReport?.notes ??
    assignment?.notes ??
    "";

  return {
    memberId: assignment?.member_id ?? "",
    status: getDisplayStatus(assignment),
    notes,
    facilitatorScore: toInputValue(assignment?.score),
    grammarErrors: toInputValue(grammarianReport?.grammar_errors),
    notablePhrases: toInputValue(grammarianReport?.notable_phrases),
    grammarScore: toInputValue(grammarianReport?.score),
    evaluatorSpeechId: evaluatorReport?.speech_id ?? "",
    qualityScore: toInputValue(evaluatorReport?.quality_score),
    strengths: evaluatorReport?.strengths ?? "",
    improvementNotes: evaluatorReport?.improvement_notes ?? "",
    targetSeconds: toInputValue(timerReport?.target_seconds),
    actualSeconds: toInputValue(timerReport?.actual_seconds),
  };
}

function isFacilitatorRole(roleName: string) {
  return roleName === "Toastmaster" || roleName === "General Evaluator";
}

function isCustomRole(roleName: string) {
  return (
    isFacilitatorRole(roleName) ||
    roleName === "Grammarian" ||
    roleName === "Evaluator" ||
    roleName === "Timer" ||
    roleName === "Ah-Counter" ||
    roleName === "Speaker"
  );
}

function getStatusBadgeClasses(status: MeetingRoleStatus | "unassigned") {
  switch (status) {
    case "completed":
      return "bg-emerald-50 text-emerald-600";
    case "in_progress":
      return "bg-sky-50 text-sky-600";
    case "skipped":
      return "bg-rose-50 text-rose-600";
    case "assigned":
      return "bg-amber-50 text-amber-600";
    default:
      return "bg-app-panel-soft text-app-text-muted";
  }
}

function buildAhCounterDraft(report?: AhCounterReport): AhCounterSpeakerDraft {
  return {
    ahCount: toInputValue(report?.ah_count),
    notes: report?.notes ?? "",
  };
}

export default function RoleAssignment({
  meetingId,
  speeches,
}: RoleAssignmentProps) {
  const {
    data: roles,
    isLoading: loadingRoles,
    error: rolesError,
  } = useRoles();
  const {
    data: members,
    isLoading: loadingMembers,
    error: membersError,
  } = useMembers();
  const {
    data: meetingRoles,
    isLoading: loadingMeetingRoles,
    error: meetingRolesError,
  } =
    useMeetingRoles(meetingId);
  const {
    data: roleReports,
    isLoading: loadingReports,
    error: roleReportsError,
  } =
    useMeetingRoleReports(meetingId);
  const upsertRole = useUpsertMeetingRole();
  const deleteRole = useDeleteMeetingRole();
  const upsertAhCounterReport = useUpsertAhCounterReport();
  const upsertGrammarianReport = useUpsertGrammarianReport();
  const upsertEvaluatorReport = useUpsertEvaluatorReport();
  const upsertTimerReport = useUpsertTimerReport();
  const [drafts, setDrafts] = useState<Record<string, RoleWorkflowDraft>>({});
  const [ahCounterDrafts, setAhCounterDrafts] = useState<
    Record<string, AhCounterSpeakerDraft>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const [savedRoleId, setSavedRoleId] = useState<string | null>(null);

  const memberNameLookup = useMemo(
    () =>
      Object.fromEntries((members ?? []).map((member) => [member.id, member.name])),
    [members],
  );
  const meetingRoleMap = useMemo(
    () =>
      Object.fromEntries(
        (meetingRoles ?? []).map((assignment) => [assignment.role_id, assignment]),
      ),
    [meetingRoles],
  );
  const ahCounterReportMap = useMemo(
    () =>
      Object.fromEntries(
        (roleReports?.ahCounterReports ?? [])
          .filter((report) => report.speaker_id)
          .map((report) => [report.speaker_id as string, report]),
      ),
    [roleReports?.ahCounterReports],
  );
  const grammarianReportMap = useMemo(
    () =>
      Object.fromEntries(
        (roleReports?.grammarianReports ?? [])
          .filter((report) => report.meeting_role_id)
          .map((report) => [report.meeting_role_id as string, report]),
      ),
    [roleReports?.grammarianReports],
  );
  const evaluatorReportMap = useMemo(
    () =>
      Object.fromEntries(
        (roleReports?.evaluatorReports ?? [])
          .filter((report) => report.meeting_role_id)
          .map((report) => [report.meeting_role_id as string, report]),
      ),
    [roleReports?.evaluatorReports],
  );
  const timerReportMap = useMemo(
    () =>
      Object.fromEntries(
        (roleReports?.timerReports ?? [])
          .filter((report) => report.meeting_role_id)
          .map((report) => [report.meeting_role_id as string, report]),
      ),
    [roleReports?.timerReports],
  );
  const speakerSummaries = useMemo<SpeakerSummary[]>(() => {
    const summaries = new Map<string, SpeakerSummary>();

    speeches.forEach((speech, index) => {
      const key = speech.speaker_id ?? `speech-${index}`;
      const current = summaries.get(key) ?? {
        key,
        speakerId: speech.speaker_id,
        speakerName: speech.speaker_id
          ? memberNameLookup[speech.speaker_id] ?? "Unknown speaker"
          : `Speaker slot ${index + 1}`,
        titles: [],
        completedCount: 0,
        totalCount: 0,
        evaluatorAssignedCount: 0,
        plannedTimes: [],
      };

      current.totalCount += 1;
      if (speech.completed) {
        current.completedCount += 1;
      }
      if (speech.evaluator_id) {
        current.evaluatorAssignedCount += 1;
      }
      current.titles.push(speech.title || `Speech ${index + 1}`);
      if (speech.manual_time) {
        current.plannedTimes.push(speech.manual_time);
      }

      summaries.set(key, current);
    });

    return Array.from(summaries.values());
  }, [memberNameLookup, speeches]);

  useEffect(() => {
    if (!roles?.length) {
      return;
    }

    setDrafts(
      Object.fromEntries(
        roles.map((role) => {
          const assignment = meetingRoleMap[role.id];
          const grammarianReport = assignment
            ? grammarianReportMap[assignment.id]
            : undefined;
          const evaluatorReport = assignment
            ? evaluatorReportMap[assignment.id]
            : undefined;
          const timerReport = assignment ? timerReportMap[assignment.id] : undefined;

          return [
            role.id,
            buildDraft(
              assignment,
              grammarianReport,
              evaluatorReport,
              timerReport,
            ),
          ];
        }),
      ),
    );
  }, [
    evaluatorReportMap,
    grammarianReportMap,
    meetingRoleMap,
    roles,
    timerReportMap,
  ]);

  useEffect(() => {
    setAhCounterDrafts(
      Object.fromEntries(
        speakerSummaries
          .filter((summary) => summary.speakerId)
          .map((summary) => [
            summary.key,
            buildAhCounterDraft(
              summary.speakerId ? ahCounterReportMap[summary.speakerId] : undefined,
            ),
          ]),
      ),
    );
  }, [ahCounterReportMap, speakerSummaries]);

  if (loadingRoles || loadingMembers || loadingMeetingRoles || loadingReports) {
    return (
      <div className="app-panel rounded-[1.5rem] p-6 text-center text-app-text-muted">
        Loading role workflows...
      </div>
    );
  }

  if (rolesError || membersError || meetingRolesError || roleReportsError) {
    const queryError =
      rolesError ?? membersError ?? meetingRolesError ?? roleReportsError;

    return (
      <div className="rounded-[1.5rem] border border-app-danger/25 bg-app-danger/10 px-4 py-3 text-sm text-red-600">
        Unable to load role workflows. {getErrorMessage(queryError)}
      </div>
    );
  }

  const activeMembers = members?.filter((member) => member.active) ?? [];

  const updateDraft = (roleId: string, updates: Partial<RoleWorkflowDraft>) => {
    setSavedRoleId(null);
    setDrafts((current) => {
      const previous = current[roleId];
      if (!previous) {
        return current;
      }

      const nextDraft = { ...previous, ...updates };
      if (!nextDraft.memberId) {
        nextDraft.status = "unassigned";
      } else if (previous.status === "unassigned" && !updates.status) {
        nextDraft.status = "assigned";
      }

      return {
        ...current,
        [roleId]: nextDraft,
      };
    });
  };

  const updateAhCounterDraft = (
    speakerKey: string,
    updates: Partial<AhCounterSpeakerDraft>,
  ) => {
    setSavedRoleId(null);
    setAhCounterDrafts((current) => ({
      ...current,
      [speakerKey]: {
        ...(current[speakerKey] ?? { ahCount: "", notes: "" }),
        ...updates,
      },
    }));
  };

  const handleSave = async (role: Role) => {
    const draft = drafts[role.id];
    const existingAssignment = meetingRoleMap[role.id];

    if (!draft) {
      return;
    }

    setError(null);
    setSavingRoleId(role.id);
    setSavedRoleId(null);

    try {
      if (!draft.memberId) {
        if (existingAssignment) {
          await deleteRole.mutateAsync({
            id: existingAssignment.id,
            meeting_id: meetingId,
          });
        }
        setSavedRoleId(role.id);
        return;
      }

      const normalizedStatus =
        draft.status === "unassigned" ? "assigned" : draft.status;
      const savedAssignment = await upsertRole.mutateAsync({
        id: existingAssignment?.id,
        meeting_id: meetingId,
        role_id: role.id,
        member_id: draft.memberId,
        allow_duplicate: false,
        status: normalizedStatus,
        completed_at:
          normalizedStatus === "completed"
            ? existingAssignment?.completed_at ?? new Date().toISOString()
            : null,
        notes: draft.notes.trim() || null,
        score: isFacilitatorRole(role.name)
          ? parseOptionalNumber(draft.facilitatorScore)
          : null,
      });

      if (role.name === "Ah-Counter") {
        await Promise.all(
          speakerSummaries
            .filter((summary) => summary.speakerId)
            .map(async (summary) => {
              const reportDraft = ahCounterDrafts[summary.key];
              const existingReport = summary.speakerId
                ? ahCounterReportMap[summary.speakerId]
                : undefined;

              if (
                !reportDraft ||
                (parseOptionalNumber(reportDraft.ahCount) == null &&
                  !reportDraft.notes.trim() &&
                  !existingReport)
              ) {
                return;
              }

              await upsertAhCounterReport.mutateAsync({
                ...(existingReport?.id ? { id: existingReport.id } : {}),
                meeting_id: meetingId,
                speaker_id: summary.speakerId ?? null,
                ah_count: parseOptionalNumber(reportDraft.ahCount) ?? 0,
                notes: reportDraft.notes.trim() || null,
              });
            }),
        );
      }

      if (role.name === "Grammarian") {
        await upsertGrammarianReport.mutateAsync({
          id: grammarianReportMap[savedAssignment.id]?.id,
          meeting_role_id: savedAssignment.id,
          meeting_id: meetingId,
          member_id: draft.memberId,
          grammar_errors: parseOptionalNumber(draft.grammarErrors) ?? 0,
          notable_phrases: parseOptionalNumber(draft.notablePhrases) ?? 0,
          score: parseOptionalNumber(draft.grammarScore),
          notes: draft.notes.trim() || null,
        });
      }

      if (role.name === "Evaluator") {
        await upsertEvaluatorReport.mutateAsync({
          id: evaluatorReportMap[savedAssignment.id]?.id,
          meeting_role_id: savedAssignment.id,
          meeting_id: meetingId,
          member_id: draft.memberId,
          speech_id: draft.evaluatorSpeechId || null,
          quality_score: parseOptionalNumber(draft.qualityScore),
          strengths: draft.strengths.trim() || null,
          improvement_notes: draft.improvementNotes.trim() || null,
        });
      }

      if (role.name === "Timer") {
        await upsertTimerReport.mutateAsync({
          id: timerReportMap[savedAssignment.id]?.id,
          meeting_role_id: savedAssignment.id,
          meeting_id: meetingId,
          member_id: draft.memberId,
          target_seconds: parseOptionalNumber(draft.targetSeconds),
          actual_seconds: parseOptionalNumber(draft.actualSeconds),
          notes: draft.notes.trim() || null,
        });
      }

      setSavedRoleId(role.id);
    } catch (saveError: unknown) {
      setError(getErrorMessage(saveError));
    } finally {
      setSavingRoleId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="app-eyebrow">Assignments</p>
          <h2 className="mt-2 text-xl font-semibold text-app-text">
            Role Workflows
          </h2>
          <p className="mt-2 text-sm text-app-text-muted">
            Assign members, mark progress, and capture role-specific insights in one place.
          </p>
        </div>
        <div className="rounded-[1.2rem] bg-app-panel-soft px-4 py-3 text-sm text-app-text-muted">
          Save each card after editing to keep analytics in sync.
        </div>
      </div>

      {error && (
        <div className="rounded-[1.25rem] border border-app-danger/25 bg-app-danger/10 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {roles?.map((role) => {
          const draft = drafts[role.id];
          const assignment = meetingRoleMap[role.id];
          const status = draft?.memberId ? draft.status : "unassigned";
          const timerDelta =
            parseOptionalNumber(draft?.actualSeconds ?? "") != null &&
            parseOptionalNumber(draft?.targetSeconds ?? "") != null
              ? (parseOptionalNumber(draft?.actualSeconds ?? "") ?? 0) -
                (parseOptionalNumber(draft?.targetSeconds ?? "") ?? 0)
              : null;
          const speakerRoleCompleted =
            speeches.length > 0 && speeches.every((speech) => speech.completed);

          return (
            <article key={role.id} className="app-panel rounded-[1.6rem] p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-app-text">{role.name}</h3>
                  {assignment?.completed_at ? (
                    <p className="mt-1 text-sm text-app-text-muted">
                      Completed on{" "}
                      {new Date(assignment.completed_at).toLocaleDateString()}
                    </p>
                  ) : role.name === "Speaker" ? (
                    <p className="mt-1 text-sm text-app-text-muted">
                      Track speech readiness and evaluator coverage for this meeting.
                    </p>
                  ) : role.name === "Ah-Counter" ? (
                    <p className="mt-1 text-sm text-app-text-muted">
                      Capture filler-word totals per speaker as the meeting unfolds.
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-app-text-muted">
                      Keep this role updated as the meeting progresses.
                    </p>
                  )}
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${getStatusBadgeClasses(
                    status,
                  )}`}
                >
                  {status.replace("_", " ")}
                </span>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                    Member
                  </span>
                  <select
                    className="mt-2 block w-full rounded-xl border border-app-border bg-app-panel-soft px-3 py-3 text-sm text-app-text"
                    value={draft?.memberId ?? ""}
                    onChange={(event) =>
                      updateDraft(role.id, { memberId: event.target.value })
                    }
                  >
                    <option value="">- Unassigned -</option>
                    {activeMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                    Status
                  </span>
                  <select
                    className="mt-2 block w-full rounded-xl border border-app-border bg-app-panel-soft px-3 py-3 text-sm text-app-text disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!draft?.memberId}
                    value={status}
                    onChange={(event) =>
                      updateDraft(role.id, {
                        status: event.target.value as MeetingRoleStatus,
                      })
                    }
                  >
                    {!draft?.memberId ? (
                      <option value="unassigned">Unassigned</option>
                    ) : null}
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {role.name === "Speaker" ? (
                <>
                  <div className="mt-4 rounded-[1.25rem] bg-app-panel-soft p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-app-text">
                          Speech lineup
                        </p>
                        <p className="mt-1 text-sm text-app-text-muted">
                          {speeches.length
                            ? `${speeches.filter((speech) => speech.completed).length}/${speeches.length} speeches completed`
                            : "No speeches linked to this meeting yet"}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                          speakerRoleCompleted && speeches.length > 0
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-app-panel-soft text-app-text-muted"
                        }`}
                      >
                        {speakerRoleCompleted && speeches.length > 0
                          ? "lineup complete"
                          : "in planning"}
                      </span>
                    </div>
                  </div>

                  {speakerSummaries.length ? (
                    <div className="mt-4 grid gap-3">
                      {speakerSummaries.map((summary) => (
                        <div
                          key={summary.key}
                          className="rounded-[1.2rem] border border-app-border bg-white/70 px-4 py-4"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-app-text">
                                {summary.speakerName}
                              </p>
                              <p className="mt-1 text-sm text-app-text-muted">
                                {summary.titles.join(", ")}
                              </p>
                              {summary.plannedTimes.length ? (
                                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-app-text-subtle">
                                  {summary.plannedTimes.join(" / ")}
                                </p>
                              ) : null}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="rounded-xl bg-app-panel-soft px-3 py-2 text-center">
                                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                                  Done
                                </p>
                                <p className="mt-1 text-lg font-semibold text-app-text">
                                  {summary.completedCount}/{summary.totalCount}
                                </p>
                              </div>
                              <div className="rounded-xl bg-app-panel-soft px-3 py-2 text-center">
                                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                                  Evaluators
                                </p>
                                <p className="mt-1 text-lg font-semibold text-app-text">
                                  {summary.evaluatorAssignedCount}/{summary.totalCount}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <label className="mt-4 block">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                      Speaker Notes
                    </span>
                    <textarea
                      rows={3}
                      className="mt-2 block w-full rounded-xl border border-app-border bg-app-panel-soft px-3 py-3 text-sm text-app-text"
                      value={draft?.notes ?? ""}
                      onChange={(event) =>
                        updateDraft(role.id, { notes: event.target.value })
                      }
                    />
                  </label>
                </>
              ) : null}

              {role.name === "Ah-Counter" ? (
                <>
                  {speakerSummaries.length ? (
                    <div className="mt-4 grid gap-3">
                      {speakerSummaries.map((summary) => {
                        const reportDraft = ahCounterDrafts[summary.key] ?? {
                          ahCount: "",
                          notes: "",
                        };

                        return (
                          <div
                            key={summary.key}
                            className="rounded-[1.2rem] border border-app-border bg-white/70 px-4 py-4"
                          >
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div className="md:max-w-[14rem]">
                                <p className="text-sm font-semibold text-app-text">
                                  {summary.speakerName}
                                </p>
                                <p className="mt-1 text-sm text-app-text-muted">
                                  {summary.titles.join(", ")}
                                </p>
                              </div>
                              <div className="grid flex-1 gap-4 md:grid-cols-[0.35fr_1fr]">
                                <label className="block">
                                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                                    Total Fillers
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    className="mt-2 block w-full rounded-xl border border-app-border bg-app-panel-soft px-3 py-3 text-sm text-app-text"
                                    value={reportDraft.ahCount}
                                    onChange={(event) =>
                                      updateAhCounterDraft(summary.key, {
                                        ahCount: event.target.value,
                                      })
                                    }
                                  />
                                </label>
                                <label className="block">
                                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                                    Breakdown Notes
                                  </span>
                                  <textarea
                                    rows={2}
                                    className="mt-2 block w-full rounded-xl border border-app-border bg-app-panel-soft px-3 py-3 text-sm text-app-text"
                                    value={reportDraft.notes}
                                    onChange={(event) =>
                                      updateAhCounterDraft(summary.key, {
                                        notes: event.target.value,
                                      })
                                    }
                                  />
                                </label>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-[1.25rem] border border-dashed border-app-border bg-app-panel-soft p-5 text-sm text-app-text-muted">
                      Add speakers to this meeting first. Ah-Counter entries are tracked per speaker.
                    </div>
                  )}

                  <label className="mt-4 block">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                      Role Notes
                    </span>
                    <textarea
                      rows={3}
                      className="mt-2 block w-full rounded-xl border border-app-border bg-app-panel-soft px-3 py-3 text-sm text-app-text"
                      value={draft?.notes ?? ""}
                      onChange={(event) =>
                        updateDraft(role.id, { notes: event.target.value })
                      }
                    />
                  </label>
                </>
              ) : null}

              {isFacilitatorRole(role.name) ? (
                <div className="mt-4 grid gap-4 md:grid-cols-[0.4fr_1fr]">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                      Score / 10
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.5"
                      className="mt-2 block w-full rounded-xl border border-app-border bg-app-panel-soft px-3 py-3 text-sm text-app-text"
                      value={draft?.facilitatorScore ?? ""}
                      onChange={(event) =>
                        updateDraft(role.id, {
                          facilitatorScore: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                      Notes
                    </span>
                    <textarea
                      rows={3}
                      className="mt-2 block w-full rounded-xl border border-app-border bg-app-panel-soft px-3 py-3 text-sm text-app-text"
                      value={draft?.notes ?? ""}
                      onChange={(event) =>
                        updateDraft(role.id, { notes: event.target.value })
                      }
                    />
                  </label>
                </div>
              ) : null}

              {role.name === "Grammarian" ? (
                <>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                        Grammar Errors
                      </span>
                      <input
                        type="number"
                        min="0"
                        className="mt-2 block w-full rounded-xl border border-app-border bg-app-panel-soft px-3 py-3 text-sm text-app-text"
                        value={draft?.grammarErrors ?? ""}
                        onChange={(event) =>
                          updateDraft(role.id, { grammarErrors: event.target.value })
                        }
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                        Notable Phrases
                      </span>
                      <input
                        type="number"
                        min="0"
                        className="mt-2 block w-full rounded-xl border border-app-border bg-app-panel-soft px-3 py-3 text-sm text-app-text"
                        value={draft?.notablePhrases ?? ""}
                        onChange={(event) =>
                          updateDraft(role.id, { notablePhrases: event.target.value })
                        }
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                        Score / 10
                      </span>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.5"
                        className="mt-2 block w-full rounded-xl border border-app-border bg-app-panel-soft px-3 py-3 text-sm text-app-text"
                        value={draft?.grammarScore ?? ""}
                        onChange={(event) =>
                          updateDraft(role.id, { grammarScore: event.target.value })
                        }
                      />
                    </label>
                  </div>
                  <label className="mt-4 block">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                      Notes
                    </span>
                    <textarea
                      rows={3}
                      className="mt-2 block w-full rounded-xl border border-app-border bg-app-panel-soft px-3 py-3 text-sm text-app-text"
                      value={draft?.notes ?? ""}
                      onChange={(event) =>
                        updateDraft(role.id, { notes: event.target.value })
                      }
                    />
                  </label>
                </>
              ) : null}

              {role.name === "Evaluator" ? (
                <>
                  <div className="mt-4 grid gap-4 md:grid-cols-[1.2fr_0.5fr]">
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                        Linked Speech
                      </span>
                      <select
                        className="mt-2 block w-full rounded-xl border border-app-border bg-app-panel-soft px-3 py-3 text-sm text-app-text"
                        value={draft?.evaluatorSpeechId ?? ""}
                        onChange={(event) =>
                          updateDraft(role.id, {
                            evaluatorSpeechId: event.target.value,
                          })
                        }
                      >
                        <option value="">- Select Speech -</option>
                        {speeches.map((speech, index) => (
                          <option key={speech.id} value={speech.id}>
                            {speech.title || `Speech ${index + 1}`}
                            {speech.manual_time ? ` • ${speech.manual_time}` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                        Quality / 10
                      </span>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.5"
                        className="mt-2 block w-full rounded-xl border border-app-border bg-app-panel-soft px-3 py-3 text-sm text-app-text"
                        value={draft?.qualityScore ?? ""}
                        onChange={(event) =>
                          updateDraft(role.id, { qualityScore: event.target.value })
                        }
                      />
                    </label>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                        Strengths
                      </span>
                      <textarea
                        rows={3}
                        className="mt-2 block w-full rounded-xl border border-app-border bg-app-panel-soft px-3 py-3 text-sm text-app-text"
                        value={draft?.strengths ?? ""}
                        onChange={(event) =>
                          updateDraft(role.id, { strengths: event.target.value })
                        }
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                        Improvement Notes
                      </span>
                      <textarea
                        rows={3}
                        className="mt-2 block w-full rounded-xl border border-app-border bg-app-panel-soft px-3 py-3 text-sm text-app-text"
                        value={draft?.improvementNotes ?? ""}
                        onChange={(event) =>
                          updateDraft(role.id, {
                            improvementNotes: event.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                </>
              ) : null}

              {role.name === "Timer" ? (
                <>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                        Target Seconds
                      </span>
                      <input
                        type="number"
                        min="0"
                        className="mt-2 block w-full rounded-xl border border-app-border bg-app-panel-soft px-3 py-3 text-sm text-app-text"
                        value={draft?.targetSeconds ?? ""}
                        onChange={(event) =>
                          updateDraft(role.id, { targetSeconds: event.target.value })
                        }
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                        Actual Seconds
                      </span>
                      <input
                        type="number"
                        min="0"
                        className="mt-2 block w-full rounded-xl border border-app-border bg-app-panel-soft px-3 py-3 text-sm text-app-text"
                        value={draft?.actualSeconds ?? ""}
                        onChange={(event) =>
                          updateDraft(role.id, { actualSeconds: event.target.value })
                        }
                      />
                    </label>
                    <div className="rounded-[1.2rem] bg-app-panel-soft px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                        Delta
                      </p>
                      <p className="mt-3 text-2xl font-semibold text-app-text">
                        {timerDelta == null
                          ? "--"
                          : `${timerDelta > 0 ? "+" : ""}${timerDelta}s`}
                      </p>
                      <p className="mt-2 text-sm text-app-text-muted">
                        Negative means under target; positive means over.
                      </p>
                    </div>
                  </div>
                  <label className="mt-4 block">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                      Notes
                    </span>
                    <textarea
                      rows={3}
                      className="mt-2 block w-full rounded-xl border border-app-border bg-app-panel-soft px-3 py-3 text-sm text-app-text"
                      value={draft?.notes ?? ""}
                      onChange={(event) =>
                        updateDraft(role.id, { notes: event.target.value })
                      }
                    />
                  </label>
                </>
              ) : null}

              {!isCustomRole(role.name) ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-[1.25rem] border border-dashed border-app-border bg-app-panel-soft p-4 text-sm text-app-text-muted">
                    This role does not have a dedicated analytics template yet, but it still participates in assignment and completion tracking.
                  </div>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                      Notes
                    </span>
                    <textarea
                      rows={3}
                      className="mt-2 block w-full rounded-xl border border-app-border bg-app-panel-soft px-3 py-3 text-sm text-app-text"
                      value={draft?.notes ?? ""}
                      onChange={(event) =>
                        updateDraft(role.id, { notes: event.target.value })
                      }
                    />
                  </label>
                </div>
              ) : null}

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-app-text-muted">
                  {savedRoleId === role.id
                    ? "Saved to meeting workflow."
                    : role.name === "Ah-Counter"
                      ? "Use notes for breakdowns like ah, oh, and uhm until those are modeled separately."
                      : role.name === "Speaker"
                        ? "Speaker progress comes from the meeting's speech records."
                        : "Keep scores lightweight and consistent so trends stay meaningful."}
                </p>
                <button
                  type="button"
                  className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(59,130,246,0.22)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={savingRoleId === role.id}
                  onClick={() => handleSave(role)}
                >
                  {savingRoleId === role.id
                    ? "Saving..."
                    : draft?.memberId
                      ? "Save Workflow"
                      : "Clear Assignment"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
