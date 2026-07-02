import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for the Liara/Docker deployment: `node .next/standalone/server.js`.
  output: "standalone",
};

export default nextConfig;
