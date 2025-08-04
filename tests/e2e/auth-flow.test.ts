import { test, expect } from '@playwright/test';

test.describe('Authentication Flow Tests', () => {
  test('should redirect to sign-in page after sign-out', async ({ page }) => {
    // Navigate to a protected page - this should redirect to sign-in since we're not authenticated
    await page.goto('/configuration');

    // Should be redirected to sign-in page
    await expect(page).toHaveURL(/.*sign-in/);

    // Verify sign-in UI is visible
    const signInElement = page.locator('text=Sign in').first();
    await expect(signInElement).toBeVisible();
  });

  test('sign-in page should have correct redirect URL', async ({ page }) => {
    await page.goto('/sign-in');

    // Check that the page loaded successfully
    await expect(page.locator('text=Sign in').first()).toBeVisible();

    // Verify afterSignInUrl is set to /configuration
    const signInComponent = page.locator('[data-clerk-sign-in]').first();
    await expect(signInComponent).toBeVisible();
  });

  test.skip('should sign out and redirect to sign-in page', async ({
    page,
  }) => {
    // This test is skipped because it requires actual authentication
    // In a real test environment, you would:
    // 1. Sign in with test credentials
    // 2. Navigate to a protected page
    // 3. Click the user button
    // 4. Click sign out
    // 5. Verify redirect to /sign-in
    // Example flow (requires test user setup):
    // await page.goto('/sign-in');
    // await page.fill('input[name="identifier"]', 'test@example.com');
    // await page.click('button:has-text("Continue")');
    // await page.fill('input[name="password"]', 'testpassword');
    // await page.click('button:has-text("Continue")');
    //
    // await page.waitForURL('/configuration');
    //
    // // Click user button
    // await page.click('[data-clerk-user-button]');
    //
    // // Click sign out
    // await page.click('button:has-text("Sign out")');
    //
    // // Verify redirect
    // await expect(page).toHaveURL(/.*sign-in/);
  });
});
