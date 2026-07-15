import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth/middleware";

// Reference implementation of the company-scoped access pattern: even though
// `id` alone would uniquely identify the row, every query is also filtered
// by auth.companyId (taken from the verified token, never from the request)
// so a cross-tenant lookup can never succeed.
export const GET = withAuth(async (_req, auth) => {
  const user = await prisma.user.findFirst({
    where: { id: auth.userId, companyId: auth.companyId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      companyId: true,
      company: { select: { id: true, name: true, plan: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
});
