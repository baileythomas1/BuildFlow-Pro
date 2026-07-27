"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { usePortal } from "@/components/PortalProvider";
import { apiFetch } from "@/lib/api-client";
import { Badge } from "@/components/Badge";
import { estimateStatusBadge } from "@/lib/estimates/badges";
import type { PortalEstimateDetail } from "@/lib/portal/types";

function money(value: string | number) {
  return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

function lineTotal(quantity: string, unitCost: string, markup: string) {
  return Number(quantity) * Number(unitCost) * (1 + Number(markup) / 100);
}


// PRD 9.5's client approval workflow, PRD 9.6's portal surface, and PRD 18's
// acceptance criteria ("estimate approved from the portal"). Approve/reject
// are only offered while SENT — once decided, the estimate is immutable and
// this page just shows the outcome.
export default function PortalEstimateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { accessToken } = useAuth();
  const { loading: portalLoading } = usePortal();
  const router = useRouter();

  const [estimate, setEstimate] = useState<PortalEstimateDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    apiFetch<{ estimate: PortalEstimateDetail }>(`/api/estimates/${id}`, accessToken)
      .then((data) => setEstimate(data.estimate))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load estimate"));
  }

  useEffect(load, [id, accessToken]);

  async function handleApprove() {
    if (!window.confirm("Approve this estimate? This locks it in as the approved budget.")) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/estimates/${id}/approve`, accessToken, { method: "POST" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve estimate");
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!window.confirm("Reject this estimate?")) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/estimates/${id}/reject`, accessToken, { method: "POST" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject estimate");
    } finally {
      setBusy(false);
    }
  }

  if (portalLoading || (!estimate && !error)) {
    return (
      <main className="px-4 py-6">
        <p className="text-slate/60">Loading...</p>
      </main>
    );
  }

  if (error && !estimate) {
    return (
      <main className="px-4 py-6">
        <Link href="/portal/estimates" className="text-sm text-sky hover:underline">
          &larr; Back to Estimates
        </Link>
        <p className="mt-3 text-sm text-red-600">{error}</p>
      </main>
    );
  }

  if (!estimate) return null;

  const badge = estimateStatusBadge(estimate.status);

  return (
    <main className="px-4 py-6">
      <button onClick={() => router.push("/portal/estimates")} className="text-sm text-sky hover:underline">
        &larr; Back to Estimates
      </button>

      <div className="mt-3 flex items-start justify-between gap-3">
        <h1 className="text-xl font-semibold text-navy">{estimate.title ?? "Untitled Estimate"}</h1>
        <Badge label={badge.label} tone={badge.tone} />
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 rounded-lg border border-slate/10 bg-white p-4">
        {estimate.lineItems.length === 0 && (
          <p className="text-sm text-slate/60">No line items.</p>
        )}

        {estimate.lineItems.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-3 border-b border-slate/5 py-2.5 text-sm">
            <div>
              <p className="text-slate">{item.description}</p>
              <p className="mt-0.5 text-xs text-slate/50">
                {item.quantity} &times; {money(item.unitCost)}
                {Number(item.markup) > 0 ? ` + ${item.markup}% markup` : ""}
              </p>
            </div>
            <span className="whitespace-nowrap font-medium text-slate">
              {money(lineTotal(item.quantity, item.unitCost, item.markup))}
            </span>
          </div>
        ))}

        <p className="mt-3 text-right text-base font-semibold text-navy">Total: {money(estimate.total)}</p>
      </div>

      {estimate.status === "SENT" && (
        <div className="mt-4 flex gap-3">
          <button
            onClick={handleApprove}
            disabled={busy}
            className="flex-1 rounded-md bg-green px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Working..." : "Approve"}
          </button>
          <button
            onClick={handleReject}
            disabled={busy}
            className="flex-1 rounded-md border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:border-red-400 disabled:opacity-50"
          >
            {busy ? "Working..." : "Reject"}
          </button>
        </div>
      )}

      {estimate.status === "APPROVED" && (
        <p className="mt-4 rounded-md bg-green/10 px-3 py-2 text-sm text-green">
          You approved this estimate. It&rsquo;s now the locked budget for your project.
        </p>
      )}
      {estimate.status === "REJECTED" && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          You rejected this estimate. Reach out to your project team with any questions.
        </p>
      )}
    </main>
  );
}
