import { prisma } from "@/lib/prisma";
import type { User } from "@/lib/generated/prisma/client";

// Stopgap brute-force protection (no new infra — see PRD Section 14 for the
// full Redis-based rate limiter this defers to). Tracks failures directly on
// the User row; a fixed 15-minute window starting at the first failure.
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

type LockoutFields = Pick<User, "failedLoginAttempts" | "failedLoginWindowStart">;

export type LockoutStatus = { locked: false } | { locked: true; retryAfterSeconds: number };

export function getLockoutStatus(user: LockoutFields): LockoutStatus {
  if (user.failedLoginAttempts < MAX_FAILED_ATTEMPTS || !user.failedLoginWindowStart) {
    return { locked: false };
  }

  const elapsedMs = Date.now() - user.failedLoginWindowStart.getTime();
  if (elapsedMs >= LOCKOUT_WINDOW_MS) {
    return { locked: false };
  }

  return { locked: true, retryAfterSeconds: Math.ceil((LOCKOUT_WINDOW_MS - elapsedMs) / 1000) };
}

export async function recordFailedLoginAttempt(user: Pick<User, "id"> & LockoutFields) {
  const now = new Date();
  const windowExpired =
    !user.failedLoginWindowStart ||
    now.getTime() - user.failedLoginWindowStart.getTime() >= LOCKOUT_WINDOW_MS;

  await prisma.user.update({
    where: { id: user.id },
    data: windowExpired
      ? { failedLoginAttempts: 1, failedLoginWindowStart: now }
      : { failedLoginAttempts: { increment: 1 } },
  });
}

export async function resetFailedLoginAttempts(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: 0, failedLoginWindowStart: null },
  });
}
