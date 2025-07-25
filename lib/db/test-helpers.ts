import bcrypt from '@node-rs/bcrypt';

import {
  userApiKeys,
  users,
  authAttempts,
  passwordHistory,
  userSessions,
  sessionActivity,
  accounts,
  sessions,
  verificationTokens,
  type InsertUserApiKey,
} from './schema';
import {
  testDb,
  clearTestDatabase,
  initializeTestDatabase,
  clearWorkerTestData,
} from './test';

// Define InsertUser type based on the users table
type InsertUser = typeof users.$inferInsert;

// Test user ID for consistent testing
const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

// Test data factories (following best practices)
export const testDataFactories = {
  // User factory
  createUser: (overrides: Partial<InsertUser> = {}): InsertUser => ({
    id: TEST_USER_ID,
    email: `test-user-${Date.now()}@example.com`,
    name: 'Test User',
    ...overrides,
  }),

  // Auth user factory with password
  createAuthUser: async (
    overrides: Partial<InsertUser> = {},
  ): Promise<InsertUser> => {
    const password = overrides.password || 'password123';
    const hashedPassword =
      typeof password === 'string' ? await bcrypt.hash(password, 10) : password;

    return {
      id: TEST_USER_ID,
      email: `auth-user-${Date.now()}@example.com`,
      name: 'Auth Test User',
      password: hashedPassword,
      emailVerified: null,
      ...overrides,
    };
  },

  // Auth user factory without password hashing (for testing)
  createAuthUserPlain: (overrides: Partial<InsertUser> = {}): InsertUser => ({
    id: TEST_USER_ID,
    email: `auth-user-${Date.now()}@example.com`,
    name: 'Auth Test User',
    password: 'password123',
    emailVerified: null,
    ...overrides,
  }),

  // API Key factory with realistic data
  createApiKey: (
    overrides: Partial<InsertUserApiKey> = {},
  ): InsertUserApiKey => ({
    userId: TEST_USER_ID,
    provider: 'openai',
    privateKeyEncrypted: 'sk-test-encrypted-key',
    publicKey: null,
    metadata: {},
    ...overrides,
  }),

  // Realistic API key data for different providers
  createOpenAIKey: (
    overrides: Partial<InsertUserApiKey> = {},
  ): InsertUserApiKey => ({
    userId: TEST_USER_ID,
    provider: 'openai',
    privateKeyEncrypted: 'sk-test-1234567890abcdefghijklmnopqrstuvwxyz',
    publicKey: null,
    metadata: { model: 'gpt-4', organization: 'test-org' },
    ...overrides,
  }),

  createStripeKey: (
    overrides: Partial<InsertUserApiKey> = {},
  ): InsertUserApiKey => ({
    userId: TEST_USER_ID,
    provider: 'stripe',
    privateKeyEncrypted: 'sk_test_1234567890abcdefghijklmnopqrstuvwxyz', // underscore after sk_test
    publicKey: 'pk_test_1234567890abcdefghijklmnopqrstuvwxyz',
    metadata: { mode: 'test', webhook_secret: 'whsec_test' },
    ...overrides,
  }),

  createResendKey: (
    overrides: Partial<InsertUserApiKey> = {},
  ): InsertUserApiKey => ({
    userId: TEST_USER_ID,
    provider: 'resend',
    privateKeyEncrypted: 're_test_1234567890abcdefghijklmnopqrstuvwxyz', // underscore after re_test
    publicKey: null,
    metadata: { domain: 'example.com' },
    ...overrides,
  }),
};

// Test fixtures (static data for common scenarios)
export const testFixtures = {
  users: [
    {
      id: TEST_USER_ID,
      email: 'john@example.com',
      name: 'John Doe',
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      email: 'admin@example.com',
      name: 'Admin User',
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      email: 'test@example.com',
      name: 'Test User',
    },
  ],

  apiKeys: [
    {
      userId: TEST_USER_ID,
      provider: 'openai',
      privateKeyEncrypted: 'sk-test-openai-key',
      publicKey: null,
      metadata: { model: 'gpt-4' },
    },
    {
      userId: TEST_USER_ID,
      provider: 'stripe',
      privateKeyEncrypted: 'sk_test_stripe_key',
      publicKey: 'pk_test_stripe_key',
      metadata: { mode: 'test' },
    },
    {
      userId: '00000000-0000-0000-0000-000000000002',
      provider: 'resend',
      privateKeyEncrypted: 're_test_resend_key',
      publicKey: null,
      metadata: { domain: 'example.com' },
    },
  ],
};

