"use client";

import { useState, FormEvent } from "react";
import { apiFetch } from "@/lib/api-client";
import { FormField } from "@/components/FormField";
import type { Task, TaskAssignee } from "@/lib/tasks/types";

export function TaskEditModal({
  task,
  assignees,
  accessToken,
  onClose,
  onSaved,
  onDeleted,
}: {
  task: Task;
  assignees: TaskAssignee[];
  accessToken: string | null;
  onClose: () => void;
  onSaved: (task: Task) => void;
  onDeleted: (taskId: string) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [assigneeId, setAssigneeId] = useState(task.assignee?.id ?? "");
  const [dueDate, setDueDate] = useState(task.dueDate ? task.dueDate.slice(0, 10) : "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { task: updated } = await apiFetch<{ task: Task }>(`/api/tasks/${task.id}`, accessToken, {
        method: "PATCH",
        body: JSON.stringify({
          title,
          assigneeId: assigneeId || null,
          dueDate: dueDate || null,
        }),
      });
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save task");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/tasks/${task.id}`, accessToken, { method: "DELETE" });
      onDeleted(task.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete task");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate/40 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-navy">Edit Task</h2>
        <form onSubmit={handleSave} className="mt-4 flex flex-col gap-4">
          <FormField label="Title" value={title} onChange={setTitle} required />

          <label className="flex flex-col gap-1 text-sm font-medium text-slate">
            Assignee
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="rounded-md border border-slate/20 px-3 py-2 text-base font-normal text-slate outline-none focus:border-sky focus:ring-1 focus:ring-sky"
            >
              <option value="">Unassigned</option>
              {assignees.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>

          <FormField label="Due date" type="date" value={dueDate} onChange={setDueDate} />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={submitting}
              className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
            >
              Delete
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-slate/20 px-4 py-2 text-sm font-medium text-slate hover:border-slate/40"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-orange px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
