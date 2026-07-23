"use client";

import { useEffect, useState } from "react";
import { usePortal } from "@/components/PortalProvider";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api-client";
import { Badge } from "@/components/Badge";
import { healthBadge } from "@/lib/projects/badges";
import { ibmPlexMono, inter } from "@/lib/fonts";
import type { PortalEstimate } from "@/lib/portal/types";

function money(value: string) {
  return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 0 })}`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const CARD_CLASS = "w-full rounded-md border border-[#DCE4EC] bg-white p-[19px]";

function CardLabel({ children }: { children: React.ReactNode }) {
  return <p className={`${inter.className} text-[13px] text-[#5B6B7F]`}>{children}</p>;
}

export default function PortalOverviewPage() {
  const { overview, loading, error, reload } = usePortal();
  const { accessToken } = useAuth();

  // undefined = not fetched yet, null = fetched and none pending
  const [pendingEstimate, setPendingEstimate] = useState<PortalEstimate | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const projectId = overview?.project.id ?? null;

  function loadPendingEstimate() {
    if (!projectId) return;
    apiFetch<{ estimates: PortalEstimate[] }>(`/api/projects/${projectId}/estimates`, accessToken)
      .then((data) => setPendingEstimate(data.estimates.find((e) => e.status === "SENT") ?? null))
      .catch(() => setPendingEstimate(null));
  }

  useEffect(loadPendingEstimate, [projectId, accessToken]);

  async function handleApprove() {
    if (!pendingEstimate) return;
    if (!window.confirm("Approve this estimate? This locks it in as the approved budget.")) return;
    setBusy(true);
    setActionError(null);
    try {
      await apiFetch(`/api/estimates/${pendingEstimate.id}/approve`, accessToken, { method: "POST" });
      loadPendingEstimate();
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to approve estimate");
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!pendingEstimate) return;
    if (!window.confirm("Reject this estimate?")) return;
    setBusy(true);
    setActionError(null);
    try {
      await apiFetch(`/api/estimates/${pendingEstimate.id}/reject`, accessToken, { method: "POST" });
      loadPendingEstimate();
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to reject estimate");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="px-5 py-5">
        <p className="text-slate/60">Loading your project...</p>
      </main>
    );
  }

  if (error || !overview) {
    return (
      <main className="px-5 py-5">
        <p className="text-slate/60">{error ?? "No project found for your account yet."}</p>
      </main>
    );
  }

  const { budgetSummary, upcomingMilestones } = overview;
  const health = healthBadge(overview.project.health);
  const nextMilestone = upcomingMilestones[0] ?? null;

  return (
    <main className="flex flex-col gap-5 px-5 py-5">
      <div className={CARD_CLASS}>
        <div className="flex items-center justify-between">
          <CardLabel>Project Status</CardLabel>
          <Badge label={health.label} tone={health.tone} />
        </div>
        <div className="mt-[17px] flex items-start justify-between">
          <div>
            <CardLabel>Approved</CardLabel>
            <p className={`${ibmPlexMono.className} mt-1 text-lg text-navy`}>{money(budgetSummary.approved)}</p>
          </div>
          <div>
            <CardLabel>Paid to date</CardLabel>
            <p className={`${ibmPlexMono.className} mt-1 text-lg text-navy`}>{money(budgetSummary.spent)}</p>
          </div>
        </div>
      </div>

      <div className={CARD_CLASS}>
        <CardLabel>Next Milestone</CardLabel>
        {nextMilestone ? (
          <>
            <p className={`${inter.className} mt-2 text-sm font-medium text-[#1E293B]`}>
              {nextMilestone.description}
            </p>
            <p className={`${ibmPlexMono.className} mt-1 text-sm text-[#1E293B]`}>
              {formatDate(nextMilestone.dueDate)}
            </p>
          </>
        ) : (
          <p className={`${inter.className} mt-2 text-sm text-[#5B6B7F]`}>Nothing upcoming right now.</p>
        )}
      </div>

      {pendingEstimate && (
        <div className={CARD_CLASS}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={`${inter.className} text-sm font-medium text-[#1E293B]`}>
                {pendingEstimate.title ?? "Untitled Estimate"}
              </p>
              <p className={`${inter.className} mt-1 text-xs font-medium text-orange`}>Needs your review</p>
            </div>
            <span className={`${ibmPlexMono.className} shrink-0 text-sm text-navy`}>
              {money(pendingEstimate.total)}
            </span>
          </div>

          {actionError && <p className="mt-2 text-xs text-red-600">{actionError}</p>}

          <div className="mt-4 flex gap-3">
            <button
              onClick={handleApprove}
              disabled={busy}
              className={`${inter.className} flex-1 rounded-md bg-orange py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50`}
            >
              {busy ? "Working..." : "Approve"}
            </button>
            <button
              onClick={handleReject}
              disabled={busy}
              className={`${inter.className} flex-1 rounded-md border border-red-200 py-2.5 text-sm font-medium text-red-600 hover:border-red-400 disabled:opacity-50`}
            >
              {busy ? "Working..." : "Reject"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
