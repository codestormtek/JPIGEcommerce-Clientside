import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.replit.dev", "*.repl.co"],
  images: {
    remotePatterns: [
      // Cloudflare R2 CDN — production media assets
      {
        protocol: "https",
        hostname: "cdn.thejigglingpig.com",
        pathname: "/**",
      },
      // Local API uploads — dev fallback (Replit uses port 8000)
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/uploads/**",
      },
    ],
  },
};

export default nextConfig;
