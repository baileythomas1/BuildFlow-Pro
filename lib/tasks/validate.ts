import { TaskStatus } from "@/lib/generated/prisma/client";

const TASK_STATUSES = Object.values(TaskStatus);

export function isValidTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === "string" && (TASK_STATUSES as string[]).includes(value);
}
