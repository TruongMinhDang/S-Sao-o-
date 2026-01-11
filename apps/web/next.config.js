const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // CHÌA KHÓA VÀNG: Đưa file ra gốc workspace
  distDir: '../../.next', 
  
  output: 'standalone',

  experimental: {
    // Gom đủ file thư viện từ gốc
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },

  transpilePackages: ['recharts'], 
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;