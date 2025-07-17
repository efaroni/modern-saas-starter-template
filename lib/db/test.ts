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