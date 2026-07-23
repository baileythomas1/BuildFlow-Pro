"use client";

import { useEffect, useState, FormEvent, ReactNode, use } from "react";
import Link from "next/link";
import { useRequireAuth } from "@/lib/use-require-auth";
import { apiFetch } from "@/lib/api-client";
import { FormField } from "@/components/FormField";
import { ProjectCard } from "@/components/ProjectCard";
import { SectionDivider } from "@/components/SectionDivider";
import { KanbanBoard } from "@/components/KanbanBoard";
import { FileList } from "@/components/FileList";
import { EstimateList } from "@/components/EstimateList";
import { InvoiceList } from "@/components/InvoiceList";
import { StatusCommentThread } from "@/components/StatusCommentThread";
import { healthBadge, statusBadge } from "@/lib/projects/badges";
import { ibmPlexMono, inter } from "@/lib/fonts";
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

function InfoField({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-start gap-1">
      <p className={`${inter.className} text-[12px] text-[#5B6B7F]`}>{label}</p>
      <div className={`${mono ? ibmPlexMono.className : inter.className} text-sm text-[#1E293B]`}>{value}</div>
    </div>
  );
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
      <main className="flex flex-1 items-center justify-center bg-[#F4F7FA]">
        <p className="text-slate/60">Loading...</p>
      </main>
    );
  }

  const canManage = CAN_MANAGE_ROLES.includes(user.role);

  if (loadError) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 bg-[#F4F7FA] px-4 text-center">
        <p className="text-slate/70">{loadError}</p>
        <Link href="/projects" className="text-sky hover:underline">
          Back to Projects
        </Link>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="flex flex-1 items-center justify-center bg-[#F4F7FA]">
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
    <main className="flex-1 bg-[#F4F7FA]">
      <div className="mx-auto flex max-w-[1100px] flex-col items-start gap-4 px-8 pb-24 pt-[35px]">
        <Link href="/projects" className="text-[13px] text-sky hover:underline">
          &larr; Back to Projects
        </Link>

        <ProjectCard
          name={project.name}
          address={project.address}
          badges={[statusInfo, health]}
        >
          {project.archivedAt && (
            <p className="rounded-md bg-slate/5 px-3 py-2 text-sm text-slate/70">
              Archived on {formatDate(project.archivedAt)}
            </p>
          )}

          {!editing ? (
            <>
              <div className="flex w-full items-start gap-5">
                <InfoField
                  label="Client"
                  value={
                    <>
                      <p className="leading-normal">{project.client.name}</p>
                      <p className="leading-normal">({project.client.email})</p>
                    </>
                  }
                />
                <InfoField label="Budget" mono value={`$${Number(project.budget).toLocaleString()}`} />
                <InfoField label="Start date" mono value={formatDate(project.startDate)} />
                <InfoField label="Target Completion" mono value={formatDate(project.targetDate)} />
              </div>

              {canManage && !project.archivedAt && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      loadForEditing(project);
                      setEditing(true);
                    }}
                    className="flex h-[35px] items-center justify-center rounded border border-navy bg-white px-4 text-sm font-bold text-navy hover:bg-navy/5"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleArchive}
                    disabled={submitting}
                    className="flex h-[35px] items-center justify-center rounded border border-[#B54A3A] bg-white px-4 text-sm font-bold text-[#B54A3A] hover:bg-[#B54A3A]/5 disabled:opacity-50"
                  >
                    Archive
                  </button>
                </div>
              )}
              {formError && <p className="text-sm text-red-600">{formError}</p>}
            </>
          ) : (
            <form onSubmit={handleSave} className="flex w-full flex-col gap-4">
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
                  className="flex h-[35px] items-center justify-center rounded bg-orange px-4 text-[13px] font-bold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex h-[35px] items-center justify-center rounded border border-navy bg-white px-4 text-[13px] font-bold text-navy hover:bg-navy/5"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </ProjectCard>

        {!project.archivedAt && (
          <>
            <SectionDivider label="Tasks" className="pt-7" />
            <KanbanBoard
              projectId={project.id}
              accessToken={accessToken}
              currentUserId={user.id}
              canManage={canManage}
              onTasksChanged={refreshProjectHealth}
            />
          </>
        )}

        {!project.archivedAt && (
          <>
            <SectionDivider label="Files" className="pt-7" />
            <FileList projectId={project.id} accessToken={accessToken} />
          </>
        )}

        {/* Estimates/Invoices aren't in the Employee nav per PRD 8 IA; the
            Client role sees a sanitized view of them through /portal instead. */}
        {!project.archivedAt && canManage && <EstimateList projectId={project.id} accessToken={accessToken} />}

        {!project.archivedAt && canManage && <InvoiceList projectId={project.id} accessToken={accessToken} />}

        {!project.archivedAt && canManage && (
          <div className="w-full pt-7">
            <h2 className="mb-3 text-lg font-semibold text-navy">Client Updates</h2>
            <p className="mb-3 text-xs text-slate/50">
              Posted here, read-only in the homeowner portal — one-way, not a live chat.
            </p>
            <StatusCommentThread projectId={project.id} accessToken={accessToken} />
          </div>
        )}
      </div>
    </main>
  );
}
