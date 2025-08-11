# Claude Testing Guide

Quick reference for writing and running tests in this codebase.

## Test Commands

```bash
# Run all tests
npm run test

# Run specific test file
npm run test path/to/test.ts

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run load tests (separate)
npm run test:load

# Run E2E tests
npm run test:e2e
npm run test:e2e:ui    # With UI mode
```

## Test Database Setup

### Quick Start

```bash
# Start test database (port 5433)
./scripts/setup-test-db.sh

# Or manually
docker-compose -f docker-compose.test.yml up -d test-db
```

### Test Database Config

- **Port**: 5433 (separate from dev DB)
- **Credentials**: test_user / test_pass
- **Database**: saas_template_test
- **Strategy**: In-memory (tmpfs) for speed

## Writing Tests

### Test File Patterns

```typescript
// Unit test (adjacent to source)
lib / auth / providers / database.ts;
lib / auth / providers / database.test.ts;

// Integration test
tests / integration / auth / login.test.ts;

// E2E test
tests / e2e / auth - flow.spec.ts;
```

### Database Test Pattern

```typescript
import { testDb } from '@/lib/db/test';
import { users } from '@/lib/db/schema';
import { authTestHelpers } from '@/tests/helpers/auth';

describe('Feature Test', () => {
  beforeEach(async () => {
    // Clean database
    await testDb.delete(users);
  });

  afterEach(async () => {
    // Clean up test data
    await testDb.delete(users);
  });

  it('should do something', async () => {
    // Generate unique test data
    const email = authTestHelpers.generateUniqueEmail();

    // Create test user
    await testDb.insert(users).values({
      id: crypto.randomUUID(),
      email,
      name: 'Test User',
    });

    // Test your feature
    const result = await yourFunction(email);
    expect(result).toBeDefined();
  });
});
```

### Clerk Testing Pattern

```typescript
// Mock Clerk for tests
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(),
  currentUser: jest.fn(),
}));

import { auth } from '@clerk/nextjs/server';

describe('Protected Route', () => {
  it('should require authentication', async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: null });

    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it('should work for authenticated user', async () => {
    (auth as jest.Mock).mockResolvedValue({
      userId: 'user_123',
      sessionId: 'sess_123',
    });

    const response = await GET(request);
    expect(response.status).toBe(200);
  });
});
```

### Webhook Testing Pattern

```typescript
import { POST } from '@/app/api/webhooks/clerk/route';
import { createWebhookHeaders } from '@/tests/fixtures/clerk';

describe('Clerk Webhook', () => {
  const WEBHOOK_SECRET = 'whsec_test_secret';

  beforeAll(() => {
    process.env.CLERK_WEBHOOK_SECRET = WEBHOOK_SECRET;
  });

  it('should process user.created event', async () => {
    const payload = {
      type: 'user.created',
      data: {
        id: 'user_123',
        email_addresses: [
          {
            id: 'email_123',
            email_address: 'test@example.com',
          },
        ],
        primary_email_address_id: 'email_123',
      },
    };

    const request = new Request('http://localhost/api/webhooks/clerk', {
      method: 'POST',
      headers: createWebhookHeaders(payload, WEBHOOK_SECRET),
      body: JSON.stringify(payload),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    // Verify user was created in database
    const user = await testDb.query.users.findFirst({
      where: eq(users.clerkId, 'user_123'),
    });
    expect(user).toBeDefined();
  });
});
```

### Email Service Testing

```typescript
// Mock email service
jest.mock('@/lib/email/service', () => ({
  emailService: {
    sendWelcomeEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
  },
}));

import { emailService } from '@/lib/email/service';

beforeEach(() => {
  (emailService.sendWelcomeEmail as jest.Mock).mockResolvedValue({
    success: true,
  });
});
```

## Test Helpers

### Generate Unique Test Data

```typescript
// Unique email for parallel tests
const email = authTestHelpers.generateUniqueEmail();

// Valid UUID for database IDs
const id = crypto.randomUUID();

// Test user factory
const user = createTestUser({
  email,
  name: 'Test User',
});
```

### Retry Pattern for Flaky Tests

```typescript
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 100,
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Retry failed');
}

// Usage
const result = await retryOperation(() => someFlakeyOperation());
```

## Common Test Fixes

### Foreign Key Violations

```typescript
// Wrap in try-catch
try {
  await testDb.delete(users).where(eq(users.id, userId));
} catch (error) {
  // Handle foreign key constraint
}
```

### Parallel Test Conflicts

```typescript
// Use worker-specific data
const workerId = process.env.JEST_WORKER_ID || '1';
const email = `test-${workerId}-${Date.now()}@example.com`;
```

### Database Connection Issues

```typescript
// Ensure proper cleanup
afterAll(async () => {
  await testDb.$client.end();
});
```

## What TO Test vs NOT to Test

### ✅ Test These

- Your business logic
- API route authentication/authorization
- Database operations and transactions
- Webhook processing logic
- Data transformations
- Error handling

### ❌ Don't Test These

- Clerk's internal auth logic
- Third-party API internals
- Framework features (Next.js routing)
- Library functionality
- Database driver operations

## Test Organization

```
tests/
├── unit/           # Business logic tests
├── integration/    # API & database tests
├── e2e/           # Full user flow tests
├── fixtures/      # Test data & mocks
├── helpers/       # Test utilities
└── mocks/         # Service mocks
```

## Performance Tips

1. **Use test database on tmpfs** (in-memory) for speed
2. **Run tests in parallel** with proper data isolation
3. **Clean up data in afterEach** to prevent test pollution
4. **Mock external services** to avoid network calls
5. **Use factories** for test data generation

## Debugging Tests

```bash
# Run single test with verbose output
npm test -- --verbose path/to/test.ts

# Debug in VS Code
# Add breakpoint and use "Debug: JavaScript Debug Terminal"
npm test path/to/test.ts

# Show only failed tests
npm test -- --bail
```
