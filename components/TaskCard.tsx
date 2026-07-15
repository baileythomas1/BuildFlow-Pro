"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@/lib/tasks/types";

function isOverdue(task: Task) {
  return task.status !== "DONE" && !!task.dueDate && new Date(task.dueDate).getTime() < Date.now();
}

export function TaskCard({
  task,
  draggable,
  onClick,
}: {
  task: Task;
  draggable: boolean;
  onClick?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: !draggable,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), zIndex: isDragging ? 10 : undefined }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(draggable ? { ...attributes, ...listeners } : {})}
      onClick={onClick}
      className={`rounded-md border border-slate/10 bg-white p-3 text-sm shadow-sm ${
        draggable ? "cursor-grab active:cursor-grabbing" : ""
      } ${onClick ? "cursor-pointer hover:border-slate/30" : ""} ${isDragging ? "opacity-50" : ""}`}
    >
      <p className="font-medium text-slate">{task.title}</p>
      <div className="mt-2 flex items-center justify-between text-xs text-slate/60">
        <span>{task.assignee?.name ?? "Unassigned"}</span>
        {task.dueDate && (
          <span className={isOverdue(task) ? "font-medium text-red-600" : ""}>
            {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}
