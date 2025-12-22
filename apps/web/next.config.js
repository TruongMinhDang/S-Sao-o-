/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  
  // --- BẮT ĐẦU PHẦN SỬA LỖI ---
  // Ép Next.js biên dịch các thư viện này để tránh lỗi "Module not found"
  transpilePackages: ['recharts', 'react-smooth'],
  
  // Tối ưu hóa việc import để giảm dung lượng và tránh xung đột
  experimental: {
    optimizePackageImports: ['recharts', 'lodash'],
  },
  // --- KẾT THÚC PHẦN SỬA LỖI ---

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },
  devIndicators: {
    allowedDevOrigins: [
      "https://3000-firebase-studio-1756262711706.cluster-vsf6x3wzzh4stdes3ddm5gpgge.cloudworkstations.dev"
    ],
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;