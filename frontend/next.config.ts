import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  output: process.env.NEXT_BUILD_MODE === "spa" ? "export" : "standalone",
  trailingSlash: process.env.NEXT_BUILD_MODE === "spa",
  images: {
    unoptimized: process.env.NEXT_BUILD_MODE === "spa",
  },
  allowedDevOrigins: ["127.0.0.1"]
};

export default nextConfig;
