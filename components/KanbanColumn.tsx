"use client";

import { useDroppable } from "@dnd-kit/core";
import { TaskCard } from "@/components/TaskCard";
import type { Task, TaskStatusValue } from "@/lib/tasks/types";

const COLUMN_LABELS: Record<TaskStatusValue, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};

export function KanbanColumn({
  status,
  tasks,
  canDrag,
  onTaskClick,
}: {
  status: TaskStatusValue;
  tasks: Task[];
  canDrag: (task: Task) => boolean;
  onTaskClick?: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex w-72 flex-shrink-0 flex-col rounded-lg bg-slate/5">
      <div className="flex items-center justify-between px-3 py-2">
        <h3 className="text-sm font-semibold text-slate">{COLUMN_LABELS[status]}</h3>
        <span className="text-xs text-slate/50">{tasks.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-[120px] flex-1 flex-col gap-2 rounded-md p-2 transition-colors ${
          isOver ? "bg-sky/10" : ""
        }`}
      >
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            draggable={canDrag(task)}
            onClick={onTaskClick ? () => onTaskClick(task) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
