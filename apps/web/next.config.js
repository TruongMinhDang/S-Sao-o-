const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  
  // Trỏ chính xác ra thư mục root của Monorepo (đi lên 2 cấp)
  outputFileTracingRoot: path.join(__dirname, '../../'),
  
  transpilePackages: ['recharts'],
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },
};

module.exports = nextConfig;