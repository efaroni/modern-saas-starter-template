/**
 * E2E tests for email functionality
 * Tests complete user journeys involving email features
 */

import { test, expect } from '@playwright/test';

test.describe('Email E2E Tests', () => {
  // Helper function to create a test user (you might need to implement this)
  const createTestUser = () => {
    // In a real E2E test, you would:
    // 1. Sign up a user through the UI
    // 2. Or use an API to create a test user
    // 3. Return user credentials
    return {
      email: `e2e-test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
    };
  };

  test.describe('Test Email Feature', () => {
    test('should allow logged-in user to send a test email from settings page', async ({
      page,
    }) => {
      // Create and login test user
      const testUser = await createTestUser();

      // Navigate to auth page and login
      await page.goto('/auth');

      // Note: This assumes you have a login form
      // You may need to adjust based on your auth implementation
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');

      // Wait for successful login and navigation to dashboard
      await expect(page).toHaveURL(/dashboard/);

      // Navigate to email management
      await page.goto('/emails');

      // Wait for page to load
      await expect(
        page.locator('h1:has-text("Email Management")'),
      ).toBeVisible();

      // Verify test email section is present
      await expect(
        page.locator('h3:has-text("Test Email Service")'),
      ).toBeVisible();

      // Fill in test email
      const testEmailField = page.locator('input[type="email"]');
      await expect(testEmailField).toBeVisible();
      await testEmailField.fill(testUser.email);

      // Click send test email button
      const sendButton = page.locator('button:has-text("Send Test Email")');
      await expect(sendButton).toBeEnabled();
      await sendButton.click();

      // Verify button is disabled during sending
      await expect(sendButton).toBeDisabled();
      await expect(sendButton).toContainText('Sending...');

      // Wait for success message
      await expect(
        page.locator('.text-green-800:has-text("Test email sent")'),
      ).toBeVisible({ timeout: 10000 });

      // Verify button cooldown
      await expect(sendButton).toBeDisabled();
      await expect(sendButton).toContainText(/Wait \d+s/);

      // Wait for cooldown to finish (5 seconds)
      await expect(sendButton).toBeEnabled({ timeout: 6000 });
      await expect(sendButton).toContainText('Send Test Email');
    });

    test('should enforce rate limiting after 5 test emails', async ({
      page,
    }) => {
      const testUser = await createTestUser();

      // Login and navigate to email management
      await page.goto('/auth');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');
      await page.goto('/emails');

      const testEmailField = page.locator('input[type="email"]');
      const sendButton = page.locator('button:has-text("Send Test Email")');

      await testEmailField.fill(testUser.email);

      // Send 5 test emails quickly
      for (let i = 0; i < 5; i++) {
        await sendButton.click();
        await expect(
          page.locator('.text-green-800:has-text("Test email sent")'),
        ).toBeVisible({ timeout: 10000 });

        // Wait for cooldown between sends
        if (i < 4) {
          await expect(sendButton).toBeEnabled({ timeout: 6000 });
        }
      }

      // After 5 sends, should trigger 2-minute timeout
      await expect(sendButton).toBeDisabled();
      await expect(sendButton).toContainText(/Wait \d+s/);

      // Verify timeout message shows more than 5 seconds (indicating 2-minute timeout)
      const buttonText = await sendButton.textContent();
      const timeRemaining = parseInt(buttonText?.match(/\d+/)?.[0] || '0');
      expect(timeRemaining).toBeGreaterThan(10); // Should be around 120 seconds
    });
  });

  test.describe('Email Preferences Management', () => {
    test('should allow user to toggle marketing email preference on and off from settings page', async ({
      page,
    }) => {
      const testUser = await createTestUser();

      // Login and navigate to email management
      await page.goto('/auth');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');
      await page.goto('/emails');

      // Wait for preferences to load
      await expect(
        page.locator('h3:has-text("Email Preferences")'),
      ).toBeVisible();

      // Find marketing email toggle
      const marketingToggle = page.locator(
        'button[role="switch"]:near(:text("Marketing Emails"))',
      );

      // Check initial state (should be enabled by default)
      await expect(marketingToggle).toHaveClass(/bg-blue-600/);

      // Toggle off marketing emails
      await marketingToggle.click();

      // Verify toggle switched to off state
      await expect(marketingToggle).toHaveClass(/bg-gray-200/);

      // Verify success message
      await expect(
        page.locator('.text-green-800:has-text("Email preferences updated")'),
      ).toBeVisible();

      // Toggle back on
      await marketingToggle.click();

      // Verify toggle switched to on state
      await expect(marketingToggle).toHaveClass(/bg-blue-600/);

      // Verify success message appears again
      await expect(
        page.locator('.text-green-800:has-text("Email preferences updated")'),
      ).toBeVisible();
    });

    test('should show transactional emails as always enabled', async ({
      page,
    }) => {
      const testUser = await createTestUser();

      // Login and navigate to email management
      await page.goto('/auth');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');
      await page.goto('/emails');

      // Find transactional emails toggle
      const transactionalToggle = page.locator(
        'button:near(:text("Transactional Emails"))',
      );

      // Verify it's always enabled and disabled from user interaction
      await expect(transactionalToggle).toBeDisabled();
      await expect(transactionalToggle).toHaveClass(/bg-blue-600/);
      await expect(transactionalToggle).toHaveClass(/cursor-not-allowed/);

      // Verify explanatory text
      await expect(page.locator('text=(always enabled)')).toBeVisible();
    });
  });

  test.describe('Unsubscribe Flow', () => {
    test('should allow user to unsubscribe via link in email footer (simulate clicking unsubscribe link)', async ({
      page,
    }) => {
      const testUser = await createTestUser();

      // Login first to create user data
      await page.goto('/auth');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');
      await page.goto('/emails');

      // Get the unsubscribe URL from the settings page
      const unsubscribeLink = page.locator(
        'a:has-text("Test Unsubscribe Link")',
      );
      const unsubscribeUrl = await unsubscribeLink.getAttribute('href');

      expect(unsubscribeUrl).toBeTruthy();

      // Navigate to unsubscribe page
      await page.goto(unsubscribeUrl || '');

      // Verify unsubscribe page loaded
      await expect(page.locator('h1:has-text("Unsubscribe")')).toBeVisible();

      // Find and click unsubscribe button
      const unsubscribeButton = page.locator(
        'button:has-text("Unsubscribe from marketing emails")',
      );
      await expect(unsubscribeButton).toBeVisible();
      await unsubscribeButton.click();

      // Verify success message
      await expect(page.locator('text=Successfully unsubscribed')).toBeVisible({
        timeout: 10000,
      });

      // Verify re-subscribe option is available
      await expect(
        page.locator('button:has-text("Re-subscribe")'),
      ).toBeVisible();

      // Test re-subscribe functionality
      const resubscribeButton = page.locator('button:has-text("Re-subscribe")');
      await resubscribeButton.click();

      // Verify re-subscribe success
      await expect(page.locator('text=Successfully re-subscribed')).toBeVisible(
        { timeout: 10000 },
      );
    });
  });

  test.describe('Email Settings Page Integration', () => {
    test('should display all email settings sections correctly', async ({
      page,
    }) => {
      const testUser = await createTestUser();

      // Login and navigate to email management
      await page.goto('/auth');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');
      await page.goto('/emails');

      // Verify all main sections are present
      await expect(
        page.locator('h3:has-text("Test Email Service")'),
      ).toBeVisible();

      await expect(
        page.locator('h3:has-text("Email Preferences")'),
      ).toBeVisible();

      await expect(
        page.locator('h3:has-text("Unsubscribe Information")'),
      ).toBeVisible();

      // Verify test email form
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(
        page.locator('button:has-text("Send Test Email")'),
      ).toBeVisible();

      // Verify preferences toggles - only marketing and transactional now
      await expect(page.locator('text=Marketing Emails')).toBeVisible();
      await expect(page.locator('text=Transactional Emails')).toBeVisible();

      // Verify important note section
      await expect(page.locator('h3:has-text("Important Note")')).toBeVisible();

      await expect(
        page.locator('text=You will always receive critical emails'),
      ).toBeVisible();
    });
  });
});
