import jwt from "jsonwebtoken";
import type { Role } from "@/lib/generated/prisma/client";

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = "30d";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export type AccessTokenPayload = {
  sub: string;
  companyId: string;
  role: Role;
  type: "access";
};

export type RefreshTokenPayload = {
  sub: string;
  companyId: string;
  tokenVersion: number;
  type: "refresh";
};

export function signAccessToken(payload: Omit<AccessTokenPayload, "type">): string {
  return jwt.sign({ ...payload, type: "access" }, requireEnv("JWT_ACCESS_SECRET"), {
    expiresIn: ACCESS_TOKEN_TTL,
  });
}

export function signRefreshToken(payload: Omit<RefreshTokenPayload, "type">): string {
  return jwt.sign({ ...payload, type: "refresh" }, requireEnv("JWT_REFRESH_SECRET"), {
    expiresIn: REFRESH_TOKEN_TTL,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const decoded = jwt.verify(token, requireEnv("JWT_ACCESS_SECRET"));
    if (typeof decoded !== "object" || decoded.type !== "access") return null;
    return decoded as AccessTokenPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    const decoded = jwt.verify(token, requireEnv("JWT_REFRESH_SECRET"));
    if (typeof decoded !== "object" || decoded.type !== "refresh") return null;
    return decoded as RefreshTokenPayload;
  } catch {
    return null;
  }
}
