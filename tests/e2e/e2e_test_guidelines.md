# E2E Test Guidelines

## Introduction

This document defines our End-to-End (E2E) testing strategy for critical user journeys. E2E tests validate complete workflows from the user's perspective, ensuring our SaaS application delivers value reliably. These tests complement our unit and integration tests by focusing on real user scenarios rather than technical implementation details.

**Scope**: E2E tests cover 5-10% of our testing pyramid, focusing on business-critical paths that directly impact revenue, user retention, and core functionality.

## Test Setup

### Environment Configuration

```javascript
// playwright.config.js
export default {
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Mobile testing for responsive flows
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],
  
  // Parallel execution for speed
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 2 : 0,
}
```

### Pre-test Setup
```javascript
// e2e/helpers/setup.js
export async function setupTestUser(page) {
  // Use API to create test user (faster than UI)
  const user = await api.createTestUser({
    email: `test-${Date.now()}@example.com`,
    subscription: 'premium', // Test with paying user
  });
  
  // Set auth cookie directly (skip login flow)
  await page.context().addCookies([{
    name: 'auth-token',
    value: user.authToken,
    domain: 'localhost',
    path: '/',
  }]);
  
  return user;
}
```

## Core Functionality Tests

### 1. Authentication Flow
```javascript
test.describe('Authentication', () => {
  test('new user can sign up and access dashboard', async ({ page }) => {
    await page.goto('/signup');
    
    // Fill signup form
    await page.fill('[name="email"]', `test-${Date.now()}@example.com`);
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');
    
    // Verify redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
  });
  
  test('existing user can login with valid credentials', async ({ page }) => {
    const user = await setupTestUser(page);
    
    await page.goto('/login');
    await page.fill('[name="email"]', user.email);
    await page.fill('[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/dashboard');
  });
});
```

### 2. Payment Flow
```javascript
test.describe('Payment Processing', () => {
  test('user can upgrade to premium plan', async ({ page }) => {
    const user = await setupTestUser(page);
    await page.goto('/pricing');
    
    // Select premium plan
    await page.click('[data-plan="premium"] button');
    
    // Fill Stripe test card
    const stripeFrame = page.frameLocator('iframe[name*="stripe"]');
    await stripeFrame.locator('[name="cardnumber"]').fill('4242 4242 4242 4242');
    await stripeFrame.locator('[name="exp-date"]').fill('12/25');
    await stripeFrame.locator('[name="cvc"]').fill('123');
    
    await page.click('button[type="submit"]');
    
    // Verify subscription active
    await expect(page.getByText('Premium Plan Active')).toBeVisible();
  });
});
```

### 3. Core CRUD Operations
```javascript
test.describe('API Key Management', () => {
  test('complete API key lifecycle', async ({ page }) => {
    const user = await setupTestUser(page);
    await page.goto('/settings/api-keys');
    
    // Create
    await page.click('button:has-text("Create API Key")');
    await page.fill('[name="keyName"]', 'Production Key');
    await page.click('button[type="submit"]');
    
    // Verify and copy key (only shown once)
    const keyElement = page.locator('[data-testid="api-key-value"]');
    await expect(keyElement).toBeVisible();
    const keyValue = await keyElement.textContent();
    
    // List
    await page.goto('/settings/api-keys');
    await expect(page.getByText('Production Key')).toBeVisible();
    
    // Delete
    await page.click('[data-key-name="Production Key"] button[aria-label="Delete"]');
    await page.click('button:has-text("Confirm Delete")');
    
    // Verify deletion
    await expect(page.getByText('Production Key')).not.toBeVisible();
  });
});
```

### 4. Data Export Flow
```javascript
test.describe('Data Export', () => {
  test('user can export their data', async ({ page }) => {
    const user = await setupTestUser(page);
    await page.goto('/settings/data');
    
    // Request export
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export My Data")');
    
    // Verify download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('export');
    expect(download.suggestedFilename()).toContain('.csv');
  });
});
```

## Edge Case Tests

