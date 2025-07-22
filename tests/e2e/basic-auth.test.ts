import { test, expect } from '@playwright/test';

import { testHelpers } from '@/lib/db/test-helpers';

// Test user data
const testUser = {
  email: 'e2e-test-unique@example.com',
  password: 'SuperStr0ng!P@ssw0rd2024#UniqueTest',
  name: 'E2E Test User',
};

test.describe('Basic Authentication E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup test database
    await testHelpers.setupTest();

    // Navigate to the auth page where authentication UI exists
    await page.goto('/auth');
  });

  test.afterEach(async ({ page: _page }) => {
    // Clean up test database
    await testHelpers.teardownTest();
  });

  test('should load auth page successfully', async ({ page }) => {
    // Should see the auth page title
    await expect(
      page.locator('text=Authentication & User Management')
    ).toBeVisible();

    // Should see both login and signup tabs
    await expect(
      page.locator('button[role="tab"]:has-text("Login")')
    ).toBeVisible();
    await expect(
      page.locator('button[role="tab"]:has-text("Sign Up")')
    ).toBeVisible();
  });

  test('should complete basic signup flow', async ({ page }) => {
    // Click on sign up tab
    await page.click('button[role="tab"]:has-text("Sign Up")');

    // Fill in sign up form using actual form IDs
    await page.fill('#signup-name', testUser.name);
    await page.fill('#signup-email', testUser.email);
    await page.fill('#signup-password', testUser.password);

    // Submit form
    await page.click('button[type="submit"]:has-text("Sign up")');

    // Wait for success and automatic switch to profile tab
    await expect(page.locator('.bg-green-50')).toBeVisible();

    // Should show current user info (blue box appears after successful signup)
    await expect(page.locator('.bg-blue-50')).toBeVisible();
    await expect(page.locator(`text=${testUser.email}`)).toBeVisible();

    // Should be on Profile tab now
    await expect(
      page.locator('button[role="tab"]:has-text("Profile")')
    ).toBeVisible();
  });

  test('should complete basic signin flow', async ({ page }) => {
    // First, create a user by signing up
    await page.click('button[role="tab"]:has-text("Sign Up")');
    await page.fill('#signup-name', testUser.name);
    await page.fill('#signup-email', testUser.email);
    await page.fill('#signup-password', testUser.password);
    await page.click('button[type="submit"]:has-text("Sign up")');
    await expect(page.locator('.bg-green-50')).toBeVisible();

    // Sign out to test login (should be in the current user info box)
    await page.click('.bg-blue-50 button:has-text("Sign Out")');

    // Should be back to login tab and user info should be gone
    await expect(
      page.locator('button[role="tab"]:has-text("Login")')
    ).toBeVisible();
    await expect(page.locator('.bg-blue-50')).toBeHidden();

    // Fill login form
    await page.fill('#email', testUser.email);
    await page.fill('#password', testUser.password);
    await page.click('button[type="submit"]:has-text("Sign in")');

    // Should show success and user info
    await expect(page.locator('.bg-green-50')).toBeVisible();
    await expect(page.locator('.bg-blue-50')).toBeVisible();
  });

  test('should show validation errors for invalid input', async ({ page }) => {
    // Test signup validation
    await page.click('button[role="tab"]:has-text("Sign Up")');

    // Submit empty form
    await page.click('button[type="submit"]:has-text("Sign up")');

    // Should show validation errors
    await expect(page.locator('text=Name is required')).toBeVisible();
    await expect(page.locator('text=Email is required')).toBeVisible();

    // Test weak password
    await page.fill('#signup-name', testUser.name);
    await page.fill('#signup-email', testUser.email);
    await page.fill('#signup-password', 'weak');
    await page.click('button[type="submit"]:has-text("Sign up")');

    await expect(
      page.locator('text=Password must be at least 8 characters')
    ).toBeVisible();
  });

  test('should show error for invalid login credentials', async ({ page }) => {
    // Try to login with non-existent user
    await page.fill('#email', 'nonexistent@example.com');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]:has-text("Sign in")');

    // Should show error message
    await expect(page.locator('.bg-red-50')).toBeVisible();
  });
});
