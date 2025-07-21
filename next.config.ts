import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Clean configuration - server-side modules are now properly separated using server actions
  serverExternalPackages: ['@node-rs/bcrypt', 'postgres', 'bcrypt', 'drizzle-orm', 'ioredis'],
};

export default nextConfig;
