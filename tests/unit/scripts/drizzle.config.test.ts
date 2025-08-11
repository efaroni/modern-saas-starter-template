// Moved to scripts/drizzle.config.test.ts to avoid Jest picking it up as a test file
import { defineConfig } from 'drizzle-kit';

// Set NODE_ENV to test to ensure we get the test database URL
process.env.NODE_ENV = 'test';

// Import centralized database configuration
import { getDatabaseUrl } from '@/lib/db/config';

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: getDatabaseUrl(),
  },
  verbose: true,
  strict: true,
});
