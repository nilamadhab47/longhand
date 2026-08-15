import type { NextConfig } from "next";

// A per-build stamp exposed to the client. PwaRegister uses it to force
// the browser to fetch a fresh /sw.js on every deploy, so cache versions
// tick over cleanly. In `next dev` the ID stays constant, which is what
// we want (a stable service worker while hacking).
const BUILD_ID =
  process.env.NEXT_PUBLIC_BUILD_ID ??
  process.env.VERCEL_GIT_COMMIT_SHA ??
  (process.env.NODE_ENV === "production" ? String(Date.now()) : "dev");

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_ID: BUILD_ID,
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
    ];
  },
};

export default nextConfig;
