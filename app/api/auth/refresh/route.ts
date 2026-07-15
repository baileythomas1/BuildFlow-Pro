import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/lib/auth/tokens";
import { REFRESH_COOKIE_NAME, refreshCookieOptions } from "@/lib/auth/cookies";

// Rotates the refresh token on every use and re-issues a short-lived access
// token. tokenVersion must match the current value on the User row — bumped
// on logout (or a future password change) to revoke all outstanding refresh
// tokens for that user immediately.
export async function POST(req: NextRequest) {
  const token = req.cookies.get(REFRESH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = verifyRefreshToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.tokenVersion !== payload.tokenVersion) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = signAccessToken({ sub: user.id, companyId: user.companyId, role: user.role });
  const newRefreshToken = signRefreshToken({
    sub: user.id,
    companyId: user.companyId,
    tokenVersion: user.tokenVersion,
  });

  const response = NextResponse.json({ accessToken });
  response.cookies.set(REFRESH_COOKIE_NAME, newRefreshToken, refreshCookieOptions());
  return response;
}
