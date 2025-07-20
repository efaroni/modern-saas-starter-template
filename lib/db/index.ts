import postgres from 'postgres'
import { getDatabaseUrl } from './config'

// Get database URL from centralized configuration
const connectionString = getDatabaseUrl()

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