"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireAuth } from "@/lib/use-require-auth";
import { apiFetch } from "@/lib/api-client";
import { Badge } from "@/components/Badge";
import { StatCard } from "@/components/StatCard";
import { healthBadge } from "@/lib/projects/badges";
import type { DashboardData } from "@/lib/dashboard/types";
import type { Project } from "@/lib/projects/types";
import { spaceGrotesk, ibmPlexMono, inter } from "@/lib/fonts";

const CAN_VIEW_ROLES = ["OWNER", "ADMIN", "PM"];
const NEEDS_ATTENTION_HEALTH = ["DELAYED", "AT_RISK"];

function money(value: string) {
  return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 0 })}`;
}

function formatFullDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

function formatShortDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex w-full items-center gap-3">
      <span className="h-px flex-1 bg-[#DCE4EC]" />
      <span className={`${ibmPlexMono.className} text-[11px] uppercase tracking-[1.1px] text-[#5B6B7F]`}>
        {label}
      </span>
      <span className="h-px flex-1 bg-[#DCE4EC]" />
    </div>
  );
}

export default function DashboardPage() {
  const { user, loading: authLoading, accessToken } = useRequireAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [needsAttention, setNeedsAttention] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canView = !!user && CAN_VIEW_ROLES.includes(user.role);

  useEffect(() => {
    if (!canView) return;
    apiFetch<DashboardData>("/api/dashboard", accessToken)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load dashboard"));
    apiFetch<{ projects: Project[] }>("/api/projects", accessToken)
      .then((res) =>
        setNeedsAttention(
          res.projects
            .filter((p) => NEEDS_ATTENTION_HEALTH.includes(p.health))
            .sort((a, b) => NEEDS_ATTENTION_HEALTH.indexOf(a.health) - NEEDS_ATTENTION_HEALTH.indexOf(b.health))
        )
      )
      .catch(() => {
        // Non-fatal: the Needs Attention panel just stays empty.
      });
  }, [canView, accessToken]);

  if (authLoading || !user) {
    return (
      <main className="flex flex-1 items-center justify-center bg-[#F4F7FA]">
        <p className="text-slate/60">Loading...</p>
      </main>
    );
  }

  if (!canView) {
    return (
      <main className="flex flex-1 items-center justify-center bg-[#F4F7FA] px-4 text-center">
        <p className="text-slate/70">You don&apos;t have permission to view the dashboard.</p>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-[#F4F7FA]">
      <div className="mx-auto max-w-[1100px] px-8 pb-24 pt-10">
        <p className={`${ibmPlexMono.className} text-xs uppercase tracking-[0.96px] text-[#5B6B7F]`}>Overview</p>
        <h1 className={`${spaceGrotesk.className} pt-1.5 text-[30px] text-navy`}>
          {greeting()}, {user.name.split(" ")[0]}.
        </h1>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        {!data && !error && <p className="mt-6 text-slate/60">Loading...</p>}

        {data && (
          <>
            <div className="grid grid-cols-2 gap-4 pt-8 md:grid-cols-4">
              <StatCard
                label="Active Projects"
                value={String(data.activeProjectCount)}
                breakdown={[
                  { label: "On track", value: data.healthCounts.ON_TRACK, tone: "green" },
                  { label: "At risk", value: data.healthCounts.AT_RISK, tone: "orange" },
                  { label: "Delayed", value: data.healthCounts.DELAYED, tone: "red" },
                ]}
              />
              <StatCard label="Overdue Tasks" value={String(data.overdueTaskCount)} valueTone="orange" />
              <StatCard
                label="Outstanding Invoices"
                value={money(data.outstandingInvoiceTotal)}
                valueTone="orange"
              />
              <StatCard label="Milestones - 14 days" value={String(data.upcomingMilestones.length)} />
            </div>

            <div className="grid grid-cols-1 gap-6 pt-12 lg:grid-cols-[1.3fr_1fr]">
              <div className="flex flex-col items-start gap-5">
                <SectionDivider label="Needs Attention" />
                {needsAttention === null ? (
                  <p className="text-sm text-slate/60">Loading...</p>
                ) : needsAttention.length === 0 ? (
                  <p className="text-sm text-slate/60">No projects need attention right now.</p>
                ) : (
                  <div className="w-full divide-y divide-[#DCE4EC] rounded-md border border-[#DCE4EC] bg-white">
                    {needsAttention.map((project) => {
                      const badge = healthBadge(project.health);
                      return (
                        <Link
                          key={project.id}
                          href={`/projects/${project.id}`}
                          className="flex items-center justify-between px-5 py-4 hover:bg-[#F4F7FA]"
                        >
                          <div>
                            <p className={`${inter.className} text-sm font-semibold text-navy`}>{project.name}</p>
                            <p className={`${ibmPlexMono.className} pt-0.5 text-[11px] text-[#5B6B7F]`}>
                              {project.address.toUpperCase()} · TARGET {formatFullDate(project.targetDate)}
                            </p>
                          </div>
                          <Badge label={badge.label} tone={badge.tone} />
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-start gap-5">
                <SectionDivider label="Upcoming Milestones" />
                {data.upcomingMilestones.length === 0 ? (
                  <p className="text-sm text-slate/60">Nothing due in the next two weeks.</p>
                ) : (
                  <div className="flex w-full flex-col gap-3">
                    {data.upcomingMilestones.map((m) => (
                      <Link
                        key={m.id}
                        href={`/projects/${m.project.id}`}
                        className="flex items-center justify-between gap-4 rounded-md border border-[#DCE4EC] bg-white px-5 py-4 hover:bg-[#F4F7FA]"
                      >
                        <span className={`${ibmPlexMono.className} shrink-0 text-xs text-[#5B6B7F]`}>
                          {formatShortDate(m.dueDate)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <p className={`${inter.className} truncate text-[13px] text-[#1E293B]`}>
                            {m.description}
                          </p>
                          <p className={`${inter.className} truncate text-[11px] text-[#5B6B7F]`}>
                            {m.project.name}
                          </p>
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
