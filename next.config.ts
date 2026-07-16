import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build self-contained en .next/standalone (ideal para Docker).
  output: "standalone",
  // Fija la raíz del trazado al proyecto (evita anidar por lockfiles de carpetas padre).
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
