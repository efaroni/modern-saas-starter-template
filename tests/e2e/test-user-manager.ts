import { createClerkClient } from '@clerk/backend';

import { validateE2EEnv } from '@/lib/config/env-validation';

export interface TestUser {
  id: string;
  email: string;
  password: string;
  username: string;
}

export class TestUserManager {
  private clerk;

  constructor() {
    const env = validateE2EEnv(); // This will throw if Clerk keys are missing
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY! });
  }

  /**
   * Create a test user with random credentials
   */
  async createTestUser(): Promise<TestUser> {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);

    const testUser = {
      email: `testuser-${timestamp}-${randomId}@example.com`,
      password: `TestPass123!${randomId}`,
      username: `testuser_${timestamp}_${randomId}`,
    };

    try {
      const user = await this.clerk.users.createUser({
        emailAddress: [testUser.email],
        password: testUser.password,
        username: testUser.username,
        skipPasswordChecks: true,
      });

      return {
        id: user.id,
        email: testUser.email,
        password: testUser.password,
        username: testUser.username,
      };
    } catch (error) {
      console.error('Failed to create test user:', error);
      throw error;
    }
  }

  /**
   * Delete a test user
   */
  async deleteTestUser(userId: string): Promise<void> {
    try {
      await this.clerk.users.deleteUser(userId);
    } catch (error) {
      console.error('Failed to delete test user:', error);
      // Don't throw here to avoid failing tests due to cleanup issues
      // The user might already be deleted or not exist
    }
  }

  /**
   * Create and manage test user lifecycle for a test
   */
  async withTestUser<T>(testFn: (user: TestUser) => Promise<T>): Promise<T> {
    const user = await this.createTestUser();
    try {
      return await testFn(user);
    } finally {
      await this.deleteTestUser(user.id);
    }
  }
}