### 1. Session Timeout Handling
```javascript
test('handles session expiration gracefully', async ({ page }) => {
  const user = await setupTestUser(page);
  await page.goto('/dashboard');
  
  // Simulate session expiration
  await page.context().clearCookies();
  
  // Try to perform authenticated action
  await page.click('button:has-text("Create New")');
  
  // Should redirect to login with return URL
  await expect(page).toHaveURL('/login?returnUrl=%2Fdashboard');
  await expect(page.getByText('Please log in to continue')).toBeVisible();
});
```

### 2. Network Failure Recovery
```javascript
test('handles network failures with retry', async ({ page, context }) => {
  const user = await setupTestUser(page);
  await page.goto('/dashboard');
  
  // Simulate network failure
  await context.route('**/api/**', route => route.abort());
  
  // Attempt action
  await page.click('button:has-text("Save Changes")');
  
  // Verify error message and retry option
  await expect(page.getByText('Network error')).toBeVisible();
  
  // Restore network and retry
  await context.unroute('**/api/**');
  await page.click('button:has-text("Retry")');
  
  await expect(page.getByText('Changes saved')).toBeVisible();
});
```

## Performance Considerations

### Page Load Metrics
```javascript
test('critical pages load within performance budget', async ({ page }) => {
  const routes = ['/dashboard', '/settings', '/pricing'];
  
  for (const route of routes) {
    await page.goto(route);
    
    // Measure Core Web Vitals
    const metrics = await page.evaluate(() => ({
      FCP: performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime,
      LCP: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime,
    }));
    
    expect(metrics.FCP).toBeLessThan(1500); // 1.5s FCP budget
    expect(metrics.LCP).toBeLessThan(2500); // 2.5s LCP budget
  }
});
```

### API Response Times
```javascript
test('API endpoints respond within SLA', async ({ page }) => {
  const user = await setupTestUser(page);
  
  // Monitor API calls
  const apiCalls = [];
  page.on('response', response => {
    if (response.url().includes('/api/')) {
      apiCalls.push({
        url: response.url(),
        duration: response.timing().responseEnd,
      });
    }
  });
  
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  
  // Verify all API calls completed within 500ms
  apiCalls.forEach(call => {
    expect(call.duration).toBeLessThan(500);
  });
});
```

## Accessibility Tests

### Basic A11y Checks
```javascript
test.describe('Accessibility', () => {
  test('critical pages pass basic accessibility checks', async ({ page }) => {
    const routes = ['/login', '/dashboard', '/settings'];
    
    for (const route of routes) {
      await page.goto(route);
      
      // Check for accessibility violations
      const violations = await page.evaluate(() => {
        // Basic checks - consider using axe-playwright for comprehensive testing
        const issues = [];
        
        // Images must have alt text
        const imagesWithoutAlt = document.querySelectorAll('img:not([alt])');
        if (imagesWithoutAlt.length) {
          issues.push(`${imagesWithoutAlt.length} images without alt text`);
        }
        
        // Form inputs must have labels
        const inputsWithoutLabels = document.querySelectorAll('input:not([aria-label]):not([id])');
        if (inputsWithoutLabels.length) {
          issues.push(`${inputsWithoutLabels.length} inputs without labels`);
        }
        
        // Buttons must have accessible text
        const buttonsWithoutText = document.querySelectorAll('button:empty');
        if (buttonsWithoutText.length) {
          issues.push(`${buttonsWithoutText.length} buttons without text`);
        }
        
        return issues;
      });
      
      expect(violations).toHaveLength(0);
    }
  });
  
  test('keyboard navigation works for critical flows', async ({ page }) => {
    await page.goto('/login');
    
    // Tab through form
    await page.keyboard.press('Tab'); // Focus email
    await page.keyboard.type('test@example.com');
    await page.keyboard.press('Tab'); // Focus password
    await page.keyboard.type('password123');
    await page.keyboard.press('Tab'); // Focus submit button
    await page.keyboard.press('Enter'); // Submit form
    
    // Verify navigation worked
    await expect(page).toHaveURL(/\/(dashboard|login)/);
  });
});
```

## Test Data Management

