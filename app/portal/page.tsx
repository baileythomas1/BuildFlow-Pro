"use client";

import { usePortal } from "@/components/PortalProvider";
import { Badge } from "@/components/Badge";
import { healthBadge, statusBadge } from "@/lib/projects/badges";
import { invoiceStatusBadge } from "@/lib/invoices/badges";

function money(value: string) {
  return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 0 })}`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function PortalOverviewPage() {
  const { overview, loading, error } = usePortal();

  if (loading) {
    return (
      <main className="px-4 py-6">
        <p className="text-slate/60">Loading your project...</p>
      </main>
    );
  }

  if (error || !overview) {
    return (
      <main className="px-4 py-6">
        <p className="text-slate/60">{error ?? "No project found for your account yet."}</p>
      </main>
    );
  }

  const { project, budgetSummary, upcomingMilestones } = overview;
  const health = healthBadge(project.health);
  const status = statusBadge(project.status);

  const approved = Number(budgetSummary.approved);
  const spent = Number(budgetSummary.spent);
  const percentSpent = approved > 0 ? Math.min(100, Math.round((spent / approved) * 100)) : 0;

  return (
    <main className="px-4 py-6">
      <h1 className="text-2xl font-semibold text-navy">{project.name}</h1>
      <p className="mt-1 text-sm text-slate/60">{project.address}</p>

      <div className="mt-3 flex gap-2">
        <Badge label={status.label} tone={status.tone} />
        <Badge label={health.label} tone={health.tone} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div className="rounded-lg border border-slate/10 bg-white p-4">
          <p className="text-slate/50">Start date</p>
          <p className="mt-1 font-medium text-slate">{formatDate(project.startDate)}</p>
        </div>
        <div className="rounded-lg border border-slate/10 bg-white p-4">
          <p className="text-slate/50">Target completion</p>
          <p className="mt-1 font-medium text-slate">{formatDate(project.targetDate)}</p>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-slate/10 bg-white p-4">
        <h2 className="text-sm font-semibold text-navy">Budget</h2>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-2xl font-semibold text-navy">{money(budgetSummary.spent)}</span>
          <span className="text-sm text-slate/50">of {money(budgetSummary.approved)} approved</span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate/10">
          <div className="h-full rounded-full bg-sky" style={{ width: `${percentSpent}%` }} />
        </div>
        <p className="mt-2 text-xs text-slate/50">{percentSpent}% of approved budget spent</p>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-navy">Upcoming Milestones</h2>
        {upcomingMilestones.length === 0 ? (
          <p className="mt-2 text-sm text-slate/60">Nothing upcoming right now.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {upcomingMilestones.map((milestone) => {
              const badge = invoiceStatusBadge(milestone.status);
              return (
                <li
                  key={milestone.id}
                  className="flex items-center justify-between rounded-lg border border-slate/10 bg-white p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate">{milestone.description}</p>
                    <p className="text-xs text-slate/50">Due {formatDate(milestone.dueDate)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-medium text-slate">{money(milestone.amount)}</span>
                    <Badge label={badge.label} tone={badge.tone} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
