const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tell Next.js to put the build output in the root .next folder
  distDir: path.join(__dirname, '../../.next'),
  
  // The output mode required by Google App Hosting
  output: 'standalone',

  // Help Next.js trace dependencies in a monorepo for standalone output
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },

  // Existing config
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