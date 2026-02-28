import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  outputFileTracingExcludes: {
    "*": [
      "public/resource/AI-cover/**/*",
      "public/resource/AI-concept/**/*",
    ],
  },
};

export default nextConfig;
