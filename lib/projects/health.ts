import type { ProjectStatus } from "@/lib/generated/prisma/client";

// PRD 9.2: health is computed from open overdue tasks vs. days remaining,
// never a manually set field. Thresholds below are a judgment call (the PRD
// only specifies the two inputs, not exact cutoffs):
//   - A project past its target date (and not COMPLETE) is DELAYED outright.
//   - With no overdue tasks, it's ON_TRACK.
//   - Otherwise, DELAYED once there's a week or less of runway left,
//     AT_RISK with more runway than that.
//   - With no target date set, fall back to overdue-task count alone.
export type ProjectHealth = "ON_TRACK" | "AT_RISK" | "DELAYED";

const AT_RISK_DAYS_REMAINING_THRESHOLD = 7;
const DELAYED_OVERDUE_COUNT_WITHOUT_DEADLINE = 3;

export function computeProjectHealth(input: {
  status: ProjectStatus;
  targetDate: Date | null;
  overdueTaskCount: number;
  now?: Date;
}): ProjectHealth {
  if (input.status === "COMPLETE") return "ON_TRACK";

  const now = input.now ?? new Date();

  if (input.targetDate && input.targetDate.getTime() < now.getTime()) {
    return "DELAYED";
  }

  if (input.overdueTaskCount === 0) return "ON_TRACK";

  if (!input.targetDate) {
    return input.overdueTaskCount >= DELAYED_OVERDUE_COUNT_WITHOUT_DEADLINE ? "DELAYED" : "AT_RISK";
  }

  const daysRemaining = Math.ceil((input.targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return daysRemaining <= AT_RISK_DAYS_REMAINING_THRESHOLD ? "DELAYED" : "AT_RISK";
}
