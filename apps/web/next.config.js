const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: path.join(__dirname, '../../.next'),
  output: 'standalone',
  // Xử lý lỗi thư viện Recharts
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