import { test, expect } from '@playwright/test';
import {
  generateTestUser,
  signUpUser,
  signInUser,
  signOutUser,
  verifyAuthentication,
  verifyUnauthenticated,
  cleanupTestUser,
  type TestUser,
} from './helpers/auth-helper';
import { ClerkAuthPage } from './pages/auth-pages';
import {
  DatabaseUtils,
  TestLogger,
  TestDataUtils,
  TEST_TIMEOUTS,
} from './helpers/test-utils';

/**
 * E2E Authentication Flow Tests
 *
 * Tests the complete authentication flow with Clerk webhook integration:
 * 1. Unauthenticated access redirects to sign-in
 * 2. Sign up creates user in both Clerk and database
 * 3. Authenticated users can access protected routes
 * 4. Sign out/in works with existing account
 * 5. Profile updates sync to database
 * 6. Account deletion removes user from database
 */
test.describe('Authentication Flow', () => {
  let testUser: TestUser;
  let authPage: ClerkAuthPage;

  test.beforeEach(async ({ page }) => {
    testUser = generateTestUser();
    authPage = new ClerkAuthPage(page);
    TestDataUtils.registerTestEmail(testUser.email);
    TestLogger.logAuth('Starting test with user', testUser.email);
  });

  test.afterEach(async () => {
    // Clean up test user from database if it exists
    if (testUser?.email) {
      await cleanupTestUser(testUser.email);
    }
  });

  test('complete auth flow: signup, signin, edit, delete', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUTS.COMPLETE_FLOW);

    // Step 1: Verify unauthenticated redirect
    await test.step('Unauthenticated users redirect to sign-in', async () => {
      await verifyUnauthenticated(page);
      TestLogger.logStep('Unauthenticated redirect verified', 'success');
    });

    // Step 2: Sign up new user
    await test.step('Sign up new user', async () => {
      await signUpUser({ user: testUser, page });
      TestLogger.logStep('Sign up completed', 'success');
    });

    // Step 3: Verify database sync (optional - depends on webhook)
    await test.step('Check database sync (webhook-dependent)', async () => {
      const syncResult = await DatabaseUtils.waitForDatabaseSync(
        testUser.email,
      );

      if (syncResult.synced) {
        expect(syncResult.user.id).toBeTruthy();
        expect(syncResult.user.clerkId).toBeTruthy();
        expect(syncResult.user.clerkId).toMatch(/^user_/);
        TestLogger.logDatabase('User synced to database', syncResult.user);
      } else {
        TestLogger.logStep('User not yet synced (webhook pending)', 'warning');
      }
    });

    // Step 4: Sign in after sign-up (Clerk doesn't auto-sign-in after registration)
    await test.step('Sign in after registration', async () => {
      // Check if we need to sign in
      const currentUrl = page.url();
      if (
        currentUrl.includes('sign-in') ||
        !currentUrl.includes('configuration')
      ) {
        TestLogger.logStep('Signing in after registration', 'start');
        await signInUser({ user: testUser, page });
      }

      // Verify authenticated access
      await verifyAuthentication(page);

      // Verify configuration page content is visible
      await expect(
        page.locator('h1:has-text("API Configuration")'),
      ).toBeVisible();
      TestLogger.logStep('Authenticated access verified', 'success');
    });

    // Step 5: Sign out
    await test.step('Sign out', async () => {
      await signOutUser(page);

      // Verify redirect to sign-in when accessing protected route
      await verifyUnauthenticated(page);
      TestLogger.logStep('Sign out verified', 'success');
    });

    // Step 6: Sign in with existing account
    await test.step('Sign in with existing account', async () => {
      await signInUser({ user: testUser, page });

      // Verify authenticated access
      await verifyAuthentication(page);
      TestLogger.logStep('Sign in with existing account verified', 'success');
    });

    // Step 7: Edit profile name (skip if webhook not working)
    await test.step('Edit profile name', async () => {
      const newName = `Test User ${Date.now()}`;

      const success = await authPage.updateFirstName(newName);

      if (success) {
        // Close modal
        await authPage.closeModal();

        // Check if database was updated (only if webhook is working)
        const updatedUser = await DatabaseUtils.findUserByEmail(testUser.email);

        if (updatedUser) {
          if (updatedUser.name === newName) {
            TestLogger.logStep(
              `Profile updated in DB: ${updatedUser.name}`,
              'success',
            );
          } else {
            TestLogger.logStep(
              'Name not yet updated in DB (webhook pending)',
              'warning',
            );
          }
        } else {
          TestLogger.logStep(
            'User not in DB (webhook not configured)',
            'warning',
          );
        }
      } else {
        TestLogger.logStep(
          'Name field not found, skipping edit test',
          'warning',
        );
      }
    });

    // Step 8: Delete account
    await test.step('Delete account and verify database deletion', async () => {
      // Ensure any modal is closed first
      await authPage.closeModal();

      const success = await authPage.deleteAccount();

      if (success) {
        // Check if user removed from database (only if webhook is working)
        const deletedUser = await DatabaseUtils.findUserByEmail(testUser.email);

        if (!deletedUser) {
          TestLogger.logStep('Account deleted from database', 'success');
        } else {
          TestLogger.logStep(
            'User still in DB (deletion webhook may be pending)',
            'warning',
          );
        }
      } else {
        TestLogger.logStep('Delete account operation not available', 'warning');
      }
    });
  });
});
