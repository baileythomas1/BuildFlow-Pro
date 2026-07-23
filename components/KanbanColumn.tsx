"use client";

import type { ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import { TaskCard } from "@/components/TaskCard";
import { inter } from "@/lib/fonts";
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
  quickAdd,
}: {
  status: TaskStatusValue;
  tasks: Task[];
  canDrag: (task: Task) => boolean;
  onTaskClick?: (task: Task) => void;
  quickAdd?: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex w-full flex-col items-center rounded-md bg-[#EDF1F5] px-3 py-2">
      <div
        className={`${inter.className} flex w-full items-center justify-between pb-2.5 pl-1.5 pr-1.5 pt-1 text-[12px] font-semibold uppercase tracking-[0.48px] text-[#5B6B7F]`}
      >
        <span>{COLUMN_LABELS[status]}</span>
        <span>{tasks.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-[193px] w-full flex-1 flex-col gap-2 rounded-md transition-colors ${
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
        {quickAdd}
      </div>
    </div>
  );
}
