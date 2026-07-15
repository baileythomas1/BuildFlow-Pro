"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { Badge } from "@/components/Badge";
import { EstimateDetail } from "@/components/EstimateDetail";
import { estimateStatusBadge } from "@/lib/estimates/badges";
import type { EstimateDetail as EstimateDetailType, EstimateSummary } from "@/lib/estimates/types";

export function EstimateList({ projectId, accessToken }: { projectId: string; accessToken: string | null }) {
  const [estimates, setEstimates] = useState<EstimateSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  function load() {
    apiFetch<{ estimates: EstimateSummary[] }>(`/api/projects/${projectId}/estimates`, accessToken)
      .then((data) => setEstimates(data.estimates))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load estimates"));
  }

  useEffect(load, [projectId, accessToken]);

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const { estimate } = await apiFetch<{ estimate: EstimateDetailType }>(
        `/api/projects/${projectId}/estimates`,
        accessToken,
        { method: "POST", body: JSON.stringify({ lineItems: [] }) }
      );
      load();
      setSelectedId(estimate.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create estimate");
    } finally {
      setCreating(false);
    }
  }

  if (selectedId) {
    return (
      <EstimateDetail
        estimateId={selectedId}
        accessToken={accessToken}
        onClose={() => {
          setSelectedId(null);
          load();
        }}
        onArchived={() => {
          setSelectedId(null);
          load();
        }}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="ml-auto">
          <button
            onClick={handleCreate}
            disabled={creating}
            className="rounded-md bg-orange px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {creating ? "Creating..." : "New Estimate"}
          </button>
        </div>
      </div>

      {estimates === null && <p className="mt-3 text-slate/60">Loading estimates...</p>}
      {estimates !== null && estimates.length === 0 && (
        <p className="mt-3 text-slate/60">No estimates yet.</p>
      )}

      {estimates !== null && estimates.length > 0 && (
        <div className="mt-3 overflow-x-auto rounded-lg border border-slate/10 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate/10 text-slate/60">
                <th className="px-4 py-2 font-medium">Title</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Total</th>
                <th className="px-4 py-2 font-medium">Created</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {estimates.map((estimate) => {
                const badge = estimateStatusBadge(estimate.status);
                return (
                  <tr key={estimate.id} className="border-b border-slate/5 last:border-0">
                    <td className="px-4 py-2 text-slate">
                      {estimate.title ?? <span className="italic text-slate/40">Untitled Estimate</span>}
                    </td>
                    <td className="px-4 py-2">
                      <Badge label={badge.label} tone={badge.tone} />
                    </td>
                    <td className="px-4 py-2 text-slate">
                      ${Number(estimate.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2 text-slate/70">
                      {new Date(estimate.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => setSelectedId(estimate.id)}
                        className="text-sky hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
