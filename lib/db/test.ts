import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Test database configuration
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test_user:test_pass@localhost:5433/saas_template_test'

// Create test database client
const testClient = postgres(TEST_DATABASE_URL, {
  max: 1, // Single connection for tests
  idle_timeout: 20,
  connect_timeout: 10
})

export const testDb = drizzle(testClient, { schema })

// Initialize test database (run migrations)
export async function initializeTestDatabase() {
  try {
    // Check if tables exist by querying them
    await testClient`SELECT 1 FROM users LIMIT 1`
    await testClient`SELECT 1 FROM user_api_keys LIMIT 1`
    return true
  } catch (error) {
    // Tables don't exist, we need to run migrations
    console.log('Test database tables not found, running migrations...')
    // In a real setup, you'd run migrations here
    // For now, we'll assume migrations are run manually
    throw new Error('Test database not initialized. Please run: npm run setup:test-db')
  }
}

// Reset test database (clear all data)
export async function resetTestDatabase() {
  try {
    await initializeTestDatabase()
    await clearTestDatabase()
  } catch (error) {
    console.log('Database reset failed:', error)
  }
}

// Helper to clear test database tables (no schema drop)
export async function clearTestDatabase() {
  try {
    await testClient`DELETE FROM user_api_keys`
    await testClient`DELETE FROM users`
  } catch (error) {
    // Ignore errors if tables don't exist
    console.log('Tables not found during cleanup, continuing...')
  }
}

// Close test database connection
export async function closeTestDatabase() {
  try {
    await testClient.end()
  } catch (error) {
    console.log('Error closing test database:', error)
  }
}

// Test database helpers for isolation
export async function withTestTransaction<T>(fn: (db: any) => Promise<T>): Promise<T> {
  // For now, we'll use the regular test database
  // In a more sophisticated setup, we'd use actual transactions
  return await fn(testDb)
}

// Factory functions for test data
export const testFactories = {
  createUserApiKey: (overrides: Partial<{
    id: string
    userId: string
    provider: string
    publicKey: string
    privateKeyEncrypted: string
    metadata: Record<string, any>
  }> = {}) => ({
    id: `00000000-0000-0000-0000-${Date.now().toString(16).padStart(12, '0')}`,
    userId: '00000000-0000-0000-0000-000000000001',
    provider: 'openai',
    publicKey: 'sk-test-key',
    privateKeyEncrypted: 'encrypted-test-key',
    metadata: {},
    ...overrides
  })
} 