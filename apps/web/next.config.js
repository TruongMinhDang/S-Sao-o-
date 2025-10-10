/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  devIndicators: {
    allowedDevOrigins: [
      "https://3000-firebase-studio-1756262711706.cluster-vsf6x3wzzh4stdes3ddm5gpgge.cloudworkstations.dev"
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;