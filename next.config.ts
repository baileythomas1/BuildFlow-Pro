import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit reads its font-metrics (.afm) files off disk via __dirname at
  // runtime; bundling it rewrites __dirname and breaks that lookup. Keeping
  // it external lets Node's native require resolve it from node_modules.
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