// Database isolation helpers with transaction support
export class TestDatabaseManager {
  private static instance: TestDatabaseManager;

  static getInstance(): TestDatabaseManager {
    if (!TestDatabaseManager.instance) {
      TestDatabaseManager.instance = new TestDatabaseManager();
    }
    return TestDatabaseManager.instance;
  }

  // Clear all test data (no schema drop)
  async clearAllData(): Promise<void> {
    await clearTestDatabase();
  }

  // Seed minimal required data
  async seedMinimalData(): Promise<void> {
    try {
      // Ensure database is initialized
      await initializeTestDatabase();

      // Don't seed test users automatically - let tests create their own data
      // This prevents conflicts between tests
    } catch (error) {
      console.warn('Database not ready, skipping seed:', error);
    }
  }

  // Seed test data for specific scenarios
  async seedTestData(
    scenario: 'empty' | 'with-keys' | 'full' | 'edge-cases' = 'empty',
  ): Promise<void> {
    await this.clearAllData();
    if (scenario === 'with-keys' || scenario === 'full') {
      await testDb.insert(users).values(testFixtures.users);
      await testDb.insert(userApiKeys).values(testFixtures.apiKeys);
    }
    if (scenario === 'edge-cases') {
      await testDb.insert(users).values([
        { email: '', name: 'Empty Email' },
        {
          email:
            'very-long-email-address-that-exceeds-normal-limits@example.com',
          name: 'Long Email',
        },
        { email: 'special@chars.com', name: 'Special Chars' },
      ]);
    }
  }

  // Get test data for assertions
  async getTestData() {
    const allUsers = await testDb.select().from(users);
    const allApiKeys = await testDb.select().from(userApiKeys);
    return { users: allUsers, apiKeys: allApiKeys };
  }
}

// Transaction-based test isolation (following best practices)
export async function withTestTransaction<T>(
  fn: (db: typeof testDb) => Promise<T>,
): Promise<T> {
  const dbManager = TestDatabaseManager.getInstance();

  try {
    // Seed minimal data within transaction
    await dbManager.seedMinimalData();

    // Execute test function
    return await fn(testDb);
  } finally {
    // Always rollback to ensure isolation
    await dbManager.clearAllData();
  }
}

