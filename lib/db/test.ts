import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Test database configuration with worker isolation
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test_user:test_pass@localhost:5433/saas_template_test'

// Get worker ID for isolation (Jest sets JEST_WORKER_ID)
const getWorkerId = () => {
  const workerId = process.env.JEST_WORKER_ID || '1'
  return workerId
}

// Create worker-specific database client
const createWorkerTestClient = () => {
  const workerId = getWorkerId()
  return postgres(TEST_DATABASE_URL, {
    max: 3, // Allow more connections per worker
    idle_timeout: 20,
    connect_timeout: 10,
    // Add worker ID to connection for debugging
    connection: {
      application_name: `test_worker_${workerId}`
    }
  })
}

// Create test database client for this worker
const testClient = createWorkerTestClient()
export const testDb = drizzle(testClient, { schema })

// Initialize test database (run migrations)
export async function initializeTestDatabase() {
  try {
    // Check if all required tables exist
    const requiredTables = [
      'users',
      'user_api_keys',
      'auth_attempts',
      'password_history',
      'user_sessions', 
      'session_activity',
      'accounts',
      'sessions',
      'verification_tokens'
    ]
    
    const missingTables = []
    
    for (const table of requiredTables) {
      try {
        await testClient`SELECT 1 FROM ${testClient(table)} LIMIT 1`
      } catch (error) {
        // Use a more specific check for table existence
        try {
          await testClient`SELECT to_regclass(${table})`
        } catch (tableCheckError) {
          missingTables.push(table)
        }
      }
    }
    
    if (missingTables.length > 0) {
      console.log(`Missing tables: ${missingTables.join(', ')}`)
      console.log('Running migrations...')
      
      // Run migrations using drizzle-kit
      const { exec } = require('child_process')
      const util = require('util')
      const execAsync = util.promisify(exec)
      
      try {
        await execAsync('npm run db:push', { 
          env: { 
            ...process.env, 
            DATABASE_URL: TEST_DATABASE_URL 
          } 
        })
        console.log('Migrations completed successfully')
      } catch (migrationError) {
        console.error('Migration failed:', migrationError)
        // Continue anyway - tests will fail if tables don't exist
      }
    }
    
    return true
  } catch (error) {
    console.error('Test database initialization failed:', error)
    return false
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
    // Clear in dependency order (foreign keys)
    // Child tables first, then parent tables
    await testClient`DELETE FROM session_activity`
    await testClient`DELETE FROM user_sessions`
    await testClient`DELETE FROM auth_attempts`
    await testClient`DELETE FROM password_history`
    await testClient`DELETE FROM accounts`
    await testClient`DELETE FROM sessions`
    await testClient`DELETE FROM verification_tokens`
    await testClient`DELETE FROM user_api_keys`
    await testClient`DELETE FROM users`
  } catch (error) {
    // Ignore errors if tables don't exist
    console.log('Some tables not found during cleanup, continuing...')
    // Try to clear just the core tables that should exist
    try {
      await testClient`DELETE FROM user_api_keys`
      await testClient`DELETE FROM users`
    } catch (coreError) {
      console.log('Core tables not found during cleanup')
    }
  }
}

// Worker-specific test data cleanup (safer for parallel execution)
export async function clearWorkerTestData() {
  try {
    const workerId = getWorkerId()
    const workerPrefix = `test-worker${workerId}-%`
    
    // Clear only data created by this worker based on email patterns
    // Use simpler queries that are more reliable
    
    // First get worker-specific user IDs
    const workerUsers = await testClient`
      SELECT id FROM users WHERE email LIKE ${workerPrefix}
    `
    
    if (workerUsers.length > 0) {
      const userIds = workerUsers.map(u => u.id)
      
      // Delete related data for these users (in correct order for foreign keys)
      for (const userId of userIds) {
        // Check which tables exist and use correct column names
        try {
          await testClient`DELETE FROM session_activity WHERE user_id = ${userId}`
        } catch (e) { /* Table may not exist */ }
        
        try {
          await testClient`DELETE FROM user_sessions WHERE user_id = ${userId}`
        } catch (e) { /* Table may not exist */ }
        
        try {
          await testClient`DELETE FROM auth_attempts WHERE user_id = ${userId}`
        } catch (e) { /* Table may not exist */ }
        
        try {
          await testClient`DELETE FROM password_history WHERE user_id = ${userId}`
        } catch (e) { /* Table may not exist */ }
        
        try {
          await testClient`DELETE FROM accounts WHERE user_id = ${userId}`
        } catch (e) { /* Table may not exist */ }
        
        try {
          await testClient`DELETE FROM sessions WHERE user_id = ${userId}`
        } catch (e) { /* Table may not exist */ }
        
        try {
          await testClient`DELETE FROM user_api_keys WHERE user_id = ${userId}`
        } catch (e) { /* Table may not exist */ }
      }
    }
    
    // Clear verification tokens and users with worker prefix
    await testClient`DELETE FROM verification_tokens WHERE identifier LIKE ${workerPrefix}`
    await testClient`DELETE FROM users WHERE email LIKE ${workerPrefix}`
    
  } catch (error) {
    console.log('Worker test data cleanup failed:', error)
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
  // Use actual database transactions for test isolation
  return await testDb.transaction(async (tx) => {
    const result = await fn(tx)
    // Throw an error to force rollback and maintain test isolation
    throw new TestTransactionRollback(result)
  }).catch((error) => {
    // If it's our intentional rollback, return the result
    if (error instanceof TestTransactionRollback) {
      return error.result
    }
    // Otherwise, re-throw the actual error
    throw error
  })
}

// Custom error class for intentional transaction rollback
class TestTransactionRollback extends Error {
  constructor(public result: any) {
    super('Test transaction rollback')
    this.name = 'TestTransactionRollback'
  }
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