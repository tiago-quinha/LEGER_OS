import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
