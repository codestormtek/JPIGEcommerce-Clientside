import type { NextConfig } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const apiHost = (() => {
  try {
    return new URL(API_URL).hostname;
  } catch {
    return "localhost";
  }
})();

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.replit.dev", "*.riker.replit.dev", "*.repl.co", "127.0.0.1"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.thejigglingpig.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "jpig-api.onrender.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "api.thejigglingpig.com",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/uploads/**",
      },
    ],
  },
  async rewrites() {
    if (process.env.NEXT_PUBLIC_API_URL) {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/v1$/, '');
      return [
        {
          source: "/api/:path*",
          destination: `${baseUrl}/api/:path*`,
        },
      ];
    }
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
