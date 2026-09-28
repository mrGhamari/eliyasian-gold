import type { NextConfig } from "next";

// STATIC_EXPORT=true is set only by scripts/build-pages.sh (GitHub Pages).
// Every other build is the server build used for Docker hosting.
const staticExport = process.env.STATIC_EXPORT === "true";

const nextConfig: NextConfig = staticExport
  ? {
      output: "export",
      // Project pages are served under /<repo-name>.
      basePath: process.env.PAGES_BASE_PATH ?? "",
      images: { unoptimized: true },
    }
  : {
      // Required for the Docker deployment: `node .next/standalone/server.js`.
      output: "standalone",
    };

export default nextConfig;
