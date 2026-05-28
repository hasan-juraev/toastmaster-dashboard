import { useState } from "react";
import { useMembers } from "../../hooks/useMembers";
import {
  useSpeechComments,
  useCreateSpeechComment,
  useDeleteSpeechComment,
} from "../../hooks/useSpeechComments";

interface SpeechCommentsProps {
  speechId: string;
  currentMemberId?: string | null;
  isAdmin?: boolean;
}

export default function SpeechComments({ speechId, currentMemberId, isAdmin }: SpeechCommentsProps) {
  const { data: members = [] } = useMembers();
  const { data: comments = [], isLoading } = useSpeechComments(speechId);
  const createComment = useCreateSpeechComment();
  const deleteComment = useDeleteSpeechComment();

  // Admin: can choose commenter. Member: always posts as themselves.
  const [commenterId, setCommenterId] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const activeMembers = members.filter((m) => m.active);

  // Resolve effective commenter id
  const effectiveCommenterId = isAdmin
    ? commenterId || null
    : (currentMemberId ?? null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!text.trim()) {
      setError("Comment cannot be empty.");
      return;
    }
    setError("");
    try {
      await createComment.mutateAsync({
        speech_id: speechId,
        commenter_id: effectiveCommenterId,
        comment: text.trim(),
      });
      setText("");
      if (isAdmin) setCommenterId("");
    } catch {
      setError("Failed to post comment. Try again.");
    }
  };

  const handleDelete = async (id: string) => {
    await deleteComment.mutateAsync({ id, speechId });
  };

  return (
    <div className="mt-4 border-t border-app-border pt-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-app-text-subtle">
        Comments
      </p>

      {isLoading ? (
        <p className="text-xs text-app-text-muted">Loading comments...</p>
      ) : comments.length > 0 ? (
        <div className="mb-4 space-y-2">
          {comments.map((c) => {
            const author = members.find((m) => m.id === c.commenter_id);
            const isOwn = c.commenter_id === currentMemberId;
            return (
              <div
                key={c.id}
                className="flex items-start justify-between gap-3 rounded-xl bg-app-panel px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-app-text">
                    {author?.name ?? "Anonymous"}
                    <span className="ml-2 font-normal text-app-text-subtle">
                      {new Date(c.created_at).toLocaleDateString()}
                    </span>
                  </p>
                  <p className="mt-0.5 text-sm text-app-text-muted">{c.comment}</p>
                </div>
                {(isAdmin || isOwn) && (
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="shrink-0 text-xs text-app-text-subtle transition hover:text-red-500"
                    aria-label="Delete comment"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mb-4 text-xs text-app-text-muted">No comments yet.</p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div className="flex gap-2">
          {/* Admin sees commenter dropdown; members post as themselves */}
          {isAdmin && (
            <select
              value={commenterId}
              onChange={(e) => setCommenterId(e.target.value)}
              className="w-40 shrink-0 rounded-xl border border-app-border bg-app-panel-soft px-2.5 py-2 text-sm text-app-text"
            >
              <option value="">Anonymous</option>
              {activeMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          )}
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment…"
            className="min-w-0 flex-1 rounded-xl border border-app-border bg-app-panel-soft px-3 py-2 text-sm text-app-text placeholder:text-app-text-subtle"
          />
          <button
            type="submit"
            disabled={createComment.isPending}
            className="shrink-0 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
          >
            {createComment.isPending ? "..." : "Post"}
          </button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </form>
    </div>
  );
}
