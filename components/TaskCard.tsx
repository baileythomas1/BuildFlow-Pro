"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ibmPlexMono, inter } from "@/lib/fonts";
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
      className={`flex w-full flex-col gap-2 rounded-[5px] border border-[#DCE4EC] bg-white p-[13px] ${
        draggable ? "cursor-grab active:cursor-grabbing" : ""
      } ${onClick ? "cursor-pointer hover:border-[#5B6B7F]/40" : ""} ${isDragging ? "opacity-50" : ""}`}
    >
      <p className={`${inter.className} text-[13px] font-medium text-[#1E293B]`}>{task.title}</p>
      <div className={`${ibmPlexMono.className} flex items-center justify-between text-[11px]`}>
        <span className="text-[#5B6B7F]">{task.assignee?.name ?? "Unassigned"}</span>
        {task.dueDate && (
          <span className={isOverdue(task) ? "text-[#B54A3A]" : "text-[#5B6B7F]"}>
            {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}