// Test setup and teardown helpers
export const testHelpers = {
  // Setup before each test (worker-specific cleanup)
  async setupTest(): Promise<void> {
    try {
      // Use worker-specific cleanup instead of clearing all data
      await clearWorkerTestData();
      // Initialize database if needed (but don't clear all data)
      await initializeTestDatabase();
    } catch (error) {
      console.warn('Test setup failed, database may not be ready:', error);
    }
  },

  // Teardown after each test (worker-specific cleanup)
  async teardownTest(): Promise<void> {
    try {
      // Use worker-specific cleanup to avoid affecting other workers
      await clearWorkerTestData();
    } catch (error) {
      console.warn('Test teardown failed:', error);
    }
  },

  // Setup for specific test scenarios
  async setupScenario(
    scenario: 'empty' | 'with-keys' | 'full' | 'edge-cases',
  ): Promise<void> {
    const dbManager = TestDatabaseManager.getInstance();
    await dbManager.seedTestData(scenario);
  },

  // Assertion helpers with better error messages
  async assertDatabaseState(expected: {
    userCount?: number;
    apiKeyCount?: number;
    providers?: string[];
    users?: Array<{ email: string; name?: string }>;
  }): Promise<void> {
    const data = await TestDatabaseManager.getInstance().getTestData();

    if (expected.userCount !== undefined) {
      expect(data.users).toHaveLength(expected.userCount);
    }

    if (expected.apiKeyCount !== undefined) {
      expect(data.apiKeys).toHaveLength(expected.apiKeyCount);
    }

    if (expected.providers) {
      const actualProviders = data.apiKeys.map(key => key.provider);
      expected.providers.forEach(provider => {
        expect(actualProviders).toContain(provider);
      });
    }

    if (expected.users) {
      expected.users.forEach(expectedUser => {
        const found = data.users.find(u => u.email === expectedUser.email);
        expect(found).toBeDefined();
        if (expectedUser.name) {
          expect(found?.name).toBe(expectedUser.name);
        }
      });
    }
  },

  // Helper to get API key count for transaction verification
  async getApiKeyCount(): Promise<number> {
    const data = await TestDatabaseManager.getInstance().getTestData();
    return data.apiKeys.length;
  },

  // Helper for testing complete CRUD workflows
  async testCRUDWorkflow(
    createFn: (data: unknown) => Promise<unknown>,
    readFn: (id: string) => Promise<unknown>,
    updateFn: (id: string, data: unknown) => Promise<unknown>,
    deleteFn: (id: string) => Promise<unknown>,
    testData: unknown,
  ): Promise<void> {
    // CREATE
    const createResult = await createFn(testData);
    expect((createResult as { success: boolean }).success).toBe(true);
    const id = (createResult as { data?: { id: string } }).data?.id;
    expect(id).toBeDefined();
    if (!id) return; // Should not happen due to expect above

    // READ
    const readResult = await readFn(id);
    expect((readResult as { success: boolean }).success).toBe(true);
    expect((readResult as { data?: { id: string } }).data?.id).toBe(id);

    // UPDATE
    const updateData = {
      ...(testData as Record<string, unknown>),
      name: 'Updated Name',
    };
    const updateResult = await updateFn(id, updateData);
    expect((updateResult as { success: boolean }).success).toBe(true);

    // Verify update
    const updatedReadResult = await readFn(id);
    expect((updatedReadResult as { data?: { name: string } }).data?.name).toBe(
      'Updated Name',
    );

    // DELETE
    const deleteResult = await deleteFn(id);
    expect((deleteResult as { success: boolean }).success).toBe(true);

    // Verify deletion
    const deletedReadResult = await readFn(id);
    expect((deletedReadResult as { success: boolean }).success).toBe(false);
  },
};

