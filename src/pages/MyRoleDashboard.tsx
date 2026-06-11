import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useMyMeetingRole } from "../hooks/useRoles";
import { useCompleteMyMeetingRole } from "../hooks/useRoles";
import { useProfile } from "../hooks/useProfile";
import { useMembers } from "../hooks/useMembers";
import { AppShell } from "../components/ui/AppShell";
import {
  useAhCounterReports,
  useGrammarianReports,
  useGrammarianMemberEntries,
  useTimerReports,
  useUpsertAhCounterReport,
  useUpsertGrammarianReport,
  useUpsertGrammarianMemberEntry,
  useUpsertTimerReport,
} from "../hooks/useRoleReports";
import type { Meeting, MeetingRole } from "../types/database";

interface MeetingSpeech {
  id: string;
  title: string | null;
  speaker_id: string | null;
  manual_time: string | null;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function toNum(v: string) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ── Mark Complete button ──────────────────────────────────────────────────────

function MarkCompleteButton({ meetingRoleId }: { meetingRoleId: string }) {
  const complete = useCompleteMyMeetingRole();
  return (
    <button
      type="button"
      disabled={complete.isPending || complete.isSuccess}
      onClick={() => complete.mutate(meetingRoleId)}
      className="mt-5 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {complete.isSuccess
        ? "Role marked as complete ✓"
        : complete.isPending
          ? "Saving…"
          : "Mark Role as Complete"}
    </button>
  );
}

// ── Ah-Counter Panel ──────────────────────────────────────────────────────────

