import { useState } from "react";
import { useMembers } from "../../hooks/useMembers";
import { useVotes, useVoteResults, useSubmitVote } from "../../hooks/useVotes";
import type { VoteCategory } from "../../types/database";

interface VotingSectionProps {
  meetingId: string;
  currentMemberId?: string | null;
  isAdmin?: boolean;
}

const CATEGORIES: { key: VoteCategory; label: string; description: string }[] = [
  {
    key: "Best Speaker",
    label: "Best Speaker",
    description: "Prepared speech with the strongest delivery",
  },
  {
    key: "Best Table Topics Speaker",
    label: "Best Table Topics Speaker",
    description: "Most impressive impromptu table topics response",
  },
  {
    key: "Best Evaluator",
    label: "Best Evaluator",
    description: "Most constructive and actionable evaluation",
  },
];

export default function VotingSection({ meetingId, currentMemberId, isAdmin }: VotingSectionProps) {
  const { data: members = [] } = useMembers();
  const { data: votes = [] } = useVotes(meetingId);
  const results = useVoteResults(meetingId, members);
  const submitVote = useSubmitVote();

  // For non-admin: voter is pre-filled as the current member
  const defaultVoterId = !isAdmin && currentMemberId ? currentMemberId : "";

  const [selections, setSelections] = useState<
    Record<VoteCategory, { voterId: string; votedForId: string }>
  >({
    "Best Speaker": { voterId: defaultVoterId, votedForId: "" },
    "Best Table Topics Speaker": { voterId: defaultVoterId, votedForId: "" },
    "Best Evaluator": { voterId: defaultVoterId, votedForId: "" },
  });

  const [submitting, setSubmitting] = useState<VoteCategory | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const activeMembers = members.filter((m) => m.active);

  const getVoterCurrentVote = (category: VoteCategory, voterId: string) => {
    if (!voterId) return null;
    return votes.find((v) => v.category === category && v.voter_id === voterId) ?? null;
  };

  const handleVote = async (category: VoteCategory) => {
    const sel = selections[category];
    if (!sel.voterId) {
      setErrors((e) => ({ ...e, [category]: "Select who is voting." }));
      return;
    }
    if (!sel.votedForId) {
      setErrors((e) => ({ ...e, [category]: "Select who to vote for." }));
      return;
    }
    if (sel.voterId === sel.votedForId) {
      setErrors((e) => ({ ...e, [category]: "You cannot vote for yourself." }));
      return;
    }

    setErrors((e) => ({ ...e, [category]: "" }));
    setSubmitting(category);
    try {
      await submitVote.mutateAsync({
        meeting_id: meetingId,
        voter_id: sel.voterId,
        category,
        voted_for_member_id: sel.votedForId,
      });
    } catch {
      setErrors((e) => ({ ...e, [category]: "Failed to submit vote. Try again." }));
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div>
      <p className="app-eyebrow">Voting</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-app-text">
        Cast your votes
      </h2>
      <p className="mt-1 text-sm text-app-text-muted">
        Each member votes once per category. Changing a vote replaces the previous one.
      </p>

      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {CATEGORIES.map(({ key, label, description }) => {
          const result = results.find((r) => r.category === key);
          const sel = selections[key];
          const currentVote = getVoterCurrentVote(key, sel.voterId);
          const isSubmitting = submitting === key;

          return (
            <div
              key={key}
              className="flex flex-col gap-4 rounded-[1.5rem] border border-app-border bg-app-panel-soft p-5"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-subtle">
                  {label}
                </p>
                <p className="mt-1 text-sm text-app-text-muted">{description}</p>
              </div>

              <div className="space-y-2">
                {/* Admin sees the "who is voting" dropdown; members have their identity pre-set */}
                {isAdmin ? (
                  <select
                    value={sel.voterId}
                    onChange={(e) =>
                      setSelections((s) => ({
                        ...s,
                        [key]: { ...s[key], voterId: e.target.value },
                      }))
                    }
                    className="w-full rounded-xl border border-app-border bg-app-panel px-3 py-2.5 text-sm text-app-text"
                  >
                    <option value="">Who is voting?</option>
                    {activeMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                ) : currentMemberId ? (
                  <p className="text-sm font-medium text-app-text">
                    Voting as:{" "}
                    <span className="text-primary">
                      {members.find((m) => m.id === currentMemberId)?.name ?? "You"}
                    </span>
                  </p>
                ) : null}

                <select
                  value={sel.votedForId}
                  onChange={(e) =>
                    setSelections((s) => ({
                      ...s,
                      [key]: { ...s[key], votedForId: e.target.value },
                    }))
                  }
                  className="w-full rounded-xl border border-app-border bg-app-panel px-3 py-2.5 text-sm text-app-text"
                >
                  <option value="">Vote for...</option>
                  {activeMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>

                {currentVote && (
                  <p className="text-xs text-app-text-muted">
                    Current vote:{" "}
                    <span className="font-medium text-app-text">
                      {members.find((m) => m.id === currentVote.voted_for_member_id)?.name ?? "—"}
                    </span>
                  </p>
                )}

                {errors[key] && (
                  <p className="text-xs text-red-500">{errors[key]}</p>
                )}

                <button
                  onClick={() => handleVote(key)}
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Submitting..."
                    : currentVote
                      ? "Update vote"
                      : "Submit vote"}
                </button>
              </div>

              {result && result.tally.length > 0 && (
                <div className="border-t border-app-border pt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-app-text-subtle">
                    Current tally
                  </p>
                  <div className="space-y-1.5">
                    {result.tally.map((t) => (
                      <div key={t.member_id} className="flex items-center justify-between gap-2">
                        <span
                          className={`text-sm ${t.member_id === result.winner?.member_id ? "font-semibold text-app-text" : "text-app-text-muted"}`}
                        >
                          {t.member_id === result.winner?.member_id && "🏆 "}
                          {t.member_name}
                        </span>
                        <span className="rounded-full bg-app-panel px-2 py-0.5 text-xs font-semibold text-app-text-muted">
                          {t.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
