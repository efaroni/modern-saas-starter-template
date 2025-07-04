import { Page, expect } from '@playwright/test';

export class ConfigurationPageHelper {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dev/configuration');
  }

  async expectPageLoaded() {
    await expect(this.page).toHaveTitle(/Modern SaaS Starter Template/);
    await expect(this.page.locator('h1')).toContainText('API Configuration');
    await expect(this.page.locator('text=Running in mock mode')).toBeVisible();
  }

  async fillOpenAIKey(key: string) {
    const input = this.page.locator('input[placeholder="sk-..."]');
    await expect(input).toBeVisible();
    await input.fill(key);
  }

  async testOpenAIKey() {
    await this.page.locator('button:has-text("Test Key")').click();
    return await this.waitForResponse();
  }

  async addOpenAIKey() {
    await this.page.locator('button:has-text("Add Key")').click();
    return await this.waitForResponse();
  }

  async fillStripeKeys(secretKey: string, publicKey: string) {
    const secretInput = this.page.locator('input[placeholder*="sk_test_"]');
    const publicInput = this.page.locator('input[placeholder*="pk_test_"]');
    
    await expect(secretInput).toBeVisible();
    await expect(publicInput).toBeVisible();
    
    await secretInput.fill(secretKey);
    await publicInput.fill(publicKey);
  }

  async testStripeKey() {
    await this.page.locator('button:has-text("Test Secret Key")').click();
    return await this.waitForResponse();
  }

  async addStripeConfig() {
    await this.page.locator('button:has-text("Add Configuration")').click();
    return await this.waitForResponse();
  }

  async selectGitHubOAuth() {
    await this.page.locator('button:has-text("GitHub")').click();
    await expect(this.page.locator('text=Client ID')).toBeVisible();
    await expect(this.page.locator('text=Client Secret')).toBeVisible();
  }

  async fillGitHubOAuth(clientId: string, clientSecret: string) {
    await this.page.locator('input[placeholder="Iv1.xxxxxxxxxxxxxxxx"]').fill(clientId);
    await this.page.locator('input[placeholder="Client secret from GitHub"]').fill(clientSecret);
  }

  async addGitHubOAuth() {
    await this.page.locator('button:has-text("Add GitHub OAuth")').click();
    return await this.waitForResponse();
  }

  async selectGoogleOAuth() {
    await this.page.locator('button:has-text("Google")').click();
    await expect(this.page.locator('text=Callback URL for Google')).toBeVisible();
  }

  async fillGoogleOAuth(clientId: string, clientSecret: string) {
    await this.page.locator('input[placeholder*="googleusercontent.com"]').fill(clientId);
    await this.page.locator('input[placeholder="Client secret from Google"]').fill(clientSecret);
  }

  async addGoogleOAuth() {
    await this.page.locator('button:has-text("Add Google OAuth")').click();
    return await this.waitForResponse();
  }

  async fillResendKey(key: string) {
    const input = this.page.locator('input[placeholder="re_..."]');
    await expect(input).toBeVisible();
    await input.fill(key);
  }

  async testResendKey() {
    await this.page.locator('button:has-text("Test Key"):has-text("Resend")').click();
    return await this.waitForResponse();
  }

  async addResendKey() {
    await this.page.locator('button:has-text("Add Key"):has-text("Resend")').click();
    return await this.waitForResponse();
  }

  private async waitForResponse() {
    const responseLocator = this.page.locator('.bg-green-50, .bg-red-50');
    await responseLocator.waitFor({ timeout: 10000 });
    
    const isSuccess = await this.page.locator('.bg-green-50').isVisible();
    const isError = await this.page.locator('.bg-red-50').isVisible();
    
    return {
      success: isSuccess,
      error: isError,
      message: await responseLocator.textContent()
    };
  }

  async expectSuccessMessage(text?: string) {
    const successLocator = this.page.locator('.bg-green-50');
    await expect(successLocator).toBeVisible({ timeout: 10000 });
    
    if (text) {
      await expect(successLocator).toContainText(text);
    }
  }

  async expectErrorMessage(text?: string) {
    const errorLocator = this.page.locator('.bg-red-50');
    await expect(errorLocator).toBeVisible({ timeout: 10000 });
    
    if (text) {
      await expect(errorLocator).toContainText(text);
    }
  }
}

export const MockApiKeys = {
  openai: {
    valid: 'sk-mock-test-key-for-e2e-testing',
    invalid: 'invalid-key-format'
  },
  stripe: {
    secret: 'sk_test_mock_secret_key_for_testing',
    public: 'pk_test_mock_public_key_for_testing',
    invalidSecret: 'invalid-secret-key',
    invalidPublic: 'invalid-public-key'
  },
  resend: {
    valid: 're_mock_resend_key_for_testing',
    invalid: 'invalid-resend-key'
  },
  github: {
    clientId: 'Iv1.mock_client_id_12345',
    clientSecret: 'mock_client_secret_67890'
  },
  google: {
    clientId: '123456789.apps.googleusercontent.com',
    clientSecret: 'mock_google_secret_abc123'
  }
};