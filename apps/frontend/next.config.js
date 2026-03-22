/** @type {import('next').NextConfig} */
const path = require("path");

// Internal API URL (server-side only) — used by Next.js rewrite proxy.
// In k8s this is the ClusterIP service. Locally it points to localhost:4000.
const API_INTERNAL_URL = process.env.API_URL ?? "http://localhost:4000";

const nextConfig = {
  output: "standalone",
  // Needed in monorepo: traces deps from the workspace root so all hoisted
  // node_modules are included in the standalone bundle.
  outputFileTracingRoot: path.join(__dirname, "../../"),
  // Proxy /api/* → internal API service (no CORS, no build-time URL needed)
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_INTERNAL_URL}/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

module.exports = nextConfig;
