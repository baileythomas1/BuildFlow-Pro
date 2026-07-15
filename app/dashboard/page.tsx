"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireAuth } from "@/lib/use-require-auth";
import { apiFetch } from "@/lib/api-client";
import { Badge } from "@/components/Badge";
import { invoiceStatusBadge } from "@/lib/invoices/badges";
import type { DashboardData } from "@/lib/dashboard/types";

const CAN_VIEW_ROLES = ["OWNER", "ADMIN"];

function money(value: string) {
  return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 0 })}`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function DashboardPage() {
  const { user, loading: authLoading, accessToken } = useRequireAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canView = !!user && CAN_VIEW_ROLES.includes(user.role);

  useEffect(() => {
    if (!canView) return;
    apiFetch<DashboardData>("/api/dashboard", accessToken)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load dashboard"));
  }, [canView, accessToken]);

  if (authLoading || !user) {
    return (
      <main className="flex flex-1 items-center justify-center bg-off-white">
        <p className="text-slate/60">Loading...</p>
      </main>
    );
  }

  if (!canView) {
    return (
      <main className="flex flex-1 items-center justify-center bg-off-white px-4 text-center">
        <p className="text-slate/70">You don&apos;t have permission to view the dashboard.</p>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-off-white px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-semibold text-navy">Dashboard</h1>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        {!data && !error && <p className="mt-6 text-slate/60">Loading...</p>}

        {data && (
          <>
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-lg border border-slate/10 bg-white p-4">
                <p className="text-xs text-slate/50">Active Projects</p>
                <p className="mt-1 text-2xl font-semibold text-navy">{data.activeProjectCount}</p>
                <div className="mt-2 flex gap-2 text-xs">
                  <span className="text-green">{data.healthCounts.ON_TRACK} on track</span>
                  <span className="text-orange">{data.healthCounts.AT_RISK} at risk</span>
                  <span className="text-red-600">{data.healthCounts.DELAYED} delayed</span>
                </div>
              </div>
              <div className="rounded-lg border border-slate/10 bg-white p-4">
                <p className="text-xs text-slate/50">Overdue Tasks</p>
                <p className="mt-1 text-2xl font-semibold text-navy">{data.overdueTaskCount}</p>
              </div>
              <div className="rounded-lg border border-slate/10 bg-white p-4">
                <p className="text-xs text-slate/50">Outstanding Invoices</p>
                <p className="mt-1 text-2xl font-semibold text-navy">
                  {money(data.outstandingInvoiceTotal)}
                </p>
              </div>
              <div className="rounded-lg border border-slate/10 bg-white p-4">
                <p className="text-xs text-slate/50">Upcoming Milestones</p>
                <p className="mt-1 text-2xl font-semibold text-navy">{data.upcomingMilestones.length}</p>
                <p className="mt-2 text-xs text-slate/50">Next 14 days</p>
              </div>
            </div>

            <div className="mt-8">
              <h2 className="mb-3 text-lg font-semibold text-navy">Upcoming Milestones (next 14 days)</h2>
              {data.upcomingMilestones.length === 0 ? (
                <p className="text-slate/60">Nothing due in the next two weeks.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate/10 bg-white">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate/10 text-slate/60">
                        <th className="px-4 py-2 font-medium">Project</th>
                        <th className="px-4 py-2 font-medium">Description</th>
                        <th className="px-4 py-2 font-medium">Amount</th>
                        <th className="px-4 py-2 font-medium">Due</th>
                        <th className="px-4 py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.upcomingMilestones.map((m) => {
                        const badge = invoiceStatusBadge(m.status);
                        return (
                          <tr key={m.id} className="border-b border-slate/5 last:border-0">
                            <td className="px-4 py-2">
                              <Link href={`/projects/${m.project.id}`} className="text-sky hover:underline">
                                {m.project.name}
                              </Link>
                            </td>
                            <td className="px-4 py-2 text-slate">{m.description}</td>
                            <td className="px-4 py-2 text-slate">{money(m.amount)}</td>
                            <td className="px-4 py-2 text-slate/70">{formatDate(m.dueDate)}</td>
                            <td className="px-4 py-2">
                              <Badge label={badge.label} tone={badge.tone} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