### Data Lifecycle
```javascript
// e2e/helpers/test-data.js
export class TestDataManager {
  constructor() {
    this.createdEntities = [];
  }
  
  async createUser(overrides = {}) {
    const user = await api.createTestUser({
      email: `e2e-${Date.now()}@test.com`,
      ...overrides,
    });
    
    this.createdEntities.push({ type: 'user', id: user.id });
    return user;
  }
  
  async cleanup() {
    // Cleanup in reverse order (dependencies)
    for (const entity of this.createdEntities.reverse()) {
      try {
        await api.delete(`/${entity.type}s/${entity.id}`);
      } catch (e) {
        console.warn(`Failed to cleanup ${entity.type} ${entity.id}`);
      }
    }
  }
}

// Use in tests
test.beforeEach(async ({ page }) => {
  page.testData = new TestDataManager();
});

test.afterEach(async ({ page }) => {
  await page.testData?.cleanup();
});
```

### Test Isolation Strategies
1. **Unique Identifiers**: Use timestamps or UUIDs in test data
2. **API-Based Setup**: Create test data via API, not UI (faster)
3. **Automatic Cleanup**: Always cleanup test data after tests
4. **Separate Test Tenant**: Consider multi-tenant isolation for parallel tests

## Reporting and Analysis

### Failure Analysis
```javascript
// playwright.config.js
export default {
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results.json' }],
    ['junit', { outputFile: 'junit.xml' }], // For CI integration
    ['./custom-reporter.js'], // Custom insights
  ],
};

// custom-reporter.js
class CustomReporter {
  onTestEnd(test, result) {
    if (result.status === 'failed') {
      // Log additional context
      console.log(`Failed: ${test.title}`);
      console.log(`Duration: ${result.duration}ms`);
      
      // Check for common issues
      const errors = result.errors.join('\n');
      if (errors.includes('timeout')) {
        console.log('⚠️  Timeout detected - check for slow API calls');
      }
      if (errors.includes('element not found')) {
        console.log('⚠️  Element not found - check for UI changes');
      }
    }
  }
}
```

### Key Metrics to Track
1. **Test Execution Time**: Flag tests taking >30 seconds
2. **Flaky Test Rate**: Identify tests failing intermittently
3. **Coverage by Feature**: Ensure critical paths are tested
4. **Failure Patterns**: Group failures by root cause

### Action Items for Test Failures
1. **Screenshot/Video**: Review visual evidence first
2. **Check Test Data**: Ensure cleanup ran properly
3. **Review Recent Changes**: Cross-reference with git commits
4. **Update Selectors**: Use data-testid for stability
5. **Add Retry Logic**: For known timing issues

## Best Practices Summary

### DO ✅
- Test complete user journeys, not individual pages
- Use data-testid attributes for reliable selectors
- Run tests in parallel for speed
- Mock external services (Stripe webhooks, email)
- Test on multiple viewports (desktop + mobile)
- Keep tests independent and idempotent

### DON'T ❌
- Test implementation details (that's for unit tests)
- Use arbitrary waits (use Playwright's auto-waiting)
- Share test data between tests
- Test every possible edge case (focus on critical paths)
- Ignore flaky tests (fix or remove them)

### Test Writing Checklist
- [ ] Does this test cover a critical user journey?
- [ ] Can this test run independently?
- [ ] Is the test data properly isolated?
- [ ] Are selectors stable (using data-testid)?
- [ ] Is cleanup handled properly?
- [ ] Does the test complete in <30 seconds?
</e2e_test_markdown>

This E2E test markdown file addresses the team's needs by:

1. **Focusing on the 80/20 principle**: Tests cover critical user journeys (auth, payments, CRUD, data export) that directly impact business value
2. **Rapid development support**: Includes helper functions, parallel execution, and API-based setup to keep tests fast
3. **Quality maintenance**: Provides clear patterns for test isolation, cleanup, and debugging
4. **Technology adaptability**: While Playwright-focused, the patterns (page objects, test data management) translate to other frameworks
5. **Complementing existing tests**: E2E tests focus on user journeys rather than technical implementation, avoiding overlap with unit/integration tests

The structure allows Claude to quickly reference patterns for common scenarios while maintaining best practices for reliability and maintainability.