function AhCounterPanel({
  meetingId,
  myRole,
}: {
  meetingId: string;
  myRole: MeetingRole & { roles: { name: string } | null };
}) {
  const { data: members = [] } = useMembers();
  const { data: speeches = [] } = useQuery<MeetingSpeech[]>({
    queryKey: ["speeches-for-role", meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("speeches")
        .select("id, title, speaker_id, manual_time")
        .eq("meeting_id", meetingId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MeetingSpeech[];
    },
    enabled: !!meetingId,
  });
  const { data: existingReports = [] } = useAhCounterReports(meetingId);
  const upsert = useUpsertAhCounterReport();

  const [counts, setCounts] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Unique speakers from speeches
  const speakerIds = [...new Set(speeches.map((s) => s.speaker_id).filter(Boolean))] as string[];

  // Pre-populate from existing reports
  useEffect(() => {
    if (!existingReports.length) return;
    const c: Record<string, string> = {};
    const n: Record<string, string> = {};
    for (const r of existingReports) {
      if (r.speaker_id) {
        c[r.speaker_id] = String(r.ah_count);
        n[r.speaker_id] = r.notes ?? "";
      }
    }
    setCounts(c);
    setNotes(n);
  }, [existingReports]);

  const inc = (id: string) => {
    setSaved(false);
    setCounts((prev) => ({ ...prev, [id]: String((toNum(prev[id] ?? "0") ?? 0) + 1) }));
  };
  const dec = (id: string) => {
    setSaved(false);
    setCounts((prev) => ({ ...prev, [id]: String(Math.max(0, (toNum(prev[id] ?? "0") ?? 0) - 1)) }));
  };

  const handleSubmit = async () => {
    setErr(null);
    setSaved(false);
    try {
      await Promise.all(
        speakerIds.map((sid) =>
          upsert.mutateAsync({
            meeting_id:      meetingId,
            speaker_id:      sid,
            meeting_role_id: myRole.id,
            ah_count:        toNum(counts[sid] ?? "0") ?? 0,
            notes:           notes[sid]?.trim() || null,
          }),
        ),
      );
      setSaved(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save report.");
    }
  };

  return (
    <div>
      <p className="app-eyebrow">Your Role</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-app-text">
        Ah-Counter
      </h2>
      <p className="mt-2 text-sm text-app-text-muted">
        Track filler words (ah, um, er, so, like, you know) for each speaker.
      </p>

      {speakerIds.length === 0 ? (
        <div className="mt-5 rounded-[1.25rem] border border-dashed border-app-border bg-app-panel-soft p-6 text-sm text-app-text-muted">
          No speakers added to this meeting yet. Check back once speakers are
          listed.
        </div>
      ) : (
        <div className="mt-5 grid gap-4">
          {speakerIds.map((sid) => {
            const member = members.find((m) => m.id === sid);
            const speakerSpeeches = speeches.filter((s) => s.speaker_id === sid);
            const count = toNum(counts[sid] ?? "0") ?? 0;
            return (
              <div
                key={sid}
                className="rounded-[1.35rem] border border-app-border bg-app-panel-soft p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-app-text">
                      {member?.name ?? "Unknown Speaker"}
                    </p>
                    <p className="mt-0.5 text-xs text-app-text-muted">
                      {speakerSpeeches.map((s) => s.title || "Untitled Speech").join(", ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => dec(sid)}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-app-border bg-white text-lg font-semibold text-app-text transition hover:bg-app-panel-soft"
                    >
                      −
                    </button>
                    <span className="w-10 text-center text-2xl font-bold tabular-nums text-app-text">
                      {count}
                    </span>
                    <button
                      type="button"
                      onClick={() => inc(sid)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-lg font-semibold text-white shadow transition hover:opacity-90"
                    >
                      +
                    </button>
                  </div>
                </div>
                <label className="mt-3 block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                    Breakdown Notes
                  </span>
                  <textarea
                    rows={2}
                    className="mt-1.5 block w-full rounded-xl border border-app-border bg-white px-3 py-2.5 text-sm text-app-text"
                    placeholder={'e.g. 3× "um", 2× "so"'}
                    value={notes[sid] ?? ""}
                    onChange={(e) => {
                      setSaved(false);
                      setNotes((prev) => ({ ...prev, [sid]: e.target.value }));
                    }}
                  />
                </label>
              </div>
            );
          })}
        </div>
      )}

      {err && (
        <p className="mt-3 text-sm text-red-600">{err}</p>
      )}

      {speakerIds.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={upsert.isPending}
            onClick={handleSubmit}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(59,130,246,0.22)] transition hover:opacity-90 disabled:opacity-60"
          >
            {upsert.isPending ? "Saving…" : "Submit Report"}
          </button>
          {saved && (
            <span className="text-sm font-medium text-emerald-600">
              Report saved ✓
            </span>
          )}
        </div>
      )}

      {saved && <MarkCompleteButton meetingRoleId={myRole.id} />}
    </div>
  );
}

// ── Grammarian Panel ──────────────────────────────────────────────────────────

function GrammarianPanel({
  meetingId,
  myRole,
}: {
  meetingId: string;
  myRole: MeetingRole & { roles: { name: string } | null };
}) {
  const { data: members = [] } = useMembers();
  const { data: speeches = [] } = useQuery<MeetingSpeech[]>({
    queryKey: ["speeches-for-role", meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("speeches")
        .select("id, title, speaker_id, manual_time")
        .eq("meeting_id", meetingId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MeetingSpeech[];
    },
    enabled: !!meetingId,
  });
  const { data: grammarReports = [] } = useGrammarianReports(meetingId);
  const existingReport = grammarReports.find((r) => r.meeting_role_id === myRole.id);
  const { data: memberEntries = [] } = useGrammarianMemberEntries(existingReport?.id);

  const upsertReport = useUpsertGrammarianReport();
  const upsertEntry = useUpsertGrammarianMemberEntry();

  const [wordOfDay, setWordOfDay] = useState("");
  const [grammarErrors, setGrammarErrors] = useState("");
  const [notablePhrases, setNotablePhrases] = useState("");
  const [score, setScore] = useState("");
  const [notes, setNotes] = useState("");
  const [memberErrorCounts, setMemberErrorCounts] = useState<Record<string, string>>({});
  const [memberNotes, setMemberNotes] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Unique speakers
  const speakerIds = [...new Set(speeches.map((s) => s.speaker_id).filter(Boolean))] as string[];

  // Pre-populate
  useEffect(() => {
    if (!existingReport) return;
    setWordOfDay(existingReport.word_of_the_day ?? "");
    setGrammarErrors(existingReport.grammar_errors != null ? String(existingReport.grammar_errors) : "");
    setNotablePhrases(existingReport.notable_phrases != null ? String(existingReport.notable_phrases) : "");
    setScore(existingReport.score != null ? String(existingReport.score) : "");
    setNotes(existingReport.notes ?? "");
  }, [existingReport]);

  useEffect(() => {
    if (!memberEntries.length) return;
    const c: Record<string, string> = {};
    const n: Record<string, string> = {};
    for (const e of memberEntries) {
      if (e.subject_member_id) {
        c[e.subject_member_id] = String(e.error_count);
        n[e.subject_member_id] = e.notes ?? "";
      }
    }
    setMemberErrorCounts(c);
    setMemberNotes(n);
  }, [memberEntries]);

  const handleSubmit = async () => {
    setErr(null);
    setSaved(false);
    try {
      const saved = await upsertReport.mutateAsync({
        id:               existingReport?.id,
        meeting_role_id:  myRole.id,
        meeting_id:       meetingId,
        member_id:        myRole.member_id,
        grammar_errors:   toNum(grammarErrors) ?? 0,
        notable_phrases:  toNum(notablePhrases) ?? 0,
        score:            toNum(score),
        notes:            notes.trim() || null,
        word_of_the_day:  wordOfDay.trim() || null,
      });

      await Promise.all(
        speakerIds.map((sid) =>
          upsertEntry.mutateAsync({
            grammarian_report_id: saved.id,
            subject_member_id:    sid,
            error_count:          toNum(memberErrorCounts[sid] ?? "0") ?? 0,
            notes:                memberNotes[sid]?.trim() || null,
          }),
        ),
      );
      setSaved(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save report.");
    }
  };

  return (
    <div>
      <p className="app-eyebrow">Your Role</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-app-text">
        Grammarian
      </h2>
      <p className="mt-2 text-sm text-app-text-muted">
        Monitor grammar usage and introduce the Word of the Day.
      </p>

      <div className="mt-5 space-y-4">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
            Word of the Day
          </span>
          <input
            type="text"
            className="mt-1.5 block w-full rounded-xl border border-app-border bg-app-panel-soft px-3 py-3 text-sm text-app-text"
            placeholder="e.g. Eloquent"
            value={wordOfDay}
            onChange={(e) => { setSaved(false); setWordOfDay(e.target.value); }}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
              Grammar Errors
            </span>
            <input
              type="number"
              min="0"
              className="mt-1.5 block w-full rounded-xl border border-app-border bg-app-panel-soft px-3 py-3 text-sm text-app-text"
              value={grammarErrors}
              onChange={(e) => { setSaved(false); setGrammarErrors(e.target.value); }}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
              Notable Phrases
            </span>
            <input
              type="number"
              min="0"
              className="mt-1.5 block w-full rounded-xl border border-app-border bg-app-panel-soft px-3 py-3 text-sm text-app-text"
              value={notablePhrases}
              onChange={(e) => { setSaved(false); setNotablePhrases(e.target.value); }}
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
              className="mt-1.5 block w-full rounded-xl border border-app-border bg-app-panel-soft px-3 py-3 text-sm text-app-text"
              value={score}
              onChange={(e) => { setSaved(false); setScore(e.target.value); }}
            />
          </label>
        </div>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
            Notes
          </span>
          <textarea
            rows={3}
            className="mt-1.5 block w-full rounded-xl border border-app-border bg-app-panel-soft px-3 py-3 text-sm text-app-text"
            value={notes}
            onChange={(e) => { setSaved(false); setNotes(e.target.value); }}
          />
        </label>
      </div>

      {speakerIds.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
            Per-Speaker Errors
          </p>
          <div className="mt-3 grid gap-3">
            {speakerIds.map((sid) => {
              const member = members.find((m) => m.id === sid);
              return (
                <div
                  key={sid}
                  className="rounded-[1.2rem] border border-app-border bg-app-panel-soft p-4"
                >
                  <p className="text-sm font-semibold text-app-text">
                    {member?.name ?? "Unknown Speaker"}
                  </p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-[0.4fr_1fr]">
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                        Errors
                      </span>
                      <input
                        type="number"
                        min="0"
                        className="mt-1.5 block w-full rounded-xl border border-app-border bg-white px-3 py-2.5 text-sm text-app-text"
                        value={memberErrorCounts[sid] ?? ""}
                        onChange={(e) => {
                          setSaved(false);
                          setMemberErrorCounts((p) => ({ ...p, [sid]: e.target.value }));
                        }}
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                        Notes
                      </span>
                      <textarea
                        rows={2}
                        className="mt-1.5 block w-full rounded-xl border border-app-border bg-white px-3 py-2.5 text-sm text-app-text"
                        value={memberNotes[sid] ?? ""}
                        onChange={(e) => {
                          setSaved(false);
                          setMemberNotes((p) => ({ ...p, [sid]: e.target.value }));
                        }}
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={upsertReport.isPending || upsertEntry.isPending}
          onClick={handleSubmit}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(59,130,246,0.22)] transition hover:opacity-90 disabled:opacity-60"
        >
          {upsertReport.isPending || upsertEntry.isPending ? "Saving…" : "Submit Report"}
        </button>
        {saved && (
          <span className="text-sm font-medium text-emerald-600">Report saved ✓</span>
        )}
      </div>

      {saved && <MarkCompleteButton meetingRoleId={myRole.id} />}
    </div>
  );
}

// ── Timer Panel ───────────────────────────────────────────────────────────────

function TimerPanel({
  meetingId,
  myRole,
}: {
  meetingId: string;
  myRole: MeetingRole & { roles: { name: string } | null };
}) {
  const { data: speeches = [] } = useQuery<MeetingSpeech[]>({
    queryKey: ["speeches-for-role", meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("speeches")
        .select("id, title, speaker_id, manual_time")
        .eq("meeting_id", meetingId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MeetingSpeech[];
    },
    enabled: !!meetingId,
  });
  const { data: existingReports = [] } = useTimerReports(meetingId);
  const upsert = useUpsertTimerReport();
  const { data: members = [] } = useMembers();

  const [targets, setTargets] = useState<Record<string, string>>({});
  const [actuals, setActuals] = useState<Record<string, string>>({});
  const [speechNotes, setSpeechNotes] = useState<Record<string, string>>({});
  const [running, setRunning] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<Record<string, number>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Pre-populate from existing reports
  useEffect(() => {
    if (!existingReports.length) return;
    const t: Record<string, string> = {};
    const a: Record<string, string> = {};
    const n: Record<string, string> = {};
    for (const r of existingReports) {
      if (r.speech_id) {
        t[r.speech_id] = r.target_seconds != null ? String(r.target_seconds) : "";
        a[r.speech_id] = r.actual_seconds != null ? String(r.actual_seconds) : "";
        n[r.speech_id] = r.notes ?? "";
      }
    }
    setTargets(t);
    setActuals(a);
    setSpeechNotes(n);
  }, [existingReports]);

  const startStopwatch = (speechId: string) => {
    if (running) return;
    setElapsed((p) => ({ ...p, [speechId]: 0 }));
    setRunning(speechId);
    intervalRef.current = setInterval(() => {
      setElapsed((p) => ({ ...p, [speechId]: (p[speechId] ?? 0) + 1 }));
    }, 1000);
  };

  const stopStopwatch = (speechId: string) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(null);
    setSaved(false);
    setActuals((p) => ({ ...p, [speechId]: String(elapsed[speechId] ?? 0) }));
  };

  // Cleanup on unmount
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const handleSubmit = async () => {
    setErr(null);
    setSaved(false);
    try {
      await Promise.all(
        speeches.map((speech) => {
          const target = targets[speech.id];
          const actual = actuals[speech.id];
          const note = speechNotes[speech.id];
          const existingReport = existingReports.find((r) => r.speech_id === speech.id);
          if (!target && !actual && !note && !existingReport) return Promise.resolve();
          return upsert.mutateAsync({
            meeting_role_id: myRole.id,
            meeting_id:      meetingId,
            member_id:       myRole.member_id,
            speech_id:       speech.id,
            target_seconds:  toNum(target),
            actual_seconds:  toNum(actual),
            notes:           note?.trim() || null,
          });
        }),
      );
      setSaved(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save report.");
    }
  };

  return (
    <div>
      <p className="app-eyebrow">Your Role</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-app-text">
        Timer
      </h2>
      <p className="mt-2 text-sm text-app-text-muted">
        Track speaking times for all speakers against their targets.
      </p>

      {speeches.length === 0 ? (
        <div className="mt-5 rounded-[1.25rem] border border-dashed border-app-border bg-app-panel-soft p-6 text-sm text-app-text-muted">
          No speeches added to this meeting yet.
        </div>
      ) : (
        <div className="mt-5 grid gap-4">
          {speeches.map((speech, index) => {
            const target = toNum(targets[speech.id] ?? "");
            const actual =
              running === speech.id
                ? elapsed[speech.id] ?? 0
                : toNum(actuals[speech.id] ?? "");
            const delta =
              target != null && actual != null ? actual - target : null;
            const speakerName = speech.speaker_id
              ? (members.find((m) => m.id === speech.speaker_id)?.name ?? "Unknown")
              : "Unassigned";

            return (
              <div
                key={speech.id}
                className="rounded-[1.35rem] border border-app-border bg-app-panel-soft p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-app-text">
                      {speech.title || `Speech ${index + 1}`}
                    </p>
                    <p className="mt-0.5 text-xs text-app-text-muted">
                      {speakerName}
                      {speech.manual_time ? ` · ${speech.manual_time}` : ""}
                    </p>
                  </div>
                  {delta != null && (
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        Math.abs(delta) <= 15
                          ? "bg-emerald-50 text-emerald-600"
                          : delta > 0
                            ? "bg-red-50 text-red-600"
                            : "bg-amber-50 text-amber-600"
                      }`}
                    >
                      {delta > 0 ? "+" : ""}
                      {delta}s
                    </span>
                  )}
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                      Target (s)
                    </span>
                    <input
                      type="number"
                      min="0"
                      className="mt-1.5 block w-full rounded-xl border border-app-border bg-white px-3 py-2.5 text-sm text-app-text"
                      value={targets[speech.id] ?? ""}
                      onChange={(e) => {
                        setSaved(false);
                        setTargets((p) => ({ ...p, [speech.id]: e.target.value }));
                      }}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                      Actual (s)
                    </span>
                    <div className="mt-1.5 flex gap-2">
                      <input
                        type="number"
                        min="0"
                        className="block w-full rounded-xl border border-app-border bg-white px-3 py-2.5 text-sm text-app-text"
                        value={
                          running === speech.id
                            ? String(elapsed[speech.id] ?? 0)
                            : (actuals[speech.id] ?? "")
                        }
                        readOnly={running === speech.id}
                        onChange={(e) => {
                          setSaved(false);
                          setActuals((p) => ({ ...p, [speech.id]: e.target.value }));
                        }}
                      />
                    </div>
                  </label>
                  <div className="flex flex-col justify-end">
                    {running === speech.id ? (
                      <button
                        type="button"
                        onClick={() => stopStopwatch(speech.id)}
                        className="rounded-xl bg-red-500 px-3 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                      >
                        Stop
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={!!running}
                        onClick={() => startStopwatch(speech.id)}
                        className="rounded-xl bg-emerald-500 px-3 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                      >
                        {elapsed[speech.id] != null ? "Reset" : "Start"}
                      </button>
                    )}
                  </div>
                </div>

                {running === speech.id && (
                  <p className="mt-2 text-center text-2xl font-bold tabular-nums text-app-text">
                    {elapsed[speech.id] ?? 0}s
                  </p>
                )}

                <label className="mt-3 block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                    Notes
                  </span>
                  <textarea
                    rows={2}
                    className="mt-1.5 block w-full rounded-xl border border-app-border bg-white px-3 py-2.5 text-sm text-app-text"
                    value={speechNotes[speech.id] ?? ""}
                    onChange={(e) => {
                      setSaved(false);
                      setSpeechNotes((p) => ({ ...p, [speech.id]: e.target.value }));
                    }}
                  />
                </label>
              </div>
            );
          })}
        </div>
      )}

      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

      {speeches.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={upsert.isPending}
            onClick={handleSubmit}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(59,130,246,0.22)] transition hover:opacity-90 disabled:opacity-60"
          >
            {upsert.isPending ? "Saving…" : "Submit Report"}
          </button>
          {saved && (
            <span className="text-sm font-medium text-emerald-600">Report saved ✓</span>
          )}
        </div>
      )}

      {saved && <MarkCompleteButton meetingRoleId={myRole.id} />}
    </div>
  );
}

// ── Static info panels ────────────────────────────────────────────────────────

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

// ── Role Action Panel dispatcher ──────────────────────────────────────────────

function RoleActionPanel({
  roleName,
  meetingId,
  myRole,
}: {
  roleName: string;
  meetingId: string;
  myRole: MeetingRole & { roles: { name: string } | null };
}) {
  switch (roleName) {
    case "Toastmaster":
      return <ToastmasterPanel meetingId={meetingId} />;
    case "Ah-Counter":
      return <AhCounterPanel meetingId={meetingId} myRole={myRole} />;
    case "Grammarian":
      return <GrammarianPanel meetingId={meetingId} myRole={myRole} />;
    case "Timer":
      return <TimerPanel meetingId={meetingId} myRole={myRole} />;
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

// ── Page ──────────────────────────────────────────────────────────────────────

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
              <RoleActionPanel
                roleName={roleName ?? ""}
                meetingId={meetingId ?? ""}
                myRole={myRole}
              />
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
