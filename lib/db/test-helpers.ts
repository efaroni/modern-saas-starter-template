import { testDb, testFactories, clearTestDatabase, initializeTestDatabase } from './test'
import { userApiKeys, users, authAttempts, passwordHistory, userSessions, sessionActivity, accounts, sessions, verificationTokens } from './schema'
import type { InsertUserApiKey } from './schema'
import bcrypt from '@node-rs/bcrypt'

// Define InsertUser type based on the users table
type InsertUser = typeof users.$inferInsert

// Test user ID for consistent testing
const TEST_USER_ID = '00000000-0000-0000-0000-000000000001'

// Test data factories (following best practices)
export const testDataFactories = {
  // User factory
  createUser: (overrides: Partial<InsertUser> = {}): InsertUser => ({
    id: TEST_USER_ID,
    email: `test-user-${Date.now()}@example.com`,
    name: 'Test User',
    ...overrides
  }),

  // Auth user factory with password
  createAuthUser: async (overrides: Partial<InsertUser> = {}): Promise<InsertUser> => {
    const password = overrides.password || 'password123'
    const hashedPassword = typeof password === 'string' ? await bcrypt.hash(password, 10) : password
    
    return {
      id: TEST_USER_ID,
      email: `auth-user-${Date.now()}@example.com`,
      name: 'Auth Test User',
      password: hashedPassword,
      emailVerified: null,
      ...overrides
    }
  },

  // Auth user factory without password hashing (for testing)
  createAuthUserPlain: (overrides: Partial<InsertUser> = {}): InsertUser => ({
    id: TEST_USER_ID,
    email: `auth-user-${Date.now()}@example.com`,
    name: 'Auth Test User',
    password: 'password123',
    emailVerified: null,
    ...overrides
  }),

  // API Key factory with realistic data
  createApiKey: (overrides: Partial<InsertUserApiKey> = {}): InsertUserApiKey => ({
    userId: TEST_USER_ID,
    provider: 'openai',
    privateKeyEncrypted: 'sk-test-encrypted-key',
    publicKey: null,
    metadata: {},
    ...overrides
  }),

  // Realistic API key data for different providers
  createOpenAIKey: (overrides: Partial<InsertUserApiKey> = {}): InsertUserApiKey => ({
    userId: TEST_USER_ID,
    provider: 'openai',
    privateKeyEncrypted: 'sk-test-1234567890abcdefghijklmnopqrstuvwxyz',
    publicKey: null,
    metadata: { model: 'gpt-4', organization: 'test-org' },
    ...overrides
  }),

  createStripeKey: (overrides: Partial<InsertUserApiKey> = {}): InsertUserApiKey => ({
    userId: TEST_USER_ID,
    provider: 'stripe',
    privateKeyEncrypted: 'sk_test_1234567890abcdefghijklmnopqrstuvwxyz', // underscore after sk_test
    publicKey: 'pk_test_1234567890abcdefghijklmnopqrstuvwxyz',
    metadata: { mode: 'test', webhook_secret: 'whsec_test' },
    ...overrides
  }),

  createResendKey: (overrides: Partial<InsertUserApiKey> = {}): InsertUserApiKey => ({
    userId: TEST_USER_ID,
    provider: 'resend',
    privateKeyEncrypted: 're_test_1234567890abcdefghijklmnopqrstuvwxyz', // underscore after re_test
    publicKey: null,
    metadata: { domain: 'example.com' },
    ...overrides
  })
}

// Test fixtures (static data for common scenarios)
export const testFixtures = {
  users: [
    {
      id: TEST_USER_ID,
      email: 'john@example.com',
      name: 'John Doe'
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      email: 'admin@example.com',
      name: 'Admin User'
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      email: 'test@example.com',
      name: 'Test User'
    }
  ],

  apiKeys: [
    {
      userId: TEST_USER_ID,
      provider: 'openai',
      privateKeyEncrypted: 'sk-test-openai-key',
      publicKey: null,
      metadata: { model: 'gpt-4' }
    },
    {
      userId: TEST_USER_ID,
      provider: 'stripe',
      privateKeyEncrypted: 'sk_test_stripe_key',
      publicKey: 'pk_test_stripe_key',
      metadata: { mode: 'test' }
    },
    {
      userId: '00000000-0000-0000-0000-000000000002',
      provider: 'resend',
      privateKeyEncrypted: 're_test_resend_key',
      publicKey: null,
      metadata: { domain: 'example.com' }
    }
  ]
}

// Database isolation helpers with transaction support
export class TestDatabaseManager {
  private static instance: TestDatabaseManager

  static getInstance(): TestDatabaseManager {
    if (!TestDatabaseManager.instance) {
      TestDatabaseManager.instance = new TestDatabaseManager()
    }
    return TestDatabaseManager.instance
  }

  // Clear all test data (no schema drop)
  async clearAllData(): Promise<void> {
    await clearTestDatabase()
  }

