import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

// Load .env.local file
config({ path: '.env.local' });

// Import centralized database configuration
import { getDatabaseUrl } from './lib/db/config';

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
