import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ["*.trycloudflare.com", "*.vercel.app"],
};

export default nextConfig;
