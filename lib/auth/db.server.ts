import 'server-only';

// Minimal database connection for auth without migrations
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { getDatabaseUrl } from '@/lib/db/config';
import * as schema from '@/lib/db/schema';

// Get database URL from centralized configuration
const connectionString = getDatabaseUrl();

// Create connection for auth (without migration dependencies)
const sql = postgres(connectionString);
export const authDb = drizzle(sql, { schema });

// Export only the schema needed for auth
export { accounts, sessions, users, verificationTokens } from '@/lib/db/schema';
