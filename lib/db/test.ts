import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { getDatabaseUrl, getDatabaseConfig } from './config';
import * as schema from './schema';

// Test database configuration with worker isolation
// Delay URL resolution until runtime to ensure environment is loaded
const getTestDatabaseUrl = () => getDatabaseUrl();

// Get worker ID for isolation (Jest sets JEST_WORKER_ID)
const getWorkerId = () => {
  const workerId = process.env.JEST_WORKER_ID || '1';
  return workerId;
};

// Create worker-specific database client
const createWorkerTestClient = () => {
  const workerId = getWorkerId();
  const config = getDatabaseConfig();
  const testDatabaseUrl = getTestDatabaseUrl();

  return postgres(testDatabaseUrl, {
    max: config.poolSize || 3, // Allow more connections per worker
    idle_timeout: config.idleTimeout || 20,
    connect_timeout: config.connectTimeout || 10,
    // Add worker ID to connection for debugging
    connection: {
      application_name: `test_worker_${workerId}`,
    },
  });
};

// Create test database client for this worker (lazy initialization)
let testClient: ReturnType<typeof createWorkerTestClient> | null = null;
let testDbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

const getTestClient = () => {
  if (!testClient) {
    testClient = createWorkerTestClient();
  }
  return testClient;
};

export const getTestDb = () => {
  if (!testDbInstance) {
    testDbInstance = drizzle(getTestClient(), { schema });
  }
  return testDbInstance;
};

// For backward compatibility
export const testDb = new Proxy(
  {} as ReturnType<typeof drizzle<typeof schema>>,
  {
    get(_, prop) {
      return (getTestDb() as unknown as Record<string, unknown>)[
        prop as string
      ];
    },
  },
);

