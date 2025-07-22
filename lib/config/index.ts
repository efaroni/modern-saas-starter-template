// Export centralized app configuration
export * from './app-config';

// Import database utilities
import { isRealDatabase, getDatabaseUrl } from '../db/config';

// Legacy configuration service that works with or without database
// TODO: Migrate these to app-config.ts
export const config = {
  database: {
    enabled: isRealDatabase(),
    get url() {
      try {
        return getDatabaseUrl();
      } catch {
        return undefined;
      }
    },
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY || 'dev-key-32-chars-change-in-prod!!',
  },
  services: {
    stripe: {
      enabled: !!process.env.STRIPE_SECRET_KEY,
      publicKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_mock',
    },
    openai: {
      enabled: !!process.env.OPENAI_API_KEY,
    },
    resend: {
      enabled: !!process.env.RESEND_API_KEY,
    },
  },
};