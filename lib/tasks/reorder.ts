import { prisma } from "@/lib/prisma";
import { TaskStatus } from "@/lib/generated/prisma/client";

// Moves taskId into toStatus at toIndex (0-based, clamped to the column's
// bounds; omitted = append to the end), then resequences both the
// destination column and — if the task changed columns — the source column
// to a dense 0..n-1 order. Runs as one transaction so a mid-drag failure
// can't leave two tasks sharing an order value. Called for both actual
// drag-and-drop moves and plain status-only updates, so `order` never drifts
// regardless of how a task got there.
export async function moveTask(params: {
  companyId: string;
  taskId: string;
  toStatus: TaskStatus;
  toIndex?: number;
}): Promise<boolean> {
  const { companyId, taskId, toStatus, toIndex } = params;

  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { companyId } },
  });
  if (!task) return false;

  const fromStatus = task.status;

  const destinationTasks = await prisma.task.findMany({
    where: { projectId: task.projectId, status: toStatus, id: { not: taskId } },
    orderBy: { order: "asc" },
    select: { id: true },
  });
  const destinationIds = destinationTasks.map((t) => t.id);
  const clampedIndex =
    toIndex === undefined ? destinationIds.length : Math.max(0, Math.min(toIndex, destinationIds.length));
  destinationIds.splice(clampedIndex, 0, taskId);

  const ops = destinationIds.map((id, index) =>
    prisma.task.update({
      where: { id },
      data: id === taskId ? { order: index, status: toStatus } : { order: index },
    })
  );

  if (fromStatus !== toStatus) {
    const sourceTasks = await prisma.task.findMany({
      where: { projectId: task.projectId, status: fromStatus, id: { not: taskId } },
      orderBy: { order: "asc" },
      select: { id: true },
    });
    ops.push(
      ...sourceTasks.map((t, index) =>
        prisma.task.update({ where: { id: t.id }, data: { order: index } })
      )
    );
  }

  await prisma.$transaction(ops);
  return true;
}

// Closes the gap left in a column after a task is removed from it entirely
// (i.e. deleted, not moved — moveTask already handles the moved-away case).
export async function resequenceColumn(projectId: string, status: TaskStatus) {
  const tasks = await prisma.task.findMany({
    where: { projectId, status },
    orderBy: { order: "asc" },
    select: { id: true },
  });
  await prisma.$transaction(
    tasks.map((t, index) => prisma.task.update({ where: { id: t.id }, data: { order: index } }))
  );
}
