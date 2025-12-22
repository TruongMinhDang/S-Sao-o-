/** @type {import('next').NextConfig} */
const nextConfig = {
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