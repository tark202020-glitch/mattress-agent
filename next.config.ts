import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  outputFileTracingExcludes: {
    "*": [
      "resource/AI-cover/**/*",
      "resource/AI-concept/**/*",
    ],
  },
};

export default nextConfig;
