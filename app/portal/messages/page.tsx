"use client";

import { useEffect, useState } from "react";
import { usePortal } from "@/components/PortalProvider";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api-client";
import type { PortalComment } from "@/lib/portal/types";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Read-only by design: this is the one-way status thread (PRD 9.6 / 10) —
// the office posts, the homeowner reads. No reply box here on purpose.
export default function PortalMessagesPage() {
  const { accessToken } = useAuth();
  const { projectId, loading: portalLoading } = usePortal();
  const [comments, setComments] = useState<PortalComment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    apiFetch<{ comments: PortalComment[] }>(`/api/projects/${projectId}/status-comments`, accessToken)
      .then((data) => setComments(data.comments))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load updates"));
  }, [projectId, accessToken]);

  if (portalLoading) {
    return (
      <main className="px-4 py-6">
        <p className="text-slate/60">Loading...</p>
      </main>
    );
  }

  return (
    <main className="px-4 py-6">
      <h1 className="text-xl font-semibold text-navy">Updates</h1>
      <p className="mt-1 text-xs text-slate/50">Status updates from the office.</p>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {comments === null && !error && <p className="mt-3 text-slate/60">Loading updates...</p>}
      {comments !== null && comments.length === 0 && (
        <p className="mt-3 text-slate/60">No updates yet.</p>
      )}

      {comments !== null && comments.length > 0 && (
        <ul className="mt-4 flex flex-col gap-3">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-lg border border-slate/10 bg-white p-4">
              <p className="text-sm text-slate">{comment.body}</p>
              <p className="mt-2 text-xs text-slate/50">
                {comment.author.name} &middot; {formatDateTime(comment.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
