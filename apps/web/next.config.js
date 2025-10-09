/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  devIndicators: {
    allowedDevOrigins: [
      "https://3000-firebase-studio-1756262711706.cluster-vsf6x3wzzh4stdes3ddm5gpgge.cloudworkstations.dev"
    ],
  },
};

module.exports = nextConfig;