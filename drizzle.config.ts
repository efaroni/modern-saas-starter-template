import { defineConfig } from 'drizzle-kit'
import { config } from 'dotenv'

// Load .env.local file
config({ path: '.env.local' })

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/saas_template',
  },
  verbose: true,
  strict: true,
})