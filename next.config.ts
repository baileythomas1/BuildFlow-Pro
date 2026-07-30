import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit reads its font-metrics (.afm) files off disk via __dirname at
  // runtime; bundling it rewrites __dirname and breaks that lookup. Keeping
  // it external lets Node's native require resolve it from node_modules.
  serverExternalPackages: ["pdfkit"],

  // Prisma's client outputs to a custom location (lib/generated/prisma)
  // instead of node_modules/.prisma/client, so Next's file tracer doesn't
  // automatically bundle the query engine binary into serverless functions.
  // This explicitly includes it so Prisma works at runtime on Vercel.
  outputFileTracingIncludes: {
    "/**": ["./lib/generated/prisma/**/*"],
  },
};

export default nextConfig;
