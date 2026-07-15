import { NextRequest, NextResponse } from "next/server";
import type { Role } from "@/lib/generated/prisma/client";
import { verifyAccessToken } from "@/lib/auth/tokens";

// Trusted identity derived from a verified access token. Every route handler
// wrapped in withAuth must scope its Prisma queries using auth.companyId —
// never a company_id read from the request body, query string, or params.
export type AuthContext = {
  userId: string;
  companyId: string;
  role: Role;
};

type RouteHandler<Ctx> = (
  req: NextRequest,
  auth: AuthContext,
  ctx: Ctx
) => Promise<NextResponse> | NextResponse;

export function withAuth<Ctx = unknown>(
  handler: RouteHandler<Ctx>,
  options?: { roles?: Role[] }
) {
  return async (req: NextRequest, ctx: Ctx): Promise<NextResponse> => {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (options?.roles && !options.roles.includes(payload.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const auth: AuthContext = {
      userId: payload.sub,
      companyId: payload.companyId,
      role: payload.role,
    };

    return handler(req, auth, ctx);
  };
}
