"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePortal } from "@/components/PortalProvider";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api-client";
import { Badge } from "@/components/Badge";
import { estimateStatusBadge } from "@/lib/estimates/badges";
import type { PortalEstimate } from "@/lib/portal/types";

function money(value: string) {
  return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// PRD 9.5 / 9.6: estimates the office has sent, plus the outcome once
// decided. DRAFT estimates never reach this list — the API filters those
// out server-side (they're still being assembled internally).
export default function PortalEstimatesPage() {
  const { accessToken } = useAuth();
  const { projectId, loading: portalLoading } = usePortal();
  const [estimates, setEstimates] = useState<PortalEstimate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    apiFetch<{ estimates: PortalEstimate[] }>(`/api/projects/${projectId}/estimates`, accessToken)
      .then((data) => setEstimates(data.estimates))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load estimates"));
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
      <h1 className="text-xl font-semibold text-navy">Estimates</h1>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {estimates === null && !error && <p className="mt-3 text-slate/60">Loading estimates...</p>}
      {estimates !== null && estimates.length === 0 && (
        <p className="mt-3 text-slate/60">No estimates yet.</p>
      )}

      {estimates !== null && estimates.length > 0 && (
        <ul className="mt-4 flex flex-col gap-3">
          {estimates.map((estimate) => {
            const badge = estimateStatusBadge(estimate.status);
            return (
              <li key={estimate.id}>
                <Link
                  href={`/portal/estimates/${estimate.id}`}
                  className="block rounded-lg border border-slate/10 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-slate">
                      {estimate.title ?? <span className="italic text-slate/40">Untitled Estimate</span>}
                    </p>
                    <Badge label={badge.label} tone={badge.tone} />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-lg font-semibold text-navy">{money(estimate.total)}</span>
                    <span className="text-xs text-slate/50">{formatDate(estimate.createdAt)}</span>
                  </div>
                  {estimate.status === "SENT" && (
                    <p className="mt-2 text-xs font-medium text-orange">Needs your review</p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
