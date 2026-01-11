const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Đưa file build ra ngoài root để Google Adapter tìm thấy
  distDir: '../../.next',
  
  output: 'standalone',

  experimental: {
    // Giữ cái này để gom đủ file trong monorepo
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