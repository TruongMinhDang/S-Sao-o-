const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output to the default .next folder inside apps/web
  distDir: '.next',
  
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