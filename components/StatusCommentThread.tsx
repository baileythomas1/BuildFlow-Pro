"use client";

import { useEffect, useState, FormEvent } from "react";
import { apiFetch } from "@/lib/api-client";

type StatusComment = {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string };
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Internal (staff-facing) view of the one-way status-comment thread: staff
// can post here; the homeowner portal only ever reads the same thread.
export function StatusCommentThread({
  projectId,
  accessToken,
}: {
  projectId: string;
  accessToken: string | null;
}) {
  const [comments, setComments] = useState<StatusComment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function load() {
    apiFetch<{ comments: StatusComment[] }>(`/api/projects/${projectId}/status-comments`, accessToken)
      .then((data) => setComments(data.comments))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load updates"));
  }

  useEffect(load, [projectId, accessToken]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch(`/api/projects/${projectId}/status-comments`, accessToken, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      setBody("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post update");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-md border border-slate/10 bg-white p-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Post a status update for the homeowner..."
          rows={2}
          className="w-full resize-none rounded-md border border-slate/20 px-2 py-1.5 text-sm outline-none focus:border-sky"
        />
        <button
          type="submit"
          disabled={submitting || !body.trim()}
          className="self-end rounded-md bg-orange px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Posting..." : "Post Update"}
        </button>
      </form>

      {comments === null && <p className="mt-3 text-slate/60">Loading updates...</p>}
      {comments !== null && comments.length === 0 && (
        <p className="mt-3 text-slate/60">No updates posted yet.</p>
      )}

      {comments !== null && comments.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-md border border-slate/10 bg-white p-3 text-sm">
              <p className="text-slate">{comment.body}</p>
              <p className="mt-1 text-xs text-slate/50">
                {comment.author.name} &middot; {formatDateTime(comment.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
