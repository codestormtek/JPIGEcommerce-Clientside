import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Cloudflare R2 CDN — production media assets
      {
        protocol: "https",
        hostname: "cdn.thejigglingpig.com",
        pathname: "/**",
      },
      // Local API uploads — dev fallback
      {
        protocol: "http",
        hostname: "localhost",
        port: "4000",
        pathname: "/uploads/**",
      },
    ],
  },
};

export default nextConfig;