  // Seed minimal required data
  async seedMinimalData(): Promise<void> {
    try {
      // Ensure database is initialized
      await initializeTestDatabase()
      
      // Don't seed test users automatically - let tests create their own data
      // This prevents conflicts between tests
    } catch (error) {
      console.log('Database not ready, skipping seed:', error)
    }
  }

  // Seed test data for specific scenarios
  async seedTestData(scenario: 'empty' | 'with-keys' | 'full' | 'edge-cases' = 'empty'): Promise<void> {
    await this.clearAllData()
    if (scenario === 'with-keys' || scenario === 'full') {
      await testDb.insert(users).values(testFixtures.users)
      await testDb.insert(userApiKeys).values(testFixtures.apiKeys)
    }
    if (scenario === 'edge-cases') {
      await testDb.insert(users).values([
        { email: '', name: 'Empty Email' },
        { email: 'very-long-email-address-that-exceeds-normal-limits@example.com', name: 'Long Email' },
        { email: 'special@chars.com', name: 'Special Chars' }
      ])
    }
  }

  // Get test data for assertions
  async getTestData() {
    const allUsers = await testDb.select().from(users)
    const allApiKeys = await testDb.select().from(userApiKeys)
    return { users: allUsers, apiKeys: allApiKeys }
  }
}

// Transaction-based test isolation (following best practices)
export async function withTestTransaction<T>(
  fn: (db: typeof testDb) => Promise<T>
): Promise<T> {
  const dbManager = TestDatabaseManager.getInstance()
  
  try {
    // Seed minimal data within transaction
    await dbManager.seedMinimalData()
    
    // Execute test function
    return await fn(testDb)
  } finally {
    // Always rollback to ensure isolation
    await dbManager.clearAllData()
  }
}

// Test setup and teardown helpers
export const testHelpers = {
  // Setup before each test (truncate tables, seed minimal data)
  async setupTest(): Promise<void> {
    const dbManager = TestDatabaseManager.getInstance()
    try {
      await dbManager.clearAllData()
      await dbManager.seedMinimalData()
    } catch (error) {
      console.log('Test setup failed, database may not be ready:', error)
    }
  },

  // Teardown after each test (truncate tables)
  async teardownTest(): Promise<void> {
    const dbManager = TestDatabaseManager.getInstance()
    await dbManager.clearAllData()
  },

  // Setup for specific test scenarios
  async setupScenario(scenario: 'empty' | 'with-keys' | 'full' | 'edge-cases'): Promise<void> {
    const dbManager = TestDatabaseManager.getInstance()
    await dbManager.seedTestData(scenario)
  },

  // Assertion helpers with better error messages
  async assertDatabaseState(expected: {
    userCount?: number
    apiKeyCount?: number
    providers?: string[]
    users?: Array<{ email: string; name?: string }>
  }): Promise<void> {
    const data = await TestDatabaseManager.getInstance().getTestData()
    
    if (expected.userCount !== undefined) {
      expect(data.users).toHaveLength(expected.userCount)
    }
    
    if (expected.apiKeyCount !== undefined) {
      expect(data.apiKeys).toHaveLength(expected.apiKeyCount)
    }
    
    if (expected.providers) {
      const actualProviders = data.apiKeys.map(key => key.provider)
      expected.providers.forEach(provider => {
        expect(actualProviders).toContain(provider)
      })
    }

    if (expected.users) {
      expected.users.forEach(expectedUser => {
        const found = data.users.find(u => u.email === expectedUser.email)
        expect(found).toBeDefined()
        if (expectedUser.name) {
          expect(found?.name).toBe(expectedUser.name)
        }
      })
    }
  },

  // Helper to get API key count for transaction verification
  async getApiKeyCount(): Promise<number> {
    const data = await TestDatabaseManager.getInstance().getTestData()
    return data.apiKeys.length
  },

  // Helper for testing complete CRUD workflows
  async testCRUDWorkflow<T>(
    createFn: (data: any) => Promise<any>,
    readFn: (id: string) => Promise<any>,
    updateFn: (id: string, data: any) => Promise<any>,
    deleteFn: (id: string) => Promise<any>,
    testData: any
  ): Promise<void> {
    // CREATE
    const createResult = await createFn(testData)
    expect(createResult.success).toBe(true)
    const id = createResult.data?.id
    expect(id).toBeDefined()

    // READ
    const readResult = await readFn(id)
    expect(readResult.success).toBe(true)
    expect(readResult.data?.id).toBe(id)

    // UPDATE
    const updateData = { ...testData, name: 'Updated Name' }
    const updateResult = await updateFn(id, updateData)
    expect(updateResult.success).toBe(true)

    // Verify update
    const updatedReadResult = await readFn(id)
    expect(updatedReadResult.data?.name).toBe('Updated Name')

    // DELETE
    const deleteResult = await deleteFn(id)
    expect(deleteResult.success).toBe(true)

    // Verify deletion
    const deletedReadResult = await readFn(id)
    expect(deletedReadResult.success).toBe(false)
  }
}

