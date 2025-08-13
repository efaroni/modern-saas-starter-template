# E2E Testing Guide

This directory contains end-to-end tests for the application. All E2E tests require Clerk authentication and webhook integration.

## Authentication Flow Test

The `auth-flow.test.ts` test covers the complete user authentication lifecycle including sign-up, sign-in, sign-out, and database synchronization via Clerk webhooks.

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