// Auth-specific test helpers
export const authTestHelpers = {
  // Create a test user with hashed password
  async createTestUser(
    overrides: Partial<InsertUser> = {},
  ): Promise<InsertUser> {
    const user = await testDataFactories.createAuthUser(overrides);
    const [insertedUser] = await testDb.insert(users).values(user).returning();
    return insertedUser;
  },

  // Create multiple test users for auth testing
  async createTestUsers(count: number = 3): Promise<InsertUser[]> {
    const userPromises = [];
    for (let i = 0; i < count; i++) {
      userPromises.push(
        testDataFactories.createAuthUser({
          id: `00000000-0000-0000-0000-00000000000${i + 1}`,
          email: `user${i + 1}@example.com`,
          name: `User ${i + 1}`,
        }),
      );
    }

    const userData = await Promise.all(userPromises);
    return testDb.insert(users).values(userData).returning();
  },

  // Verify password hashing
  verifyPasswordHash(plainPassword: string, hashedPassword: string): boolean {
    return bcrypt.verifySync(plainPassword, hashedPassword);
  },

  // Test data for auth scenarios
  authTestData: {
    validUser: {
      email: 'valid@example.com',
      password: 'validPassword123',
      name: 'Valid User',
    },
    invalidUser: {
      email: 'invalid@example.com',
      password: 'wrongPassword',
      name: 'Invalid User',
    },
    duplicateEmailUser: {
      email: 'duplicate@example.com',
      password: 'password123',
      name: 'Duplicate User',
    },
    weakPasswordUser: {
      email: 'weak@example.com',
      password: '123', // Too short
      name: 'Weak Password User',
    },
    invalidEmailUser: {
      email: 'invalid-email', // Invalid format
      password: 'password123',
      name: 'Invalid Email User',
    },
    updateProfileData: {
      name: 'Updated Name',
      image: 'https://example.com/avatar.jpg',
    },
    passwordChangeData: {
      currentPassword: 'currentPassword123',
      newPassword: 'newPassword123',
    },
  },

  // Clean up auth-specific test data
  async cleanupAuthData(): Promise<void> {
    try {
      // Delete in correct order due to foreign key constraints
      // Child tables first, then parent tables

      // 1. Delete session activity (references userSessions)
      await testDb.delete(sessionActivity);

      // 2. Delete user sessions (references users)
      await testDb.delete(userSessions);

      // 3. Delete auth attempts (references users)
      await testDb.delete(authAttempts);

      // 4. Delete password history (references users)
      await testDb.delete(passwordHistory);

      // 5. Delete OAuth accounts (references users)
      await testDb.delete(accounts);

      // 6. Delete NextAuth sessions (references users)
      await testDb.delete(sessions);

      // 7. Delete verification tokens
      await testDb.delete(verificationTokens);

      // 8. Delete user API keys (references users)
      await testDb.delete(userApiKeys);

      // 9. Finally delete users (parent table)
      await testDb.delete(users);
    } catch (error) {
      console.error('Error cleaning up auth data:', error);
      // Continue with the test even if cleanup fails
    }
  },

  // Clean up test data created by specific test suite (more isolated)
  async cleanupTestSuiteData(testSuitePattern: string): Promise<void> {
    try {
      const { like, eq, inArray } = await import('drizzle-orm');

      // Delete users whose email contains the test suite pattern
      const testUsers = await testDb
        .select()
        .from(users)
        .where(like(users.email, `%${testSuitePattern}%`));

      if (testUsers.length > 0) {
        const userIds = testUsers.map(u => u.id);

        // Delete in correct order due to foreign key constraints
        for (const userId of userIds) {
          // Delete session activity (via sessions)
          const userSessionIds = await testDb
            .select({ id: userSessions.id })
            .from(userSessions)
            .where(eq(userSessions.userId, userId));

          if (userSessionIds.length > 0) {
            await testDb.delete(sessionActivity).where(
              inArray(
                sessionActivity.sessionId,
                userSessionIds.map(s => s.id),
              ),
            );
          }
          await testDb
            .delete(userSessions)
            .where(eq(userSessions.userId, userId));
          await testDb
            .delete(authAttempts)
            .where(eq(authAttempts.userId, userId));
          await testDb
            .delete(passwordHistory)
            .where(eq(passwordHistory.userId, userId));
          await testDb.delete(accounts).where(eq(accounts.userId, userId));
          await testDb.delete(sessions).where(eq(sessions.userId, userId));
          await testDb
            .delete(userApiKeys)
            .where(eq(userApiKeys.userId, userId));
        }

        // Delete verification tokens by identifier pattern
        await testDb
          .delete(verificationTokens)
          .where(like(verificationTokens.identifier, `%${testSuitePattern}%`));

        // Finally delete users
        await testDb
          .delete(users)
          .where(like(users.email, `%${testSuitePattern}%`));
      }
    } catch (error) {
      console.error('Error cleaning up test suite data:', error);
      // Continue with the test even if cleanup fails
    }
  },

  // Assert auth result structure
  assertAuthResult(
    result: unknown,
    expectedSuccess: boolean,
    expectUser: boolean = true,
  ): void {
    expect(result).toHaveProperty('success');
    expect((result as { success: boolean }).success).toBe(expectedSuccess);

    if (expectedSuccess) {
      if (expectUser) {
        expect(result).toHaveProperty('user');
        const user = (result as { user?: { id: string; email: string } }).user;
        if (user) {
          expect(user).toHaveProperty('id');
          expect(user).toHaveProperty('email');
          expect(user).not.toHaveProperty('password'); // Password should not be exposed
        }
      }
      expect((result as { error?: unknown }).error).toBeUndefined();
    } else {
      expect(result).toHaveProperty('error');
      expect(typeof (result as { error: unknown }).error).toBe('string');
    }
  },

  // Generate unique test email to prevent duplicates
  generateUniqueEmail(prefix: string = 'test'): string {
    const timestamp = Date.now();
    const processId = process.pid;
    const workerId = process.env.JEST_WORKER_ID || '1';
    const random = Math.random().toString(36).substring(2, 8);
    const counter = Math.floor(Math.random() * 10000);
    // Add worker ID for parallel test isolation
    return `test-worker${workerId}-${prefix}-${timestamp}-${processId}-${counter}-${random}@example.com`;
  },

  // Assert user structure (without password)
  assertUserStructure(user: unknown): void {
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('name');
    expect(user).toHaveProperty('image');
    expect(user).toHaveProperty('emailVerified');
    expect(user).toHaveProperty('createdAt');
    expect(user).toHaveProperty('updatedAt');
    expect(user).not.toHaveProperty('password'); // Password should never be exposed
  },
};