// Auth-specific test helpers
export const authTestHelpers = {
  // Create a test user with hashed password
  async createTestUser(overrides: Partial<InsertUser> = {}): Promise<InsertUser> {
    const user = await testDataFactories.createAuthUser(overrides)
    const [insertedUser] = await testDb.insert(users).values(user).returning()
    return insertedUser
  },

  // Create multiple test users for auth testing
  async createTestUsers(count: number = 3): Promise<InsertUser[]> {
    const userPromises = []
    for (let i = 0; i < count; i++) {
      userPromises.push(testDataFactories.createAuthUser({
        id: `00000000-0000-0000-0000-00000000000${i + 1}`,
        email: `user${i + 1}@example.com`,
        name: `User ${i + 1}`
      }))
    }
    
    const users = await Promise.all(userPromises)
    return await testDb.insert(users).values(users).returning()
  },

  // Verify password hashing
  async verifyPasswordHash(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.verify(plainPassword, hashedPassword)
  },

  // Test data for auth scenarios
  authTestData: {
    validUser: {
      email: 'valid@example.com',
      password: 'validPassword123',
      name: 'Valid User'
    },
    invalidUser: {
      email: 'invalid@example.com',
      password: 'wrongPassword',
      name: 'Invalid User'
    },
    duplicateEmailUser: {
      email: 'duplicate@example.com',
      password: 'password123',
      name: 'Duplicate User'
    },
    weakPasswordUser: {
      email: 'weak@example.com',
      password: '123', // Too short
      name: 'Weak Password User'
    },
    invalidEmailUser: {
      email: 'invalid-email', // Invalid format
      password: 'password123',
      name: 'Invalid Email User'
    },
    updateProfileData: {
      name: 'Updated Name',
      image: 'https://example.com/avatar.jpg'
    },
    passwordChangeData: {
      currentPassword: 'currentPassword123',
      newPassword: 'newPassword123'
    }
  },

  // Clean up auth-specific test data
  async cleanupAuthData(): Promise<void> {
    try {
      // Delete in correct order due to foreign key constraints
      // Child tables first, then parent tables
      
      // 1. Delete session activity (references userSessions)
      await testDb.delete(sessionActivity)
      
      // 2. Delete user sessions (references users)
      await testDb.delete(userSessions)
      
      // 3. Delete auth attempts (references users)
      await testDb.delete(authAttempts)
      
      // 4. Delete password history (references users)
      await testDb.delete(passwordHistory)
      
      // 5. Delete OAuth accounts (references users)
      await testDb.delete(accounts)
      
      // 6. Delete NextAuth sessions (references users)
      await testDb.delete(sessions)
      
      // 7. Delete verification tokens
      await testDb.delete(verificationTokens)
      
      // 8. Delete user API keys (references users)
      await testDb.delete(userApiKeys)
      
      // 9. Finally delete users (parent table)
      await testDb.delete(users)
    } catch (error) {
      console.error('Error cleaning up auth data:', error)
      // Continue with the test even if cleanup fails
    }
  },

  // Assert auth result structure
  assertAuthResult(result: any, expectedSuccess: boolean, expectUser: boolean = true): void {
    expect(result).toHaveProperty('success')
    expect(result.success).toBe(expectedSuccess)
    
    if (expectedSuccess) {
      if (expectUser) {
        expect(result).toHaveProperty('user')
        if (result.user) {
          expect(result.user).toHaveProperty('id')
          expect(result.user).toHaveProperty('email')
          expect(result.user).not.toHaveProperty('password') // Password should not be exposed
        }
      }
      expect(result.error).toBeUndefined()
    } else {
      expect(result).toHaveProperty('error')
      expect(typeof result.error).toBe('string')
    }
  },

  // Generate unique test email to prevent duplicates
  generateUniqueEmail(prefix: string = 'test'): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    return `${prefix}-${timestamp}-${random}@example.com`
  },

  // Create test user with unique email
  async createTestUser(overrides: Partial<InsertUser> = {}): Promise<any> {
    const uniqueEmail = this.generateUniqueEmail()
    const hashedPassword = await bcrypt.hash('password123', 10)
    
    const userData = {
      email: uniqueEmail,
      name: 'Test User',
      password: hashedPassword,
      ...overrides
    }

    const [user] = await testDb.insert(users).values(userData).returning()
    return user
  },

  // Assert user structure (without password)
  assertUserStructure(user: any): void {
    expect(user).toHaveProperty('id')
    expect(user).toHaveProperty('email')
    expect(user).toHaveProperty('name')
    expect(user).toHaveProperty('image')
    expect(user).toHaveProperty('emailVerified')
    expect(user).toHaveProperty('createdAt')
    expect(user).toHaveProperty('updatedAt')
    expect(user).not.toHaveProperty('password') // Password should never be exposed
  }
} 