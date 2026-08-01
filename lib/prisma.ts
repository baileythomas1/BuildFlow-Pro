import path from "path";
import { PrismaClient } from "@/lib/generated/prisma/client";

// Turbopack relocates the bundled server chunks away from where the client
// was generated, so Prisma's __dirname-relative engine lookup never finds
// the binary that outputFileTracingIncludes places at
// lib/generated/prisma/ inside the Lambda (/var/task). Point it there
// directly instead of relying on Prisma's own path detection.
if (process.env.VERCEL && !process.env.PRISMA_QUERY_ENGINE_LIBRARY) {
  process.env.PRISMA_QUERY_ENGINE_LIBRARY = path.join(
    process.cwd(),
    "lib/generated/prisma/libquery_engine-rhel-openssl-3.0.x.so.node"
  );
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
