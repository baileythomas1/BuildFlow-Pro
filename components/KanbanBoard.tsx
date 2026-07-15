"use client";

import { useEffect, useState, FormEvent } from "react";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { apiFetch } from "@/lib/api-client";
import { KanbanColumn } from "@/components/KanbanColumn";
import { TaskEditModal } from "@/components/TaskEditModal";
import { applyOptimisticMove } from "@/lib/tasks/client-reorder";
import type { GroupedTasks, Task, TaskAssignee, TaskStatusValue } from "@/lib/tasks/types";

const COLUMNS: TaskStatusValue[] = ["TODO", "IN_PROGRESS", "DONE"];
const EMPTY_GROUPED: GroupedTasks = { TODO: [], IN_PROGRESS: [], DONE: [] };

export function KanbanBoard({
  projectId,
  accessToken,
  currentUserId,
  canManage,
  onTasksChanged,
}: {
  projectId: string;
  accessToken: string | null;
  currentUserId: string;
  canManage: boolean;
  // Fired after any mutation that can change the project's computed health
  // (status/order move, create, due-date edit, delete) — the project's
  // health is fetched separately on the parent page and won't otherwise
  // notice these changes.
  onTasksChanged?: () => void;
}) {
  const [grouped, setGrouped] = useState<GroupedTasks>(EMPTY_GROUPED);
  const [assignees, setAssignees] = useState<TaskAssignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTitles, setNewTitles] = useState<Record<TaskStatusValue, string>>({
    TODO: "",
    IN_PROGRESS: "",
    DONE: "",
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    apiFetch<{ tasks: GroupedTasks }>(`/api/projects/${projectId}/tasks`, accessToken)
      .then((data) => setGrouped(data.tasks))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load tasks"))
      .finally(() => setLoading(false));

    if (canManage) {
      apiFetch<{ users: TaskAssignee[] }>("/api/users", accessToken)
        .then((data) => setAssignees(data.users))
        .catch(() => {
          // Non-fatal: assignee dropdown just stays empty.
        });
    }
  }, [projectId, accessToken, canManage]);

  function canDrag(task: Task) {
    return canManage || task.assignee?.id === currentUserId;
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const taskId = String(active.id);
    const overId = String(over.id);
    if (taskId === overId) return;

    const task = COLUMNS.flatMap((s) => grouped[s]).find((t) => t.id === taskId);
    if (!task || !canDrag(task)) return;

    const previous = grouped;
    const result = applyOptimisticMove(grouped, taskId, overId);
    if (!result) return;

    setGrouped(result.grouped);
    setError(null);

    try {
      await apiFetch(`/api/tasks/${taskId}`, accessToken, {
        method: "PATCH",
        body: JSON.stringify({ status: result.toStatus, order: result.toIndex }),
      });
      // Reconcile with the server's resequenced order rather than trusting
      // the optimistic guess indefinitely.
      const fresh = await apiFetch<{ tasks: GroupedTasks }>(
        `/api/projects/${projectId}/tasks`,
        accessToken
      );
      setGrouped(fresh.tasks);
      onTasksChanged?.();
    } catch (err) {
      setGrouped(previous);
      setError(err instanceof Error ? err.message : "Failed to move task");
    }
  }

  async function handleQuickAdd(status: TaskStatusValue, e: FormEvent) {
    e.preventDefault();
    const title = newTitles[status].trim();
    if (!title) return;
    try {
      const { task } = await apiFetch<{ task: Task }>(`/api/projects/${projectId}/tasks`, accessToken, {
        method: "POST",
        body: JSON.stringify({ title, status }),
      });
      setGrouped((prev) => ({ ...prev, [status]: [...prev[status], task] }));
      setNewTitles((prev) => ({ ...prev, [status]: "" }));
      onTasksChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    }
  }

  if (loading) {
    return <p className="text-slate/60">Loading tasks...</p>;
  }

  return (
    <div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((status) => (
            <div key={status} className="flex flex-col gap-2">
              <KanbanColumn
                status={status}
                tasks={grouped[status]}
                canDrag={canDrag}
                onTaskClick={canManage ? (task) => setEditingTask(task) : undefined}
              />
              {canManage && (
                <form onSubmit={(e) => handleQuickAdd(status, e)} className="px-2">
                  <input
                    value={newTitles[status]}
                    onChange={(e) => setNewTitles((prev) => ({ ...prev, [status]: e.target.value }))}
                    placeholder="+ Add task"
                    className="w-72 rounded-md border border-slate/10 bg-white px-2 py-1.5 text-sm text-slate outline-none focus:border-sky"
                  />
                </form>
              )}
            </div>
          ))}
        </div>
      </DndContext>

      {editingTask && (
        <TaskEditModal
          task={editingTask}
          assignees={assignees}
          accessToken={accessToken}
          onClose={() => setEditingTask(null)}
          onSaved={(updated) => {
            setGrouped((prev) => ({
              ...prev,
              [updated.status]: prev[updated.status].map((t) => (t.id === updated.id ? updated : t)),
            }));
            setEditingTask(null);
            onTasksChanged?.();
          }}
          onDeleted={(taskId) => {
            setGrouped((prev) => ({
              TODO: prev.TODO.filter((t) => t.id !== taskId),
              IN_PROGRESS: prev.IN_PROGRESS.filter((t) => t.id !== taskId),
              DONE: prev.DONE.filter((t) => t.id !== taskId),
            }));
            setEditingTask(null);
            onTasksChanged?.();
          }}
        />
      )}
    </div>
  );
}
