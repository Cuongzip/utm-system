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
    async headers() {
        return [
            {
                source: "/cesium/:path*",
                headers: [
                    {
                        key: "Cache-Control",
                        value: "public, max-age=31536000, immutable",
                    },
                ],
            },
        ];
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
