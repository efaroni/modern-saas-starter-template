// Main database module - safe for client-side imports
// For server-only functionality, import from './server'

// Export client-safe database connection and types
export { db, getDatabasePool } from './connection-pool';

// Export optimized query utilities (these don't use Node.js APIs)
export { queryOptimizer, optimizedQueries } from './query-optimization';

// Export schema for both client and server use
export * from './schema';

// Export configuration utilities
export { getDatabaseUrl, getDatabaseConfig, isRealDatabase } from './config';
