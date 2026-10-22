import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "**/globals.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [
      {
        source: "/api/api/v1/:path*",
        destination: process.env.API_GATEWAY_URL
          ? `${process.env.API_GATEWAY_URL}/api/v1/:path*`
          : "http://nginx:80/api/v1/:path*",
      },
    ];
  },
};

export default nextConfig;
