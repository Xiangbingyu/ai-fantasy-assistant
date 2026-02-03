import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://112.19.164.208:4000/api/:path*',
      },
    ];
  },
  experimental: {
    proxyTimeout: 60000, // 60秒超时
  },
};

export default nextConfig;
