import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// In development, Next.js loads .env.local automatically
// For production, use actual environment variables
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/saas_template'

// For migrations
export const migrationClient = postgres(connectionString, { max: 1 })

// For queries
const queryClient = postgres(connectionString)
export const db = drizzle(queryClient, { schema })