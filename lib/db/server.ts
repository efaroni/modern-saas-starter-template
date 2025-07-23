// Server-only database utilities - includes Node.js dependencies
// This module should only be imported by server-side code

import postgres from 'postgres';

import { getDatabaseUrl } from './config';

// Get database URL from centralized configuration
const connectionString = getDatabaseUrl();

// For migrations
export const migrationClient = postgres(connectionString, { max: 1 });

// For queries - use optimized connection pool
export { db, getDatabasePool } from './connection-pool';

// Export optimized query utilities
export { queryOptimizer, optimizedQueries } from './query-optimization';

// Export migration utilities (server-only)
export {
  runMigrations,
  getMigrationStatus,
  validateDatabaseSchema,
} from './migrate';
export { DatabaseMigrator } from './migrate';

// Export schema for server use
export * from './schema';
