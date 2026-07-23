"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireAuth } from "@/lib/use-require-auth";
import { apiFetch } from "@/lib/api-client";
import type { Project } from "@/lib/projects/types";
import { Badge } from "@/components/Badge";
import { healthBadge, statusBadge } from "@/lib/projects/badges";
import { spaceGrotesk, ibmPlexMono, inter } from "@/lib/fonts";

const CAN_MANAGE_ROLES = ["OWNER", "ADMIN", "PM"];

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function formatBudget(value: string) {
  return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function ProjectsPage() {
  const { user, loading: authLoading, accessToken } = useRequireAuth();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    apiFetch<{ projects: Project[] }>("/api/projects", accessToken)
      .then((data) => setProjects(data.projects))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load projects"));
  }, [authLoading, user, accessToken]);

  if (authLoading || !user) {
    return (
      <main className="flex flex-1 items-center justify-center bg-[#F4F7FA]">
        <p className="text-slate/60">Loading...</p>
      </main>
    );
  }

  const canManage = CAN_MANAGE_ROLES.includes(user.role);

  return (
    <main className="flex-1 bg-[#F4F7FA]">
      <div className="mx-auto max-w-[1100px] px-8 pb-24 pt-10">
        <div className="flex items-center justify-between">
          <h1 className={`${spaceGrotesk.className} text-[28px] text-navy`}>Projects</h1>
          {canManage && (
            <Link
              href="/projects/new"
              className={`${inter.className} flex h-10 w-[125px] items-center justify-center rounded bg-orange text-sm font-bold text-white hover:opacity-90`}
            >
              New Project
            </Link>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {!error && projects === null && <p className="mt-7 text-slate/60">Loading projects...</p>}

        {projects !== null && projects.length === 0 && (
          <p className="mt-7 text-slate/60">No projects yet.</p>
        )}

        {projects !== null && projects.length > 0 && (
          <div className="mt-7 overflow-x-auto rounded-md border border-[#DCE4EC] bg-white">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#DCE4EC]">
                  <th className={`${inter.className} px-5 pb-[15px] pt-[14px] text-[12px] font-medium text-[#5B6B7F]`}>Name</th>
                  <th className={`${inter.className} px-5 pb-[15px] pt-[14px] text-[12px] font-medium text-[#5B6B7F]`}>Client</th>
                  <th className={`${inter.className} px-5 pb-[15px] pt-[14px] text-[12px] font-medium text-[#5B6B7F]`}>Status</th>
                  <th className={`${inter.className} px-5 pb-[15px] pt-[14px] text-[12px] font-medium text-[#5B6B7F]`}>Health</th>
                  <th className={`${inter.className} px-5 pb-[15px] pt-[14px] text-[12px] font-medium text-[#5B6B7F]`}>Budget</th>
                  <th className={`${inter.className} px-5 pb-[15px] pt-[14px] text-[12px] font-medium text-[#5B6B7F]`}>Target Date</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => {
                  const health = healthBadge(project.health);
                  const status = statusBadge(project.status);
                  return (
                    <tr key={project.id} className="border-b border-[#DCE4EC] last:border-0 hover:bg-[#F4F7FA]">
                      <td className="px-5 py-[18.5px]">
                        <Link
                          href={`/projects/${project.id}`}
                          className={`${inter.className} text-[14px] font-semibold text-navy hover:underline`}
                        >
                          {project.name}
                        </Link>
                      </td>
                      <td className={`${inter.className} px-5 py-[18.5px] text-[14px] text-[#1E293B]`}>
                        {project.client.name}
                      </td>
                      <td className="px-5 py-4">
                        <Badge label={status.label} tone={status.tone} />
                      </td>
                      <td className="px-5 py-4">
                        <Badge label={health.label} tone={health.tone} />
                      </td>
                      <td className={`${ibmPlexMono.className} px-5 py-[18.5px] text-[13px] text-[#1E293B]`}>
                        {formatBudget(project.budget)}
                      </td>
                      <td className={`${ibmPlexMono.className} px-5 py-[18.5px] text-[13px] text-[#1E293B]`}>
                        {formatDate(project.targetDate)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
