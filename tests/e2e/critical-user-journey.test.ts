import { test, expect } from '@playwright/test';

test.describe('Critical User Journey - Authentication Flow', () => {
  test('should verify critical authentication paths', async ({ page }) => {
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

    // 3. Verify sign-in page loads with authentication components
    await page.goto('/sign-in');
    await expect(page).toHaveURL(/.*sign-in/);

    await page.waitForTimeout(2000);
    const hasSignInElements =
      (await page.locator('form').count()) > 0 &&
      (await page.locator('input').count()) > 0;
    expect(hasSignInElements).toBe(true);

    // 4. Critical security test: Verify protected routes redirect to authentication
    await page.goto('/configuration');
    await expect(page).toHaveURL(/.*sign-in/);

    // 6. Return to homepage - public routes should still work
    await page.goto('/');
    await expect(page.locator('h1')).toContainText(
      'Modern SaaS Starter Template',
    );
  });
});
