import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude server-side modules from client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        perf_hooks: false,
        'crypto': false,
        'stream': false,
        'os': false,
        'path': false,
        'url': false,
        'querystring': false,
      }
      
      // Exclude server-side auth and database modules from client bundle
      config.externals = config.externals || []
      config.externals.push({
        '@node-rs/bcrypt': 'commonjs @node-rs/bcrypt',
        'postgres': 'commonjs postgres',
        'bcrypt': 'commonjs bcrypt',
      })
    }
    return config
  },
  serverExternalPackages: ['@node-rs/bcrypt', 'postgres', 'bcrypt'],
};

export default nextConfig;
