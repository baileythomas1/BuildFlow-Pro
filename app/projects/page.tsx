"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireAuth } from "@/lib/use-require-auth";
import { apiFetch } from "@/lib/api-client";
import type { Project } from "@/lib/projects/types";
import { Badge } from "@/components/Badge";
import { healthBadge, statusBadge } from "@/lib/projects/badges";

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
      <main className="flex flex-1 items-center justify-center bg-off-white">
        <p className="text-slate/60">Loading...</p>
      </main>
    );
  }

  const canManage = CAN_MANAGE_ROLES.includes(user.role);

  return (
    <main className="flex-1 bg-off-white px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-navy">Projects</h1>
          {canManage && (
            <Link
              href="/projects/new"
              className="rounded-md bg-orange px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              New Project
            </Link>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {!error && projects === null && <p className="mt-6 text-slate/60">Loading projects...</p>}

        {projects !== null && projects.length === 0 && (
          <p className="mt-6 text-slate/60">No projects yet.</p>
        )}

        {projects !== null && projects.length > 0 && (
          <div className="mt-6 overflow-x-auto rounded-lg border border-slate/10 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate/10 text-slate/60">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Health</th>
                  <th className="px-4 py-3 font-medium">Budget</th>
                  <th className="px-4 py-3 font-medium">Target Date</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => {
                  const health = healthBadge(project.health);
                  const status = statusBadge(project.status);
                  return (
                    <tr key={project.id} className="border-b border-slate/5 last:border-0 hover:bg-off-white">
                      <td className="px-4 py-3">
                        <Link
                          href={`/projects/${project.id}`}
                          className="font-medium text-navy hover:underline"
                        >
                          {project.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate/70">{project.client.name}</td>
                      <td className="px-4 py-3">
                        <Badge label={status.label} tone={status.tone} />
                      </td>
                      <td className="px-4 py-3">
                        <Badge label={health.label} tone={health.tone} />
                      </td>
                      <td className="px-4 py-3 text-slate/70">{formatBudget(project.budget)}</td>
                      <td className="px-4 py-3 text-slate/70">{formatDate(project.targetDate)}</td>
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
