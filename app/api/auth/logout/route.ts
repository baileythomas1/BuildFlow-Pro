import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRefreshToken } from "@/lib/auth/tokens";
import { REFRESH_COOKIE_NAME, refreshCookieOptions } from "@/lib/auth/cookies";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(REFRESH_COOKIE_NAME)?.value;
  const payload = token ? verifyRefreshToken(token) : null;

  if (payload) {
    await prisma.user
      .update({ where: { id: payload.sub }, data: { tokenVersion: { increment: 1 } } })
      .catch(() => {});
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(REFRESH_COOKIE_NAME, "", { ...refreshCookieOptions(), maxAge: 0 });
  return response;
}
