import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://120.48.16.108:4000/api/:path*',
      },
    ];
  },
  experimental: {
    proxyTimeout: 60000, // 60秒超时
  },
};

export default nextConfig;
