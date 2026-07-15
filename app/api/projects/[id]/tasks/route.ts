import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth/middleware";
import { Role, TaskStatus } from "@/lib/generated/prisma/client";
import { isValidTaskStatus } from "@/lib/tasks/validate";
import { parseOptionalDate } from "@/lib/validate";
import { notifyTaskAssigned } from "@/lib/notifications/events";

type RouteCtx = { params: Promise<{ id: string }> };

const ASSIGNEE_SELECT = { id: true, name: true, email: true } as const;

// Grouped by column so the Kanban board can render directly from the
// response without client-side bucketing.
export const GET = withAuth<RouteCtx>(
  async (_req, auth, { params }) => {
    const { id: projectId } = await params;

    const project = await prisma.project.findFirst({
      where: { id: projectId, companyId: auth.companyId },
    });
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const tasks = await prisma.task.findMany({
      where: { projectId },
      orderBy: [{ status: "asc" }, { order: "asc" }],
      include: { assignee: { select: ASSIGNEE_SELECT } },
    });

    const grouped: Record<TaskStatus, typeof tasks> = { TODO: [], IN_PROGRESS: [], DONE: [] };
    for (const task of tasks) grouped[task.status].push(task);

    return NextResponse.json({ tasks: grouped });
  },
  { roles: [Role.OWNER, Role.ADMIN, Role.PM, Role.EMPLOYEE] }
);

export const POST = withAuth<RouteCtx>(
  async (req: NextRequest, auth, { params }) => {
    const { id: projectId } = await params;

    const project = await prisma.project.findFirst({
      where: { id: projectId, companyId: auth.companyId },
    });
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { title, assigneeId, dueDate, status } = body as Record<string, unknown>;

    if (typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    let resolvedStatus: TaskStatus = TaskStatus.TODO;
    if (status !== undefined) {
      if (!isValidTaskStatus(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      resolvedStatus = status;
    }

    let resolvedAssigneeId: string | null = null;
    let assignee: { id: string; name: string; email: string } | null = null;
    if (assigneeId !== undefined && assigneeId !== null) {
      if (typeof assigneeId !== "string") {
        return NextResponse.json({ error: "Invalid assignee" }, { status: 400 });
      }
      assignee = await prisma.user.findFirst({
        where: { id: assigneeId, companyId: auth.companyId },
        select: ASSIGNEE_SELECT,
      });
      if (!assignee) {
        return NextResponse.json({ error: "Invalid assignee" }, { status: 400 });
      }
      resolvedAssigneeId = assigneeId;
    }

    const dueDateResult = parseOptionalDate(dueDate);
    if (!dueDateResult.ok) {
      return NextResponse.json({ error: "Invalid due date" }, { status: 400 });
    }

    const columnCount = await prisma.task.count({ where: { projectId, status: resolvedStatus } });

    const task = await prisma.task.create({
      data: {
        projectId,
        title: title.trim(),
        status: resolvedStatus,
        order: columnCount,
        assigneeId: resolvedAssigneeId,
        dueDate: dueDateResult.date,
      },
      include: { assignee: { select: ASSIGNEE_SELECT } },
    });

    if (assignee) {
      await notifyTaskAssigned({
        assignee,
        taskTitle: task.title,
        taskId: task.id,
        projectId,
        projectName: project.name,
      });
    }

    return NextResponse.json({ task }, { status: 201 });
  },
  { roles: [Role.OWNER, Role.ADMIN, Role.PM] }
);
