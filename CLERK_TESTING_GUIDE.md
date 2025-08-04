# Clerk Testing Guide

This guide provides comprehensive testing patterns and best practices for testing applications integrated with Clerk authentication.

## Table of Contents

1. [Core Testing Principles](#core-testing-principles)
2. [What to Test vs What NOT to Test](#what-to-test-vs-what-not-to-test)
3. [Mock Setup](#mock-setup)
4. [Testing Patterns](#testing-patterns)
5. [Common Test Scenarios](#common-test-scenarios)
6. [Troubleshooting](#troubleshooting)

## Core Testing Principles

When testing Clerk-integrated applications:

1. **Test YOUR code, not Clerk's** - Focus on your business logic and integration points
2. **Mock Clerk's responses consistently** - Use standardized mocks across all tests
3. **Test authorization logic thoroughly** - Ensure your access control works correctly
4. **Ensure webhooks are idempotent** - Same event should produce same result
5. **Test error scenarios** - Handle Clerk API failures gracefully

## What to Test vs What NOT to Test

### ✅ What TO Test

1. **Protected API Routes**
   - Authentication requirements (401 for unauthenticated)
   - Successful access for authenticated users
   - User context extraction and usage

2. **Authorization Logic**
   - Role-based access control
   - Organization membership checks
   - Resource ownership verification

3. **Webhook Handlers**
   - Signature verification
   - Event processing (user.created, user.updated, user.deleted)
   - Idempotency handling
   - Database synchronization

4. **User Data Transformations**
   - Display name formatting
   - Email extraction
   - Metadata processing

### ❌ What NOT to Test

1. **Clerk's Internal Logic**
   - Login/logout functionality
   - Password reset flow
   - Email verification
   - OAuth provider integrations

2. **Clerk UI Components**
   - SignIn/SignUp components
   - UserButton functionality
   - Organization switcher

3. **Token Management**
   - JWT generation/validation
   - Session token refresh
   - Token expiration

## Mock Setup

### Installing Mock Utilities

Our test suite includes comprehensive mock utilities in `tests/mocks/clerk.ts`:

```typescript
import {
  setupClerkMocks,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetClerkMocks,
} from '@/tests/mocks/clerk';
```

### Basic Mock Setup

```typescript
// At the top of your test file
setupClerkMocks();

// In your test
beforeEach(() => {
  resetClerkMocks();
});

// Mock an authenticated user
const user = mockAuthenticatedUser({
  id: 'user_123',
  emailAddresses: [
    {
      id: 'email_123',
      emailAddress: 'test@example.com',
    },
  ],
  firstName: 'Test',
  lastName: 'User',
  publicMetadata: { role: 'admin' },
});

// Mock an unauthenticated state
mockUnauthenticatedUser();
```

### Available Test Fixtures

We provide standard test users in `tests/fixtures/clerk.ts`:

- `testUsers.basic` - Standard user
- `testUsers.admin` - User with admin role
- `testUsers.orgMember` - Organization member
- `testUsers.minimal` - User with minimal data

## Testing Patterns

### 1. Protected API Route Tests

```typescript
describe('Protected API Route', () => {
  it('should return 401 when unauthenticated', async () => {
    mockUnauthenticatedUser();

    const response = await myApiHandler(request);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      success: false,
      error: 'Unauthorized',
    });
  });

  it('should allow authenticated users', async () => {
    const user = mockAuthenticatedUser(testUsers.basic);

    const response = await myApiHandler(request);

    expect(response.status).toBe(200);
    expect(mockAuth).toHaveBeenCalled();
  });
});
```

### 2. Webhook Handler Tests

```typescript
import { createWebhookHeaders, webhookPayloads } from '@/tests/fixtures/clerk';
import { MockWebhookRequest } from '@/tests/helpers/webhook';

describe('Clerk Webhook Handler', () => {
  const WEBHOOK_SECRET = 'whsec_test_secret';

  it('should create user on user.created event', async () => {
    const headers = createWebhookHeaders(
      webhookPayloads.userCreated,
      WEBHOOK_SECRET,
    );

    const request = new MockWebhookRequest(
      'http://localhost:3000/api/webhooks/clerk',
      webhookPayloads.userCreated,
      headers,
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
    // Verify database changes...
  });

  it('should handle duplicate events (idempotency)', async () => {
    const headers = createWebhookHeaders(
      webhookPayloads.userCreated,
      WEBHOOK_SECRET,
    );

    // Send same request twice
    const request1 = new MockWebhookRequest(url, payload, headers);
    const request2 = new MockWebhookRequest(url, payload, headers);

    await POST(request1);
    const response2 = await POST(request2);

    expect(response2.status).toBe(200);
    expect(await response2.json()).toMatchObject({
      received: true,
      skipped: true,
      reason: 'Already processed',
    });
  });
});
```

### 3. Authorization Tests

```typescript
describe('Authorization', () => {
  it('should allow admin users to access admin resources', async () => {
    mockAuthenticatedUser(testUsers.admin);

    const response = await adminOnlyHandler(request);

    expect(response.status).toBe(200);
  });

  it('should deny non-admin users', async () => {
    mockAuthenticatedUser(testUsers.basic);

    const response = await adminOnlyHandler(request);

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      error: 'Forbidden: Admin access required',
    });
  });
});
```

### 4. User Data Transformation Tests

```typescript
describe('User Data Processing', () => {
  it('should format display name correctly', () => {
    const displayName = formatUserDisplayName(testUsers.basic);
    expect(displayName).toBe('Basic User');
  });

  it('should handle missing names gracefully', () => {
    const displayName = formatUserDisplayName(testUsers.minimal);
    expect(displayName).toBe('minimal@test.com');
  });

  it('should extract primary email', () => {
    const email = getUserPrimaryEmail(testUsers.basic);
    expect(email).toBe('basic@test.com');
  });
});
```

## Common Test Scenarios

### Testing Different User States

```typescript
// Testing with various user types
const scenarios = [
  { name: 'basic user', user: testUsers.basic, expectedRole: null },
  { name: 'admin user', user: testUsers.admin, expectedRole: 'admin' },
  { name: 'org member', user: testUsers.orgMember, expectedRole: 'member' },
];

scenarios.forEach(({ name, user, expectedRole }) => {
  it(`should handle ${name} correctly`, async () => {
    mockAuthenticatedUser(user);
    // Test logic...
  });
});
```

### Testing Error Scenarios

```typescript
it('should handle Clerk API errors gracefully', async () => {
  // Mock Clerk API failure
  mockAuth.mockRejectedValue(new Error('Clerk API unavailable'));

  const response = await myApiHandler(request);

  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({
    error: 'Authentication service unavailable',
  });
});
```

### Testing Loading States

```typescript
it('should handle loading state correctly', () => {
  mockLoadingAuth();

  const { result } = renderHook(() => useUser());

  expect(result.current.isLoaded).toBe(false);
  expect(result.current.isSignedIn).toBe(false);
  expect(result.current.user).toBeUndefined();
});
```

## Troubleshooting

### Common Issues

1. **"Cannot find module '@clerk/nextjs'"**
   - Ensure mocks are set up before importing components that use Clerk
   - Use `setupClerkMocks()` at the top of your test file

2. **"auth() is not a function"**
   - Make sure you're importing from the mock utilities
   - Check that `setupClerkMocks()` is called before imports

3. **Webhook signature verification failures**
   - Use the `createWebhookHeaders()` helper function
   - Ensure the webhook secret matches in tests and handler

4. **Database constraint violations in tests**
   - Clean up test data in `beforeEach`/`afterEach` hooks
   - Use unique IDs for each test

### Debug Tips

1. **Enable verbose logging** in webhook handlers during test development
2. **Use `console.log(mockAuth.mock.calls)`** to inspect auth calls
3. **Check mock return values** match expected Clerk response format
4. **Verify database state** after webhook processing

## Best Practices

1. **Isolate Tests** - Each test should be independent
2. **Use Fixtures** - Reuse standard test data
3. **Mock Consistently** - Use the same mock patterns across tests
4. **Test Edge Cases** - Missing data, API failures, etc.
5. **Clean Up** - Reset mocks and database state between tests
6. **Document Assertions** - Make test intentions clear

## Example Test Structure

```typescript
import {
  setupClerkMocks,
  resetClerkMocks,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
} from '@/tests/mocks/clerk';
import { testUsers } from '@/tests/fixtures/clerk';

// Setup mocks before imports
setupClerkMocks();

// Import your code after mocks
import { myApiHandler } from '@/app/api/my-endpoint/route';

describe('My Feature', () => {
  beforeEach(() => {
    resetClerkMocks();
    // Additional setup...
  });

  afterEach(() => {
    // Cleanup...
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      mockUnauthenticatedUser();
      // Test...
    });

    it('should work for authenticated users', async () => {
      mockAuthenticatedUser(testUsers.basic);
      // Test...
    });
  });

  describe('Authorization', () => {
    // Authorization tests...
  });

  describe('Business Logic', () => {
    // Feature-specific tests...
  });
});
```

This testing approach ensures reliable, maintainable tests that focus on your application's behavior rather than Clerk's internal implementation.
