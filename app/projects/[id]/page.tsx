"use client";

import { useEffect, useState, FormEvent, use } from "react";
import Link from "next/link";
import { useRequireAuth } from "@/lib/use-require-auth";
import { apiFetch } from "@/lib/api-client";
import { FormField } from "@/components/FormField";
import { Badge } from "@/components/Badge";
import { KanbanBoard } from "@/components/KanbanBoard";
import { FileList } from "@/components/FileList";
import { EstimateList } from "@/components/EstimateList";
import { InvoiceList } from "@/components/InvoiceList";
import { healthBadge, statusBadge } from "@/lib/projects/badges";
import type { Project, ProjectStatusValue } from "@/lib/projects/types";

const CAN_MANAGE_ROLES = ["OWNER", "ADMIN", "PM"];
const STATUS_OPTIONS: { value: ProjectStatusValue; label: string }[] = [
  { value: "PLANNING", label: "Planning" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "COMPLETE", label: "Complete" },
];

function toDateInputValue(value: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading: authLoading, accessToken } = useRequireAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [budget, setBudget] = useState("");
  const [status, setStatus] = useState<ProjectStatusValue>("PLANNING");
  const [startDate, setStartDate] = useState("");
  const [targetDate, setTargetDate] = useState("");

  function loadForEditing(p: Project) {
    setName(p.name);
    setAddress(p.address);
    setBudget(p.budget);
    setStatus(p.status);
    setStartDate(toDateInputValue(p.startDate));
    setTargetDate(toDateInputValue(p.targetDate));
  }

  useEffect(() => {
    if (authLoading || !user) return;
    apiFetch<{ project: Project }>(`/api/projects/${id}`, accessToken)
      .then((data) => setProject(data.project))
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load project"));
  }, [authLoading, user, accessToken, id]);

  // health is computed server-side from the project's tasks, so any task
  // mutation in the Kanban board below can change it — refetch to pick that
  // up rather than letting the badge go stale until the next full reload.
  function refreshProjectHealth() {
    apiFetch<{ project: Project }>(`/api/projects/${id}`, accessToken)
      .then((data) => setProject(data.project))
      .catch(() => {
        // Non-fatal: the board itself already reflects the change; the
        // health badge just stays at its last known value until next load.
      });
  }

  if (authLoading || !user) {
    return (
      <main className="flex flex-1 items-center justify-center bg-off-white">
        <p className="text-slate/60">Loading...</p>
      </main>
    );
  }

  const canManage = CAN_MANAGE_ROLES.includes(user.role);

  if (loadError) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 bg-off-white px-4 text-center">
        <p className="text-slate/70">{loadError}</p>
        <Link href="/projects" className="text-sky hover:underline">
          Back to Projects
        </Link>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="flex flex-1 items-center justify-center bg-off-white">
        <p className="text-slate/60">Loading project...</p>
      </main>
    );
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const { project: updated } = await apiFetch<{ project: Project }>(
        `/api/projects/${id}`,
        accessToken,
        {
          method: "PATCH",
          body: JSON.stringify({
            name,
            address,
            budget,
            status,
            startDate: startDate || null,
            targetDate: targetDate || null,
          }),
        }
      );
      setProject(updated);
      setEditing(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleArchive() {
    if (!window.confirm(`Archive "${project?.name}"? This can't be undone from here.`)) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/projects/${id}`, accessToken, { method: "DELETE" });
      const refreshed = await apiFetch<{ project: Project }>(`/api/projects/${id}`, accessToken);
      setProject(refreshed.project);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to archive project");
    } finally {
      setSubmitting(false);
    }
  }

  const health = healthBadge(project.health);
  const statusInfo = statusBadge(project.status);

  return (
    <main className="flex-1 bg-off-white px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/projects" className="text-sm text-sky hover:underline">
          &larr; Back to Projects
        </Link>

        <div className="mt-4 max-w-2xl rounded-lg border border-slate/10 bg-white p-8 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-navy">{project.name}</h1>
              <p className="mt-1 text-slate/70">{project.address}</p>
            </div>
            <div className="flex flex-shrink-0 gap-2">
              <Badge label={statusInfo.label} tone={statusInfo.tone} />
              <Badge label={health.label} tone={health.tone} />
            </div>
          </div>

          {project.archivedAt && (
            <p className="mt-4 rounded-md bg-slate/5 px-3 py-2 text-sm text-slate/70">
              Archived on {formatDate(project.archivedAt)}
            </p>
          )}

          {!editing ? (
            <>
              <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-slate/50">Client</dt>
                  <dd className="text-slate">
                    {project.client.name} ({project.client.email})
                  </dd>
                </div>
                <div>
                  <dt className="text-slate/50">Budget</dt>
                  <dd className="text-slate">${Number(project.budget).toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-slate/50">Start date</dt>
                  <dd className="text-slate">{formatDate(project.startDate)}</dd>
                </div>
                <div>
                  <dt className="text-slate/50">Target completion</dt>
                  <dd className="text-slate">{formatDate(project.targetDate)}</dd>
                </div>
              </dl>

              {canManage && !project.archivedAt && (
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => {
                      loadForEditing(project);
                      setEditing(true);
                    }}
                    className="rounded-md border border-slate/20 px-4 py-2 text-sm font-medium text-slate hover:border-slate/40"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleArchive}
                    disabled={submitting}
                    className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:border-red-400 disabled:opacity-50"
                  >
                    Archive
                  </button>
                </div>
              )}
              {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}
            </>
          ) : (
            <form onSubmit={handleSave} className="mt-6 flex flex-col gap-4">
              <FormField label="Project name" value={name} onChange={setName} required />
              <FormField label="Address" value={address} onChange={setAddress} required />
              <FormField label="Budget" type="number" value={budget} onChange={setBudget} required />

              <label className="flex flex-col gap-1 text-sm font-medium text-slate">
                Status
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProjectStatusValue)}
                  className="rounded-md border border-slate/20 px-3 py-2 text-base font-normal text-slate outline-none focus:border-sky focus:ring-1 focus:ring-sky"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex gap-4">
                <div className="flex-1">
                  <FormField label="Start date" type="date" value={startDate} onChange={setStartDate} />
                </div>
                <div className="flex-1">
                  <FormField
                    label="Target completion date"
                    type="date"
                    value={targetDate}
                    onChange={setTargetDate}
                  />
                </div>
              </div>

              {formError && <p className="text-sm text-red-600">{formError}</p>}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-orange px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-md border border-slate/20 px-4 py-2 text-sm font-medium text-slate hover:border-slate/40"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {!project.archivedAt && (
          <div className="mt-8">
            <h2 className="mb-3 text-lg font-semibold text-navy">Tasks</h2>
            <KanbanBoard
              projectId={project.id}
              accessToken={accessToken}
              currentUserId={user.id}
              canManage={canManage}
              onTasksChanged={refreshProjectHealth}
            />
          </div>
        )}

        {!project.archivedAt && (
          <div className="mt-8">
            <h2 className="mb-3 text-lg font-semibold text-navy">Files</h2>
            <FileList projectId={project.id} accessToken={accessToken} />
          </div>
        )}

        {/* Estimates/Invoices aren't in the Employee nav per PRD 8 IA, and
            Client only ever sees them through the (not-yet-built) portal. */}
        {!project.archivedAt && canManage && (
          <div className="mt-8">
            <h2 className="mb-3 text-lg font-semibold text-navy">Estimates</h2>
            <EstimateList projectId={project.id} accessToken={accessToken} />
          </div>
        )}

        {!project.archivedAt && canManage && (
          <div className="mt-8">
            <h2 className="mb-3 text-lg font-semibold text-navy">Invoices</h2>
            <InvoiceList projectId={project.id} accessToken={accessToken} />
          </div>
        )}
      </div>
    </main>
  );
}
