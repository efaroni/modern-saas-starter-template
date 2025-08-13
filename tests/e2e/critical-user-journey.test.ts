import { clerk } from '@clerk/testing/playwright';
import { test, expect } from '@playwright/test';

import { TestUserManager } from './test-user-manager';

test.describe('Critical User Journey - Authentication Flow', () => {
  let userManager: TestUserManager;

  test.beforeAll(() => {
    userManager = new TestUserManager();
  });

  test('should complete full authentication flow with real user', async ({
    page,
  }) => {
    await userManager.withTestUser(async testUser => {
      // 1. Navigate to homepage and verify public content
      await page.goto('/');
      await expect(page.locator('h1')).toContainText(
        'Modern SaaS Starter Template',
      );
      await expect(page.locator('text=Sign Up')).toBeVisible();
      await expect(page.locator('text=Sign In')).toBeVisible();

      // 2. Verify sign-up page loads with authentication components
      await page.click('text=Sign Up');
      await expect(page).toHaveURL(/.*sign-up/);

      // Wait for Clerk component to load
      await page.waitForTimeout(2000);

      // Verify authentication form is present
      const hasAuthElements =
        (await page.locator('form').count()) > 0 &&
        (await page.locator('input').count()) > 0;
      expect(hasAuthElements).toBe(true);

      // 3. Navigate to sign-in and authenticate with real user
      await page.goto('/sign-in');
      await expect(page).toHaveURL(/.*sign-in/);

      // Wait for Clerk to load
      await page.waitForTimeout(2000);

      // Sign in using Clerk's testing helper
      try {
        console.log('Attempting to sign in user:', testUser.email);

        await clerk.signIn({
          page,
          signInParams: {
            strategy: 'password',
            identifier: testUser.email,
            password: testUser.password,
          },
        });

        console.log('Sign-in completed, current URL:', page.url());

        // 4. Instead of waiting for URL change, check if we can access protected content
        // Navigate directly to a protected route to test authentication
        await page.goto('/configuration');
        console.log('Navigated to configuration page, URL:', page.url());

        // If we're still on sign-in page, the authentication failed
        if (page.url().includes('sign-in')) {
          throw new Error('Authentication failed - still on sign-in page');
        }
      } catch (error) {
        console.error('Sign-in failed:', error);
        console.error('Current URL:', page.url());

        // Take a screenshot for debugging
        await page.screenshot({ path: 'test-results/sign-in-failure.png' });
        throw error;
      }

      // 5. Verify we can access the configuration page content
      await expect(page.locator('h1')).toContainText('API Configuration');

      // 6. Verify user session is working by checking for user-specific elements
      // The page should show the authenticated user interface - use first() to handle multiple matches
      await expect(
        page
          .locator('text=Configure your service integrations and API keys')
          .first(),
      ).toBeVisible();

      // 7. Sign out to test the full cycle
      await clerk.signOut({ page });

      // 8. Verify protected routes redirect again after sign out
      await page.goto('/configuration');
      await expect(page).toHaveURL(/.*sign-in/);

      // 9. Return to homepage - public routes should still work
      await page.goto('/');
      await expect(page.locator('h1')).toContainText(
        'Modern SaaS Starter Template',
      );
    });
  });
});
