import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Experimental features to improve build performance
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },

  // Server external packages - these won't be bundled for the client
  serverExternalPackages: ['bcryptjs', 'postgres', 'drizzle-orm', 'ioredis'],
};

export default nextConfig;