// Initialize test database (run migrations)
export async function initializeTestDatabase() {
  try {
    // First, validate the test database connection
    console.warn('Validating test database connection...');
    try {
      const client = getTestClient();
      await client`SELECT 1 as test`;
      console.warn('Test database connection successful');
    } catch (connectionError) {
      console.error(
        'Cannot connect to test database:',
        (connectionError as Error).message,
      );
      console.error('Please ensure the test database exists and is accessible');
      return false;
    }
    // Check if all required tables exist (updated for current schema)
    const requiredTables = [
      'users',
      'user_api_keys',
      'webhook_events',
      'email_unsubscribe_tokens',
      'user_email_preferences',
    ];

    const missingTables = [];

    const client = getTestClient();
    for (const table of requiredTables) {
      try {
        await client`SELECT 1 FROM ${client(table)} LIMIT 1`;
      } catch {
        // Use a more specific check for table existence
        try {
          await client`SELECT to_regclass(${table})`;
        } catch {
          missingTables.push(table);
        }
      }
    }

    if (missingTables.length > 0) {
      console.warn(`Missing tables: ${missingTables.join(', ')}`);
      console.warn('Running migrations...');

      // Run migrations using drizzle-kit
      // Removed unused execAsync - now creating tables directly

      try {
        // Create tables directly instead of using drizzle-kit which may hang
        console.warn('Creating tables directly...');

        // Create users table if it doesn't exist - MUST match actual schema
        await client`
          CREATE TABLE IF NOT EXISTS users (
            id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
            clerk_id text UNIQUE,
            email text NOT NULL UNIQUE,
            name text,
            image_url text,
            created_at timestamp DEFAULT now() NOT NULL,
            updated_at timestamp DEFAULT now() NOT NULL,
            billing_customer_id text UNIQUE
          )
        `;

        // Create webhook_events table if it doesn't exist
        await client`
          CREATE TABLE IF NOT EXISTS webhook_events (
            id text PRIMARY KEY,
            provider text DEFAULT 'clerk' NOT NULL,
            event_type text NOT NULL,
            processed_at timestamp DEFAULT now() NOT NULL
          )
        `;

        // Create user_api_keys table if it doesn't exist - MUST match actual schema
        await client`
          CREATE TABLE IF NOT EXISTS user_api_keys (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            provider text NOT NULL,
            public_key text,
            private_key_encrypted text NOT NULL,
            metadata jsonb DEFAULT '{}'::jsonb,
            created_at timestamp DEFAULT now() NOT NULL,
            updated_at timestamp DEFAULT now() NOT NULL,
            UNIQUE(user_id, provider)
          )
        `;

        // Create email_unsubscribe_tokens table if it doesn't exist
        await client`
          CREATE TABLE IF NOT EXISTS email_unsubscribe_tokens (
            token text PRIMARY KEY,
            user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            category text,
            created_at timestamp DEFAULT now() NOT NULL
          )
        `;

        // Create user_email_preferences table if it doesn't exist
        await client`
          CREATE TABLE IF NOT EXISTS user_email_preferences (
            user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            marketing_enabled boolean DEFAULT true NOT NULL
          )
        `;

        console.warn('Tables created successfully');
      } catch (migrationError) {
        console.error('Table creation failed:', migrationError);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Test database initialization failed:', error);
    return false;
  }
}

// Reset test database (clear all data)
export async function resetTestDatabase() {
  try {
    await initializeTestDatabase();
    await clearTestDatabase();
  } catch (error) {
    console.warn('Database reset failed:', error);
  }
}

// Helper to clear test database tables (no schema drop)
export async function clearTestDatabase() {
  // Safety check: Only clear database if we're in test environment
  if (process.env.NODE_ENV !== 'test') {
    console.warn('Refusing to clear database: NODE_ENV is not "test"');
    return;
  }

  // Additional safety: Check database name contains "test"
  const dbName = process.env.DB_NAME;
  if (dbName && !dbName.includes('test')) {
    console.warn(
      `Refusing to clear database: DB_NAME "${dbName}" does not contain "test"`,
    );
    return;
  }

  try {
    const client = getTestClient();

    // Clear in dependency order (foreign keys)
    // Child tables first, then parent tables

    // Clear webhook events (no dependencies)
    await client`DELETE FROM webhook_events`;

    // Clear user API keys (depends on users)
    await client`DELETE FROM user_api_keys`;

    // Clear email unsubscribe tokens (depends on users)
    await client`DELETE FROM email_unsubscribe_tokens`;

    // Clear user email preferences (depends on users)
    await client`DELETE FROM user_email_preferences`;

    // Core user table (delete last due to foreign key dependencies)
    await client`DELETE FROM users`;

    console.debug('Test database cleared successfully');
  } catch (error) {
    // Ignore errors if tables don't exist
    console.warn(
      'Some tables not found during cleanup, continuing...',
      error instanceof Error ? error.message : String(error),
    );
    // Try to clear just the core tables that should exist
    try {
      const client = getTestClient();
      await client`DELETE FROM user_api_keys`;
      await client`DELETE FROM users`;
    } catch {
      console.warn('Core tables not found during cleanup');
    }
  }
}

// Worker-specific test data cleanup (safer for parallel execution)
export async function clearWorkerTestData() {
  try {
    const client = getTestClient();
    const workerId = getWorkerId();
    const workerPrefix = `test-worker${workerId}-%`;

    // Clear only data created by this worker based on email patterns
    // Use simpler queries that are more reliable

    // First get worker-specific user IDs
    const workerUsers = await client`
      SELECT id FROM users WHERE email LIKE ${workerPrefix}
    `;

    if (workerUsers.length > 0) {
      const userIds = workerUsers.map(u => u.id);

      // Delete related data for these users (in correct order for foreign keys)
      for (const userId of userIds) {
        // Clear user API keys
        try {
          await client`DELETE FROM user_api_keys WHERE user_id = ${userId}`;
        } catch {
          /* Table may not exist */
        }
      }
    }

    // Clear users with worker prefix
    await client`DELETE FROM users WHERE email LIKE ${workerPrefix}`;
  } catch (error) {
    console.warn('Worker test data cleanup failed:', error);
  }
}

// Close test database connection
export async function closeTestDatabase() {
  try {
    console.warn('Closing test database connection...');
    if (testClient) {
      await testClient.end();
      testClient = null;
      testDbInstance = null;
    }
    console.warn('Test database connection closed successfully');
  } catch (error) {
    console.error('Error closing test database:', error);
  }

  // Add a small delay to ensure connections are fully closed
  await new Promise(resolve => setTimeout(resolve, 100));
}

// Test database helpers for isolation
export function withTestTransaction<T>(
  fn: (db: ReturnType<typeof getTestDb>) => Promise<T>,
): Promise<T> {
  // Use actual database transactions for test isolation
  const db = getTestDb();
  return db
    .transaction(async tx => {
      // Type assertion needed due to transaction type differences
      const result = await fn(tx as unknown as ReturnType<typeof getTestDb>);
      // Throw an error to force rollback and maintain test isolation
      throw new TestTransactionRollback(result);
    })
    .catch(error => {
      // If it's our intentional rollback, return the result
      if (error instanceof TestTransactionRollback) {
        return error.result;
      }
      // Otherwise, re-throw the actual error
      throw error;
    });
}

// Custom error class for intentional transaction rollback
class TestTransactionRollback<T = unknown> extends Error {
  constructor(public result: T) {
    super('Test transaction rollback');
    this.name = 'TestTransactionRollback';
  }
}

// Factory functions for test data
export const testFactories = {
  createUserApiKey: (
    overrides: Partial<{
      id: string;
      userId: string;
      provider: string;
      publicKey: string;
      privateKeyEncrypted: string;
      metadata: Record<string, unknown>;
    }> = {},
  ) => ({
    id: `00000000-0000-0000-0000-${Date.now().toString(16).padStart(12, '0')}`,
    userId: '00000000-0000-0000-0000-000000000001',
    provider: 'openai',
    publicKey: 'sk-test-key',
    privateKeyEncrypted: 'encrypted-test-key',
    metadata: {},
    ...overrides,
  }),
};
