// Export centralized app configuration
export * from './app-config';
export * from './env-validation';

// Import database utilities and validation
import { getEnv } from './env-validation';
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
    get key() {
      const env = getEnv();
      return env.ENCRYPTION_KEY || 'dev-key-32-chars-change-in-prod!!';
    },
  },
  services: {
    stripe: {
      get enabled() {
        const env = getEnv();
        return !!env.STRIPE_SECRET_KEY;
      },
      get publicKey() {
        const env = getEnv();
        return env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_mock';
      },
    },
    openai: {
      get enabled() {
        const env = getEnv();
        return !!env.OPENAI_API_KEY;
      },
    },
    resend: {
      get enabled() {
        const env = getEnv();
        return !!env.RESEND_API_KEY;
      },
    },
  },
};
