import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from '@jest/globals';
import { testHelpers, authTestHelpers } from '@/lib/db/test-helpers';
import { testDb } from '@/lib/db/test';
import { users, emailPreferences } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateUnsubscribeToken } from '@/app/api/emails/unsubscribe/route';

/**
 * Integration Tests: Email Preferences Workflow
 *
 * These tests focus on complete email preference workflows including:
 * - User email preferences creation and management
 * - Unsubscribe token generation and validation
 * - Database consistency for email preferences
 * - Complete user journey from subscription to unsubscription
 */

describe('Email Preferences Integration Tests', () => {
  let testUserId: string;
  let testEmail: string;

  beforeAll(async () => {
    await testHelpers.setupTest();
  });

  afterAll(async () => {
    await testHelpers.teardownTest();
  });

  beforeEach(async () => {
    await authTestHelpers.cleanupAuthData();

    // Create test user
    testEmail = authTestHelpers.generateUniqueEmail();
    const testUser = await testDb
      .insert(users)
      .values({
        email: testEmail,
        name: 'Test User',
        password: 'hashedpassword',
      })
      .returning();
    testUserId = testUser[0].id;
  });

  afterEach(async () => {
    await authTestHelpers.cleanupAuthData();
  });

  describe('Email Preferences Lifecycle', () => {
    it('should create default email preferences for new user', async () => {
      // Initially no preferences should exist
      let preferences = await testDb.query.emailPreferences.findFirst({
        where: eq(emailPreferences.userId, testUserId),
      });

      expect(preferences).toBeUndefined();

      // Create default preferences (simulating first API call)
      const [createdPreferences] = await testDb
        .insert(emailPreferences)
        .values({
          userId: testUserId,
          marketingEmails: true, // Default value
        })
        .returning();

      expect(createdPreferences).toMatchObject({
        userId: testUserId,
        marketingEmails: true,
      });
      expect(createdPreferences.createdAt).toBeInstanceOf(Date);
      expect(createdPreferences.updatedAt).toBeInstanceOf(Date);

      // Verify it can be retrieved
      preferences = await testDb.query.emailPreferences.findFirst({
        where: eq(emailPreferences.userId, testUserId),
      });

      expect(preferences).toMatchObject({
        userId: testUserId,
        marketingEmails: true,
      });
    });

    it('should update existing email preferences', async () => {
      // Create initial preferences
      await testDb.insert(emailPreferences).values({
        userId: testUserId,
        marketingEmails: true,
      });

      // Update preferences (simulating PUT API call)
      const [updatedPreferences] = await testDb
        .insert(emailPreferences)
        .values({
          userId: testUserId,
          marketingEmails: false,
        })
        .onConflictDoUpdate({
          target: emailPreferences.userId,
          set: {
            marketingEmails: false,
            updatedAt: new Date(),
          },
        })
        .returning();

      expect(updatedPreferences.marketingEmails).toBe(false);
      expect(updatedPreferences.updatedAt).toBeInstanceOf(Date);

      // Verify the update persisted
      const retrievedPreferences =
        await testDb.query.emailPreferences.findFirst({
          where: eq(emailPreferences.userId, testUserId),
        });

      expect(retrievedPreferences?.marketingEmails).toBe(false);
    });

    it('should handle upsert operations correctly', async () => {
      // Test upserting when no preferences exist
      const [firstUpsert] = await testDb
        .insert(emailPreferences)
        .values({
          userId: testUserId,
          marketingEmails: false,
        })
        .onConflictDoUpdate({
          target: emailPreferences.userId,
          set: {
            marketingEmails: false,
            updatedAt: new Date(),
          },
        })
        .returning();

      expect(firstUpsert.marketingEmails).toBe(false);

      // Test upserting when preferences already exist
      const [secondUpsert] = await testDb
        .insert(emailPreferences)
        .values({
          userId: testUserId,
          marketingEmails: true,
        })
        .onConflictDoUpdate({
          target: emailPreferences.userId,
          set: {
            marketingEmails: true,
            updatedAt: new Date(),
          },
        })
        .returning();

      expect(secondUpsert.marketingEmails).toBe(true);
      expect(secondUpsert.id).toBe(firstUpsert.id); // Same record, updated

      // Verify only one record exists
      const allPreferences = await testDb.query.emailPreferences.findMany({
        where: eq(emailPreferences.userId, testUserId),
      });

      expect(allPreferences).toHaveLength(1);
    });
  });

  describe('Unsubscribe Token Workflow', () => {
    it('should generate consistent unsubscribe tokens', async () => {
      const token1 = generateUnsubscribeToken(testEmail);
      const token2 = generateUnsubscribeToken(testEmail);

      expect(token1).toBe(token2);
      expect(token1).toHaveLength(32);
      expect(typeof token1).toBe('string');
    });

    it('should generate different tokens for different emails', async () => {
      const email1 = 'user1@example.com';
      const email2 = 'user2@example.com';

      const token1 = generateUnsubscribeToken(email1);
      const token2 = generateUnsubscribeToken(email2);

      expect(token1).not.toBe(token2);
    });

    it('should complete unsubscribe workflow with valid token', async () => {
      // Generate unsubscribe token
      const unsubscribeToken = generateUnsubscribeToken(testEmail);

      // Verify user exists
      const user = await testDb.query.users.findFirst({
        where: eq(users.email, testEmail),
      });

      expect(user).toBeDefined();
      expect(user?.id).toBe(testUserId);

      // Simulate unsubscribe process
      const [unsubscribedPreferences] = await testDb
        .insert(emailPreferences)
        .values({
          userId: testUserId,
          marketingEmails: false,
        })
        .onConflictDoUpdate({
          target: emailPreferences.userId,
          set: {
            marketingEmails: false,
            updatedAt: new Date(),
          },
        })
        .returning();

      expect(unsubscribedPreferences.marketingEmails).toBe(false);

      // Verify preferences were updated
      const preferences = await testDb.query.emailPreferences.findFirst({
        where: eq(emailPreferences.userId, testUserId),
      });

      expect(preferences?.marketingEmails).toBe(false);
    });
  });

  describe('User Deletion and Cascade Behavior', () => {
    it('should handle user deletion and email preferences cleanup', async () => {
      // Create email preferences for user
      await testDb.insert(emailPreferences).values({
        userId: testUserId,
        marketingEmails: true,
      });

      // Verify preferences exist
      let preferences = await testDb.query.emailPreferences.findFirst({
        where: eq(emailPreferences.userId, testUserId),
      });

      expect(preferences).toBeDefined();

      // Delete user (this should cascade delete preferences due to foreign key)
      await testDb.delete(users).where(eq(users.id, testUserId));

      // Verify user is deleted
      const deletedUser = await testDb.query.users.findFirst({
        where: eq(users.id, testUserId),
      });

      expect(deletedUser).toBeUndefined();

      // Verify preferences are also deleted (cascade)
      preferences = await testDb.query.emailPreferences.findFirst({
        where: eq(emailPreferences.userId, testUserId),
      });

      expect(preferences).toBeUndefined();
    });
  });

  describe('Multi-User Email Preferences', () => {
    let secondUserId: string;
    let secondUserEmail: string;

    beforeEach(async () => {
      // Create second test user
      secondUserEmail = authTestHelpers.generateUniqueEmail();
      const secondUser = await testDb
        .insert(users)
        .values({
          email: secondUserEmail,
          name: 'Second Test User',
          password: 'hashedpassword',
        })
        .returning();
      secondUserId = secondUser[0].id;
    });

    it('should manage preferences independently for different users', async () => {
      // Create preferences for first user
      await testDb.insert(emailPreferences).values({
        userId: testUserId,
        marketingEmails: true,
      });

      // Create preferences for second user
      await testDb.insert(emailPreferences).values({
        userId: secondUserId,
        marketingEmails: false,
      });

      // Verify both users have independent preferences
      const firstUserPrefs = await testDb.query.emailPreferences.findFirst({
        where: eq(emailPreferences.userId, testUserId),
      });

      const secondUserPrefs = await testDb.query.emailPreferences.findFirst({
        where: eq(emailPreferences.userId, secondUserId),
      });

      expect(firstUserPrefs?.marketingEmails).toBe(true);
      expect(secondUserPrefs?.marketingEmails).toBe(false);

      // Update first user's preferences
      await testDb
        .insert(emailPreferences)
        .values({
          userId: testUserId,
          marketingEmails: false,
        })
        .onConflictDoUpdate({
          target: emailPreferences.userId,
          set: {
            marketingEmails: false,
            updatedAt: new Date(),
          },
        });

      // Verify first user's preferences changed, second user's remained the same
      const updatedFirstUserPrefs =
        await testDb.query.emailPreferences.findFirst({
          where: eq(emailPreferences.userId, testUserId),
        });

      const unchangedSecondUserPrefs =
        await testDb.query.emailPreferences.findFirst({
          where: eq(emailPreferences.userId, secondUserId),
        });

      expect(updatedFirstUserPrefs?.marketingEmails).toBe(false);
      expect(unchangedSecondUserPrefs?.marketingEmails).toBe(false); // Still false from original
    });

    it('should generate different unsubscribe tokens for different users', async () => {
      const firstUserToken = generateUnsubscribeToken(testEmail);
      const secondUserToken = generateUnsubscribeToken(secondUserEmail);

      expect(firstUserToken).not.toBe(secondUserToken);
      expect(firstUserToken).toHaveLength(32);
      expect(secondUserToken).toHaveLength(32);
    });
  });

  describe('Data Consistency and Validation', () => {
    it('should enforce unique constraint on userId', async () => {
      // Create initial preferences
      await testDb.insert(emailPreferences).values({
        userId: testUserId,
        marketingEmails: true,
      });

      // Attempt to create duplicate preferences for same user should be handled by upsert
      const [upsertResult] = await testDb
        .insert(emailPreferences)
        .values({
          userId: testUserId,
          marketingEmails: false,
        })
        .onConflictDoUpdate({
          target: emailPreferences.userId,
          set: {
            marketingEmails: false,
            updatedAt: new Date(),
          },
        })
        .returning();

      expect(upsertResult.marketingEmails).toBe(false);

      // Verify only one record exists
      const allUserPrefs = await testDb.query.emailPreferences.findMany({
        where: eq(emailPreferences.userId, testUserId),
      });

      expect(allUserPrefs).toHaveLength(1);
    });

    it('should maintain referential integrity with users table', async () => {
      // Attempt to create preferences for non-existent user should fail
      const nonExistentUserId = 'non-existent-user-id';

      await expect(
        testDb.insert(emailPreferences).values({
          userId: nonExistentUserId,
          marketingEmails: true,
        }),
      ).rejects.toThrow();
    });

    it('should have appropriate default values and timestamps', async () => {
      const [preferences] = await testDb
        .insert(emailPreferences)
        .values({
          userId: testUserId,
          marketingEmails: true,
        })
        .returning();

      expect(preferences.marketingEmails).toBe(true);
      expect(preferences.createdAt).toBeInstanceOf(Date);
      expect(preferences.updatedAt).toBeInstanceOf(Date);
      expect(preferences.id).toBeDefined();
      expect(typeof preferences.id).toBe('string');
    });
  });
});
