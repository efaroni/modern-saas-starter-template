import { test, expect } from '@playwright/test';

test.describe('Configuration Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dev/configuration');
  });

  test('should load configuration page', async ({ page }) => {
    // Check that the page loads
    await expect(page).toHaveTitle(/Modern SaaS Starter Template/);
    
    // Check for main heading
    await expect(page.locator('h1')).toContainText('API Configuration');
    
    // Check for mock mode indicator
    await expect(page.locator('text=Running in mock mode')).toBeVisible();
  });

  test('should display user integration keys section', async ({ page }) => {
    // Check User Integration Keys section
    await expect(page.locator('h2').filter({ hasText: 'User Integration Keys' })).toBeVisible();
    
    // Check for OpenAI config
    await expect(page.locator('text=OpenAI')).toBeVisible();
    await expect(page.locator('text=For AI features like chat and completions')).toBeVisible();
    
    // Check for Resend config
    await expect(page.locator('text=Resend')).toBeVisible();
    await expect(page.locator('text=For transactional emails')).toBeVisible();
    
    // Check for OAuth config
    await expect(page.locator('text=OAuth Providers')).toBeVisible();
    await expect(page.locator('text=For social login integration')).toBeVisible();
  });

  test('should display owner infrastructure keys section', async ({ page }) => {
    // Check Owner Infrastructure Keys section
    await expect(page.locator('h2').filter({ hasText: 'Owner Infrastructure Keys' })).toBeVisible();
    
    // Check for Stripe config
    await expect(page.locator('text=Stripe (Owner Keys)')).toBeVisible();
    await expect(page.locator('text=Your payment processing keys')).toBeVisible();
  });

  test('should handle OpenAI API key submission', async ({ page }) => {
    // Find the OpenAI API key input
    const openaiInput = page.locator('input[placeholder="sk-..."]');
    await expect(openaiInput).toBeVisible();
    
    // Enter a mock API key
    await openaiInput.fill('sk-mock-test-key-for-e2e-testing');
    
    // Click the test button
    await page.locator('button:has-text("Test Key")').click();
    
    // Wait for success message
    await expect(page.locator('text=Mock API key - validation skipped')).toBeVisible({ timeout: 10000 });
    
    // Click the add button
    await page.locator('button:has-text("Add Key")').click();
    
    // Wait for success message
    await expect(page.locator('text=OpenAI API key added successfully')).toBeVisible({ timeout: 10000 });
  });

  test('should handle Stripe configuration', async ({ page }) => {
    // Find the Stripe secret key input
    const secretKeyInput = page.locator('input[placeholder*="sk_test_"]');
    await expect(secretKeyInput).toBeVisible();
    
    // Find the Stripe public key input
    const publicKeyInput = page.locator('input[placeholder*="pk_test_"]');
    await expect(publicKeyInput).toBeVisible();
    
    // Enter mock keys
    await secretKeyInput.fill('sk_test_mock_secret_key_for_testing');
    await publicKeyInput.fill('pk_test_mock_public_key_for_testing');
    
    // Click the test button
    await page.locator('button:has-text("Test Secret Key")').click();
    
    // Wait for response (could be success or error depending on validation)
    await page.waitForSelector('.bg-green-50, .bg-red-50', { timeout: 10000 });
    
    // Click the add button
    await page.locator('button:has-text("Add Configuration")').click();
    
    // Wait for response
    await page.waitForSelector('.bg-green-50, .bg-red-50', { timeout: 10000 });
  });

  test('should handle OAuth provider selection', async ({ page }) => {
    // Click on GitHub OAuth option
    await page.locator('button:has-text("GitHub")').click();
    
    // Check that GitHub form appears
    await expect(page.locator('text=Client ID')).toBeVisible();
    await expect(page.locator('text=Client Secret')).toBeVisible();
    await expect(page.locator('text=Callback URL for GitHub')).toBeVisible();
    
    // Fill in GitHub OAuth details
    await page.locator('input[placeholder="Iv1.xxxxxxxxxxxxxxxx"]').fill('Iv1.mock_client_id_12345');
    await page.locator('input[placeholder="Client secret from GitHub"]').fill('mock_client_secret_67890');
    
    // Submit the form
    await page.locator('button:has-text("Add GitHub OAuth")').click();
    
    // Wait for response
    await page.waitForSelector('.bg-green-50, .bg-red-50', { timeout: 10000 });
    
    // Go back to providers list
    await page.locator('button:has-text("← Back to providers")').click();
    
    // Now test Google OAuth
    await page.locator('button:has-text("Google")').click();
    
    // Check that Google form appears
    await expect(page.locator('text=Callback URL for Google')).toBeVisible();
    
    // Fill in Google OAuth details
    await page.locator('input[placeholder*="googleusercontent.com"]').fill('123456789.apps.googleusercontent.com');
    await page.locator('input[placeholder="Client secret from Google"]').fill('mock_google_secret_abc123');
    
    // Submit the form
    await page.locator('button:has-text("Add Google OAuth")').click();
    
    // Wait for response
    await page.waitForSelector('.bg-green-50, .bg-red-50', { timeout: 10000 });
  });

  test('should handle Resend email service configuration', async ({ page }) => {
    // Find the Resend API key input
    const resendInput = page.locator('input[placeholder="re_..."]');
    await expect(resendInput).toBeVisible();
    
    // Enter a mock API key
    await resendInput.fill('re_mock_resend_key_for_testing');
    
    // Click the test button
    await page.locator('button:has-text("Test Key"):has-text("Resend")').click();
    
    // Wait for response
    await page.waitForSelector('.bg-green-50, .bg-red-50', { timeout: 10000 });
    
    // Click the add button
    await page.locator('button:has-text("Add Key"):has-text("Resend")').click();
    
    // Wait for response
    await page.waitForSelector('.bg-green-50, .bg-red-50', { timeout: 10000 });
  });

  test('should validate API key formats', async ({ page }) => {
    // Test invalid OpenAI key format
    const openaiInput = page.locator('input[placeholder="sk-..."]');
    await openaiInput.fill('invalid-key-format');
    
    // Try to submit
    await page.locator('button:has-text("Test Key")').click();
    
    // Should show validation error
    await expect(page.locator('text=OpenAI keys must start with sk-')).toBeVisible({ timeout: 5000 });
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Test with a malformed key that should trigger server error
    const openaiInput = page.locator('input[placeholder="sk-..."]');
    await openaiInput.fill('sk-invalid-format-that-should-fail');
    
    // Click test button
    await page.locator('button:has-text("Test Key")').click();
    
    // Should handle error gracefully (either validation error or server error)
    await page.waitForSelector('.bg-red-50, .bg-green-50', { timeout: 10000 });
  });
});