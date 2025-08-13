# E2E Testing Guide

This directory contains end-to-end tests for the application. All E2E tests require Clerk authentication and webhook integration.

## Architecture

E2E tests are built using a modular architecture with reusable components:

- **`helpers/auth-helper.ts`** - Authentication flow utilities
- **`pages/auth-pages.ts`** - Page Object Model for Clerk components
- **`helpers/test-utils.ts`** - Shared utilities, logging, and database operations

## Authentication Flow Test

The `auth-flow.test.ts` test covers the complete user authentication lifecycle including sign-up, sign-in, sign-out, and database synchronization via Clerk webhooks.

## Reusable Authentication Helpers

### Core Functions

```typescript
import {
  generateTestUser,
  signUpUser,
  signInUser,
  signOutUser,
  verifyAuthentication,
  verifyUnauthenticated,
  cleanupTestUser,
} from './helpers/auth-helper';

// Generate unique test credentials
const user = generateTestUser();

// Complete sign-up flow
await signUpUser({ user, page });

// Sign in existing user
await signInUser({ user, page });

// Sign out user
await signOutUser(page);

// Verify authentication state
await verifyAuthentication(page, '/protected-route');
await verifyUnauthenticated(page, '/protected-route');

// Clean up test data
await cleanupTestUser(user.email);
```

### Page Object Model

```typescript
import { ClerkAuthPage } from './pages/auth-pages';

const authPage = new ClerkAuthPage(page);

// Navigate to auth pages
await authPage.goToSignUp();
await authPage.goToSignIn();

// Fill forms
await authPage.fillEmail(user.email);
await authPage.fillPassword(user.password);
await authPage.clickContinue();

// Handle verification
await authPage.fillVerificationCode();

// Manage account
await authPage.updateFirstName('New Name');
await authPage.deleteAccount();
```

### Database Utilities

```typescript
import { DatabaseUtils, TestDataUtils } from './helpers/test-utils';

// Wait for webhook sync
const result = await DatabaseUtils.waitForDatabaseSync(user.email);

// Find users
const user = await DatabaseUtils.findUserByEmail(email);
const user = await DatabaseUtils.findUserByClerkId(clerkId);

// Cleanup
await DatabaseUtils.cleanupUserByEmail(email);
await TestDataUtils.cleanupAllTestData();
```

### Logging and Test Management

```typescript
import { TestLogger, TestDataUtils } from './helpers/test-utils';

// Register test email for automatic cleanup
TestDataUtils.registerTestEmail(user.email);

// Structured logging
TestLogger.logStep('Starting authentication', 'start');
TestLogger.logAuth('User signed up', user.email);
TestLogger.logDatabase('User synced', dbUser);
```

## Creating New E2E Tests

Here's a template for creating new tests that use authentication:

```typescript
import { test, expect } from '@playwright/test';
import {
  generateTestUser,
  createAuthenticatedUser,
  cleanupTestUser,
} from './helpers/auth-helper';
import { TestDataUtils, TestLogger } from './helpers/test-utils';

test.describe('My Feature Tests', () => {
  let testUser;

  test.beforeEach(async ({ page }) => {
    // Option 1: Generate user credentials only
    testUser = generateTestUser();
    TestDataUtils.registerTestEmail(testUser.email);

    // Option 2: Create fully authenticated user
    // testUser = await createAuthenticatedUser(page);
  });

  test.afterEach(async () => {
    await cleanupTestUser(testUser.email);
  });

  test('my feature test', async ({ page }) => {
    // Your test logic here
    TestLogger.logStep('Testing my feature', 'start');

    // Use authentication helpers as needed
    // await signUpUser({ user: testUser, page });
    // await verifyAuthentication(page, '/my-feature');
  });
});
```

### Running E2E Tests

E2E tests automatically start the ngrok tunnel for webhook integration:

```bash
# Run all E2E tests (automatically starts tunnel)
npm run test:e2e

# Run specific test (automatically starts tunnel)
npm run test:e2e auth-flow.test.ts

# Run with UI mode (automatically starts tunnel)
npm run test:e2e:ui

# Run in debug mode (automatically starts tunnel)
npm run test:e2e:debug

# Run without tunnel (for CI/headless environments)
npm run test:e2e:headless
```

### What Gets Tested

- ✅ **Real Clerk webhook → database sync**
- ✅ **Real Clerk user IDs**
- ✅ **Complete production-like flow**
- ✅ **Full authentication lifecycle**

## Test Coverage

The authentication flow test covers:

1. **Unauthenticated Access**: Verifies protected routes redirect to sign-in
2. **User Sign-Up**: Creates new account via Clerk with email verification
3. **Database Sync**: Verifies user is synced to local database (via webhook or manual)
4. **Authentication**: Confirms authenticated users can access protected routes
5. **Sign Out**: Tests logout functionality
6. **Sign In**: Tests logging back in with existing account
7. **Cleanup**: Removes test data from database

## Configuration

### Required Environment Variables

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
CLERK_WEBHOOK_SECRET="whsec_..." # Required for webhook mode

# Database (test environment)
TEST_DB_HOST="localhost"
TEST_DB_PORT="5432"
TEST_DB_USER="your_user"
TEST_DB_PASSWORD="your_password"
TEST_DB_NAME="saas_template_test"
```

### Webhook Setup (For Full Testing)

1. **ngrok Configuration**: The project uses a fixed ngrok domain configured in `package.json`
2. **Clerk Dashboard**: Configure webhook endpoint using the `CLERK_WEBHOOK_URL` environment variable (currently: `https://gostealthiq-dev.sa.ngrok.io/api/webhooks/clerk`)
3. **Events**: Enable `user.created`, `user.updated`, `user.deleted` events

## Troubleshooting

### Common Issues

**Test fails with "User not found in database":**

- Ensure ngrok tunnel is running: `npm run dev:tunnel`
- Check Clerk webhook configuration
- Verify `CLERK_WEBHOOK_SECRET` is set correctly

**Verification code not working:**

- The test uses `+clerk_test` email suffix with fixed code `424242`
- This is a Clerk testing feature for automated testing

**Authentication flow fails:**

- Check if Clerk test keys are properly configured
- Ensure test database is accessible and clean
