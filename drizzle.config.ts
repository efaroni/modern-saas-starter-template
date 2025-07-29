import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Load environment-specific configuration
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env.local';
config({ path: envFile });

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
