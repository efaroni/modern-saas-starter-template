import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// In development, Next.js loads .env.local automatically
// For production, use actual environment variables
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/saas_template'

// For migrations
export const migrationClient = postgres(connectionString, { max: 1 })

// For queries - use optimized connection pool
export { db, getDatabasePool } from './connection-pool'

// Export optimized query utilities
export { queryOptimizer, optimizedQueries } from './query-optimization'

// Export migration utilities
export { runMigrations, getMigrationStatus, validateDatabaseSchema } from './migrate'
export { DatabaseMigrator } from './migrate'

// Export schema
export * from './schema'