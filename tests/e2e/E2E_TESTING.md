# E2E Testing Guide

Context-specific patterns for end-to-end tests in this directory.

## E2E Test Principles

- Test complete user journeys
- Use real browser automation (Playwright)
- Test critical business flows only
- Run against staging/preview environments
- Focus on user-visible behavior
- E2E should only be about 10% of the total tests we write

## Playwright Setup

```typescript
// playwright.config.ts
export default {
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
};
```

## Common Patterns

### Authentication Flow

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should complete signup flow', async ({ page }) => {
    await page.goto('/sign-up');

    // Fill signup form
    await page.fill('[name="email"]', 'e2e@test.com');
    await page.fill('[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    // Verify redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Welcome');
  });

  test('should handle login errors', async ({ page }) => {
    await page.goto('/sign-in');

    await page.fill('[name="email"]', 'wrong@test.com');
    await page.fill('[name="password"]', 'wrongpass');
    await page.click('button[type="submit"]');

    // Verify error message
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('Invalid');
  });
});
```

### Payment Flow

```typescript
test.describe('Subscription Flow', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' }); // Pre-authenticated

  test('should upgrade to pro plan', async ({ page }) => {
    await page.goto('/billing');

    // Select pro plan
    await page.click('[data-plan="pro"]');
    await page.click('button:has-text("Upgrade")');

    // Fill Stripe checkout (test mode)
    const stripe = page.frameLocator('iframe[name*="stripe"]');
    await stripe.locator('[name="cardNumber"]').fill('4242424242424242');
    await stripe.locator('[name="cardExpiry"]').fill('12/30');
    await stripe.locator('[name="cardCvc"]').fill('123');

    await page.click('button:has-text("Subscribe")');

    // Verify subscription active
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-status]')).toContainText('Pro');
  });
});
```

### Critical User Journey

```typescript
test.describe('Complete User Journey', () => {
  test('should onboard new user', async ({ page }) => {
    // 1. Sign up
    await page.goto('/sign-up');
    const email = `e2e-${Date.now()}@test.com`;
    await page.fill('[name="email"]', email);
    await page.fill('[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    // 2. Complete profile
    await page.fill('[name="name"]', 'Test User');
    await page.fill('[name="company"]', 'Test Corp');
    await page.click('button:has-text("Continue")');

    // 3. Add API key
    await page.goto('/configuration');
    await page.click('button:has-text("Add API Key")');
    await page.fill('[name="apiKey"]', 'sk-test-123');
    await page.click('button:has-text("Save")');

    // 4. Verify setup complete
    await expect(page.locator('.setup-complete')).toBeVisible();
  });
});
```

### Mobile Testing

```typescript
test.describe('Mobile Experience', () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 13

  test('should navigate mobile menu', async ({ page }) => {
    await page.goto('/');

    // Open mobile menu
    await page.click('[aria-label="Menu"]');
    await expect(page.locator('.mobile-menu')).toBeVisible();

    // Navigate to features
    await page.click('.mobile-menu >> text=Features');
    await expect(page).toHaveURL('/features');
  });
});
```

## Page Object Pattern

```typescript
// pages/DashboardPage.ts
export class DashboardPage {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.goto('/dashboard');
  }

  async getWelcomeMessage() {
    return this.page.locator('h1').textContent();
  }

  async clickSettings() {
    await this.page.click('[data-testid="settings-link"]');
  }
}

// Usage in test
test('should access dashboard', async ({ page }) => {
  const dashboard = new DashboardPage(page);
  await dashboard.navigate();

  const welcome = await dashboard.getWelcomeMessage();
  expect(welcome).toContain('Welcome');
});
```

## Test Helpers

### Authentication Helper

```typescript
// helpers/auth.ts
export async function loginUser(page: Page, email: string, password: string) {
  await page.goto('/sign-in');
  await page.fill('[name="email"]', email);
  await page.fill('[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}

// Save auth state for reuse
export async function saveAuthState(page: Page) {
  await page.context().storageState({
    path: 'tests/e2e/.auth/user.json',
  });
}
```

### Wait Strategies

```typescript
// Wait for API response
await page.waitForResponse(
  resp => resp.url().includes('/api/user') && resp.status() === 200,
);

// Wait for element state
await page.waitForSelector('.loading', { state: 'hidden' });
await expect(page.locator('.content')).toBeVisible();

// Wait for navigation
await Promise.all([
  page.waitForNavigation(),
  page.click('a[href="/dashboard"]'),
]);
```

## Debugging E2E Tests

```typescript
// Pause test execution
await page.pause();

// Take screenshot
await page.screenshot({ path: 'debug.png' });

// Open browser in headed mode
// Run: npm run test:e2e -- --headed

// Slow down execution
test.use({ slowMo: 500 }); // 500ms between actions
```

## Environment Setup

```bash
# .env.e2e
E2E_BASE_URL=http://localhost:3000
E2E_TEST_EMAIL=e2e@test.com
E2E_TEST_PASSWORD=TestPass123!

# Run against staging
E2E_BASE_URL=https://staging.yourapp.com npm run test:e2e
```

## Common Selectors

```typescript
// Best practices for selectors
await page.click('[data-testid="submit-btn"]'); // Best: data-testid
await page.click('button:has-text("Submit")'); // Good: text content
await page.click('#submit'); // OK: ID
await page.click('.btn-primary'); // Avoid: classes change

// Robust selectors
await page.locator('role=button[name="Submit"]');
await page.getByRole('button', { name: 'Submit' });
await page.getByLabel('Email address');
```

## Quick Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npm run test:e2e tests/e2e/auth-flow.test.ts

# Run in UI mode (interactive)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e -- --headed

# Run specific project (browser)
npm run test:e2e -- --project=chromium

# Generate test code
npx playwright codegen http://localhost:3000
```

## CI/CD Integration

```yaml
# .github/workflows/e2e.yml
- name: Run E2E tests
  run: |
    npm run build
    npm run start &
    npx wait-on http://localhost:3000
    npm run test:e2e
```
