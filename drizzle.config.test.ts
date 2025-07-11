// Moved to scripts/drizzle.config.test.ts to avoid Jest picking it up as a test file
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.TEST_DATABASE_URL || 'postgresql://test_user:test_pass@localhost:5433/saas_template_test',
  },
  verbose: true,
  strict: true,
}) 