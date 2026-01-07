"use strict";

// apps/web/next.config.js
var nextConfig = {
  output: "standalone",
  // Xử lý lỗi thư viện Recharts
  transpilePackages: ["recharts"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com"
      }
    ]
  },
  eslint: {
    ignoreDuringBuilds: true
  }
};
module.exports = nextConfig;
