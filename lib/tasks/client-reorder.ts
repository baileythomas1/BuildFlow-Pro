import type { TaskStatusValue, GroupedTasks } from "@/lib/tasks/types";

const COLUMN_IDS: TaskStatusValue[] = ["TODO", "IN_PROGRESS", "DONE"];

function isColumnId(id: string): id is TaskStatusValue {
  return (COLUMN_IDS as string[]).includes(id);
}

// Pure, client-safe mirror of the server's placement logic (lib/tasks/reorder.ts
// can't be imported here — it pulls in Prisma). Used for the optimistic local
// update on drag; the server call afterwards is the source of truth, and a
// failed request rolls back to the pre-drag `grouped` the caller kept aside.
export function applyOptimisticMove(
  grouped: GroupedTasks,
  taskId: string,
  overId: string
): { grouped: GroupedTasks; toStatus: TaskStatusValue; toIndex: number } | null {
  const fromStatus = COLUMN_IDS.find((status) => grouped[status].some((t) => t.id === taskId));
  if (!fromStatus) return null;

  const task = grouped[fromStatus].find((t) => t.id === taskId)!;
  const withoutTask: GroupedTasks = {
    ...grouped,
    [fromStatus]: grouped[fromStatus].filter((t) => t.id !== taskId),
  };

  const toStatus = isColumnId(overId)
    ? overId
    : COLUMN_IDS.find((status) => withoutTask[status].some((t) => t.id === overId)) ?? fromStatus;

  const destColumn = withoutTask[toStatus];
  const overIndex = destColumn.findIndex((t) => t.id === overId);
  const toIndex = overIndex === -1 ? destColumn.length : overIndex;

  const newDestColumn = [...destColumn];
  newDestColumn.splice(toIndex, 0, { ...task, status: toStatus });

  return {
    grouped: { ...withoutTask, [toStatus]: newDestColumn },
    toStatus,
    toIndex,
  };
}
