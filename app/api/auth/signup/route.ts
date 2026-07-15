import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma, Role } from "@/lib/generated/prisma/client";
import { hashPassword } from "@/lib/auth/passwords";
import { signAccessToken, signRefreshToken } from "@/lib/auth/tokens";
import { REFRESH_COOKIE_NAME, refreshCookieOptions } from "@/lib/auth/cookies";
import { isValidEmail, isValidPassword } from "@/lib/auth/validate";

// Creates a new Company and its first User (role OWNER). This is the only
// way a Company is created in Phase 1 — inviting additional users to an
// existing company is a separate, not-yet-built flow.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { companyName, name, email, password } = body as Record<string, unknown>;

  if (
    typeof companyName !== "string" ||
    !companyName.trim() ||
    typeof name !== "string" ||
    !name.trim() ||
    typeof email !== "string" ||
    !isValidEmail(email) ||
    typeof password !== "string" ||
    !isValidPassword(password)
  ) {
    return NextResponse.json(
      {
        error:
          "companyName, name, a valid email, and a password of at least 8 characters are required",
      },
      { status: 400 }
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await hashPassword(password);

  try {
    const { user, company } = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: { name: companyName.trim(), plan: "trial" },
      });
      const user = await tx.user.create({
        data: {
          companyId: company.id,
          email: normalizedEmail,
          passwordHash,
          role: Role.OWNER,
          name: name.trim(),
        },
      });
      return { user, company };
    });

    const accessToken = signAccessToken({ sub: user.id, companyId: company.id, role: user.role });
    const refreshToken = signRefreshToken({
      sub: user.id,
      companyId: company.id,
      tokenVersion: user.tokenVersion,
    });

    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: company.id,
        },
        company: { id: company.id, name: company.name, plan: company.plan },
        accessToken,
      },
      { status: 201 }
    );
    response.cookies.set(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }
    throw error;
  }
}
