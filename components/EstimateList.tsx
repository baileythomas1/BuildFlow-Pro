"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { Badge } from "@/components/Badge";
import { SectionDivider } from "@/components/SectionDivider";
import { estimateStatusBadge } from "@/lib/estimates/badges";
import { ibmPlexMono, inter } from "@/lib/fonts";
import type { EstimateDetail as EstimateDetailType, EstimateSummary } from "@/lib/estimates/types";

export function EstimateList({ projectId, accessToken }: { projectId: string; accessToken: string | null }) {
  const router = useRouter();
  const [estimates, setEstimates] = useState<EstimateSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
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
      router.push(`/estimates/${estimate.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create estimate");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div id="estimates" className="flex w-full scroll-mt-6 flex-col items-start gap-4">
      <SectionDivider
        label="Estimates"
        className="pt-7"
        action={{ label: creating ? "Creating..." : "New Estimate", onClick: handleCreate, disabled: creating }}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}

      {estimates === null && <p className="text-slate/60">Loading estimates...</p>}
      {estimates !== null && estimates.length === 0 && <p className="text-slate/60">No estimates yet.</p>}

      {estimates !== null && estimates.length > 0 && (
        <div className="w-full overflow-x-auto rounded-md border border-[#DCE4EC] bg-white">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#DCE4EC]">
                <th className={`${inter.className} px-5 pb-[13px] pt-3 text-[11px] font-medium uppercase tracking-[0.44px] text-[#5B6B7F]`}>
                  Title
                </th>
                <th className={`${inter.className} px-5 pb-[13px] pt-3 text-[11px] font-medium uppercase tracking-[0.44px] text-[#5B6B7F]`}>
                  Status
                </th>
                <th className={`${inter.className} px-5 pb-[13px] pt-3 text-[11px] font-medium uppercase tracking-[0.44px] text-[#5B6B7F]`}>
                  Total
                </th>
                <th className={`${inter.className} px-5 pb-[13px] pt-3 text-[11px] font-medium uppercase tracking-[0.44px] text-[#5B6B7F]`}>
                  Created
                </th>
                <th className="px-5 pb-[13px] pt-3"></th>
              </tr>
            </thead>
            <tbody>
              {estimates.map((estimate) => {
                const badge = estimateStatusBadge(estimate.status);
                return (
                  <tr key={estimate.id} className="border-b border-[#DCE4EC] last:border-0">
                    <td className={`${inter.className} px-5 py-[17px] text-[13px] text-[#1E293B]`}>
                      {estimate.title ?? (
                        <span className={`${inter.className} italic text-[#5B6B7F]`}>Untitled Estimate</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge label={badge.label} tone={badge.tone} />
                    </td>
                    <td className={`${ibmPlexMono.className} px-5 py-[16.5px] text-[13px] text-[#1E293B]`}>
                      ${Number(estimate.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`${ibmPlexMono.className} px-5 py-[16.5px] text-[13px] text-[#1E293B]`}>
                      {new Date(estimate.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-[17px] text-right">
                      <Link
                        href={`/estimates/${estimate.id}`}
                        className={`${inter.className} text-[12px] font-semibold text-sky hover:underline`}
                      >
                        View
                      </Link>
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
