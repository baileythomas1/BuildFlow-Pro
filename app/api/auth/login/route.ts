import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/passwords";
import { signAccessToken, signRefreshToken } from "@/lib/auth/tokens";
import { REFRESH_COOKIE_NAME, refreshCookieOptions } from "@/lib/auth/cookies";
import {
  getLockoutStatus,
  recordFailedLoginAttempt,
  resetFailedLoginAttempts,
} from "@/lib/auth/login-attempts";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email, password } = body as Record<string, unknown>;
  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "email and password are required" }, { status: 400 });
  }

  const invalidCredentials = () =>
    NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) return invalidCredentials();

  const lockout = getLockoutStatus(user);
  if (lockout.locked) {
    return NextResponse.json(
      { error: "Too many failed login attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(lockout.retryAfterSeconds) } }
    );
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    await recordFailedLoginAttempt(user);
    return invalidCredentials();
  }

  await resetFailedLoginAttempts(user.id);

  const accessToken = signAccessToken({ sub: user.id, companyId: user.companyId, role: user.role });
  const refreshToken = signRefreshToken({
    sub: user.id,
    companyId: user.companyId,
    tokenVersion: user.tokenVersion,
  });

  const response = NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    },
    accessToken,
  });
  response.cookies.set(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
  return response;
}
