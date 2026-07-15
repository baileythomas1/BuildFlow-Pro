import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth/middleware";
import { Role, TaskStatus } from "@/lib/generated/prisma/client";
import { isValidTaskStatus } from "@/lib/tasks/validate";
import { parseOptionalDate } from "@/lib/validate";
import { moveTask, resequenceColumn } from "@/lib/tasks/reorder";
import { notifyTaskAssigned } from "@/lib/notifications/events";

type RouteCtx = { params: Promise<{ id: string }> };

const ASSIGNEE_SELECT = { id: true, name: true, email: true } as const;
const MANAGER_ROLES: Role[] = [Role.OWNER, Role.ADMIN, Role.PM];

// PRD 5.3 / 8: Employees are "read-mostly" — they can drag their own cards
// across the board (status/order) but can't edit task details or touch
// other people's tasks. Owner/Admin/PM can edit and move anything.
export const PATCH = withAuth<RouteCtx>(
  async (req: NextRequest, auth, { params }) => {
    const { id } = await params;

    const task = await prisma.task.findFirst({
      where: { id, project: { companyId: auth.companyId } },
    });
    if (!task) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { title, assigneeId, dueDate, status, order } = body as Record<string, unknown>;

    const isManager = MANAGER_ROLES.includes(auth.role);
    if (!isManager) {
      if (task.assigneeId !== auth.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (title !== undefined || assigneeId !== undefined || dueDate !== undefined) {
        return NextResponse.json(
          { error: "You can only move this task, not edit its details" },
          { status: 403 }
        );
      }
    }

    const fieldUpdates: Record<string, unknown> = {};

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return NextResponse.json({ error: "title must be a non-empty string" }, { status: 400 });
      }
      fieldUpdates.title = title.trim();
    }

    let newlyAssigned: { id: string; name: string; email: string } | null = null;
    if (assigneeId !== undefined) {
      if (assigneeId === null) {
        fieldUpdates.assigneeId = null;
      } else {
        if (typeof assigneeId !== "string") {
          return NextResponse.json({ error: "Invalid assignee" }, { status: 400 });
        }
        const assignee = await prisma.user.findFirst({
          where: { id: assigneeId, companyId: auth.companyId },
          select: ASSIGNEE_SELECT,
        });
        if (!assignee) {
          return NextResponse.json({ error: "Invalid assignee" }, { status: 400 });
        }
        fieldUpdates.assigneeId = assigneeId;
        // Only notify on an actual change to a different person, not a
        // no-op re-save of the same assignee.
        if (assigneeId !== task.assigneeId) {
          newlyAssigned = assignee;
        }
      }
    }

    if (dueDate !== undefined) {
      const result = parseOptionalDate(dueDate);
      if (!result.ok) {
        return NextResponse.json({ error: "Invalid due date" }, { status: 400 });
      }
      fieldUpdates.dueDate = result.date;
    }

    if (Object.keys(fieldUpdates).length > 0) {
      await prisma.task.update({ where: { id: task.id }, data: fieldUpdates });
    }

    if (status !== undefined || order !== undefined) {
      if (status !== undefined && !isValidTaskStatus(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      if (order !== undefined && (typeof order !== "number" || !Number.isInteger(order) || order < 0)) {
        return NextResponse.json({ error: "order must be a non-negative integer" }, { status: 400 });
      }
      const moved = await moveTask({
        companyId: auth.companyId,
        taskId: task.id,
        toStatus: (status as TaskStatus) ?? task.status,
        toIndex: order as number | undefined,
      });
      if (!moved) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    }

    const result = await prisma.task.findUnique({
      where: { id: task.id },
      include: { assignee: { select: ASSIGNEE_SELECT } },
    });

    if (newlyAssigned && result) {
      const project = await prisma.project.findUnique({
        where: { id: task.projectId },
        select: { name: true },
      });
      if (project) {
        await notifyTaskAssigned({
          assignee: newlyAssigned,
          taskTitle: result.title,
          taskId: result.id,
          projectId: task.projectId,
          projectName: project.name,
        });
      }
    }

    return NextResponse.json({ task: result });
  },
  { roles: [Role.OWNER, Role.ADMIN, Role.PM, Role.EMPLOYEE] }
);

export const DELETE = withAuth<RouteCtx>(
  async (_req, auth, { params }) => {
    const { id } = await params;

    const task = await prisma.task.findFirst({
      where: { id, project: { companyId: auth.companyId } },
    });
    if (!task) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.task.delete({ where: { id: task.id } });
    await resequenceColumn(task.projectId, task.status);

    return NextResponse.json({ success: true });
  },
  { roles: MANAGER_ROLES }
);
