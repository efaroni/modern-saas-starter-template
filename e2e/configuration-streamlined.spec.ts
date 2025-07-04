import { test, expect } from '@playwright/test';
import { ConfigurationPageHelper, MockApiKeys } from './utils/test-helpers';

test.describe('Configuration Page - Streamlined Tests', () => {
  let configPage: ConfigurationPageHelper;

  test.beforeEach(async ({ page }) => {
    configPage = new ConfigurationPageHelper(page);
    await configPage.goto();
    await configPage.expectPageLoaded();
  });

  test('complete OpenAI configuration flow', async () => {
    // Fill and test OpenAI key
    await configPage.fillOpenAIKey(MockApiKeys.openai.valid);
    const testResult = await configPage.testOpenAIKey();
    expect(testResult.success).toBe(true);
    
    // Add the key
    const addResult = await configPage.addOpenAIKey();
    expect(addResult.success).toBe(true);
  });

  test('complete Stripe configuration flow', async () => {
    // Fill and test Stripe keys
    await configPage.fillStripeKeys(MockApiKeys.stripe.secret, MockApiKeys.stripe.public);
    await configPage.testStripeKey();
    
    // Add the configuration
    await configPage.addStripeConfig();
  });

  test('complete OAuth configuration flow', async () => {
    // Test GitHub OAuth
    await configPage.selectGitHubOAuth();
    await configPage.fillGitHubOAuth(MockApiKeys.github.clientId, MockApiKeys.github.clientSecret);
    const githubResult = await configPage.addGitHubOAuth();
    expect(githubResult.success).toBe(true);
  });

  test('complete Resend configuration flow', async () => {
    // Fill and test Resend key
    await configPage.fillResendKey(MockApiKeys.resend.valid);
    await configPage.testResendKey();
    
    // Add the key
    const addResult = await configPage.addResendKey();
    expect(addResult.success).toBe(true);
  });

  test('validation error handling', async () => {
    // Test invalid OpenAI key format
    await configPage.fillOpenAIKey(MockApiKeys.openai.invalid);
    await configPage.expectErrorMessage('OpenAI keys must start with sk-');
  });
});