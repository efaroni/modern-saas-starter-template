# Integration Testing Guide

Context-specific patterns for integration tests in this directory.

## Integration Test Principles

- Test multiple components working together
- Use real database (test instance)
- Test API routes end-to-end
- Verify data persistence and retrieval
- Test external service interactions
- Integration tests should be about 30% of all the tests we write

## Test Database Setup

```bash
# Start test database (port 5433)
./scripts/setup-test-db.sh

# Database config
- Port: 5433
- User: test_user
- Password: test_pass
- Database: saas_template_test
```

## Common Patterns

### API Route Testing

```typescript
import { POST, GET } from '@/app/api/users/route';
import { testDb } from '@/lib/db/test';
import { users } from '@/lib/db/schema';

describe('User API', () => {
  beforeEach(async () => {
    await testDb.delete(users);
  });

  it('should create user via API', async () => {
    const request = new Request('http://localhost/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        name: 'Test User',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    // Verify in database
    const user = await testDb.query.users.findFirst({
      where: eq(users.email, 'test@example.com'),
    });
    expect(user).toBeDefined();
  });
});
```

### Webhook Testing

```typescript
import { POST } from '@/app/api/webhooks/clerk/route';
import { createWebhookHeaders } from '@/tests/fixtures/clerk';
import { testDb } from '@/lib/db/test';

describe('Clerk Webhook', () => {
  const WEBHOOK_SECRET = 'whsec_test_secret';

  beforeAll(() => {
    process.env.CLERK_WEBHOOK_SECRET = WEBHOOK_SECRET;
  });

  it('should sync user on user.created event', async () => {
    const payload = {
      type: 'user.created',
      data: {
        id: 'user_123',
        email_addresses: [
          {
            id: 'email_123',
            email_address: 'webhook@test.com',
          },
        ],
        primary_email_address_id: 'email_123',
        first_name: 'John',
        last_name: 'Doe',
      },
    };

    const request = new Request('http://localhost/api/webhooks/clerk', {
      method: 'POST',
      headers: createWebhookHeaders(payload, WEBHOOK_SECRET),
      body: JSON.stringify(payload),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    // Verify user created in database
    const user = await testDb.query.users.findFirst({
      where: eq(users.clerkId, 'user_123'),
    });
    expect(user?.email).toBe('webhook@test.com');
    expect(user?.name).toBe('John Doe');
  });
});
```

### Database Transaction Testing

```typescript
import { testDb } from '@/lib/db/test';
import { users, userApiKeys } from '@/lib/db/schema';

describe('Database Transactions', () => {
  it('should rollback on error', async () => {
    const userId = crypto.randomUUID();

    try {
      await testDb.transaction(async tx => {
        await tx.insert(users).values({
          id: userId,
          email: 'transaction@test.com',
          name: 'Test User',
        });

        // This should fail (invalid provider)
        await tx.insert(userApiKeys).values({
          userId,
          provider: 'INVALID_PROVIDER' as any,
          privateKeyEncrypted: 'test',
        });
      });
    } catch (error) {
      // Transaction should have rolled back
    }

    // User should not exist
    const user = await testDb.query.users.findFirst({
      where: eq(users.id, userId),
    });
    expect(user).toBeUndefined();
  });
});
```

### Service Integration Testing

```typescript
import { UserService } from '@/lib/services/user';
import { emailService } from '@/lib/email/service';
import { testDb } from '@/lib/db/test';

jest.mock('@/lib/email/service');

describe('UserService Integration', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService(testDb, emailService);
    (emailService.sendWelcomeEmail as jest.Mock).mockResolvedValue({
      success: true,
    });
  });

  it('should create user and send email', async () => {
    const result = await service.createUser({
      email: 'service@test.com',
      name: 'Service Test',
    });

    expect(result.id).toBeDefined();
    expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith(
      'service@test.com',
      expect.any(Object),
    );

    // Verify in database
    const user = await testDb.query.users.findFirst({
      where: eq(users.id, result.id),
    });
    expect(user).toBeDefined();
  });
});
```

### Auth Flow Testing

```typescript
import { auth } from '@clerk/nextjs/server';
import { GET } from '@/app/api/protected/route';

jest.mock('@clerk/nextjs/server');

describe('Protected Routes', () => {
  it('should reject unauthenticated requests', async () => {
    (auth as jest.Mock).mockResolvedValue({ userId: null });

    const request = new Request('http://localhost/api/protected');
    const response = await GET(request);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: 'Unauthorized',
    });
  });

  it('should allow authenticated requests', async () => {
    (auth as jest.Mock).mockResolvedValue({
      userId: 'user_123',
      sessionId: 'sess_123',
    });

    const request = new Request('http://localhost/api/protected');
    const response = await GET(request);

    expect(response.status).toBe(200);
  });
});
```

## Test Data Management

### Setup and Cleanup

```typescript
beforeEach(async () => {
  // Clean all test data
  await testDb.delete(webhookEvents).where(eq(webhookEvents.provider, 'clerk'));
  await testDb.delete(userApiKeys);
  await testDb.delete(users);
});

afterEach(async () => {
  // Clean up after test
  await testDb.delete(webhookEvents).where(eq(webhookEvents.provider, 'clerk'));
  await testDb.delete(userApiKeys);
  await testDb.delete(users);
});
```

### Test Data Factories

```typescript
import { authTestHelpers } from '@/tests/helpers/auth';

// Generate unique email for parallel tests
const email = authTestHelpers.generateUniqueEmail();

// Create test user with all relations
const userId = crypto.randomUUID();
await testDb.insert(users).values({
  id: userId,
  email,
  name: 'Test User',
  clerkId: `clerk_${Date.now()}`,
});

await testDb.insert(userApiKeys).values({
  userId,
  provider: 'openai',
  privateKeyEncrypted: encrypt('sk-test-key'),
});
```

## Mock Strategies

### Partial Mocking

```typescript
// Mock only email service, use real database
jest.mock('@/lib/email/service', () => ({
  emailService: {
    sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true }),
  },
}));

// Mock only external API calls
jest.mock('@/lib/ai/vision/openai', () => ({
  OpenAIVisionService: jest.fn().mockImplementation(() => ({
    analyzeDesign: jest.fn().mockResolvedValue({ success: true }),
  })),
}));
```

## Common Issues & Fixes

### Foreign Key Violations

```typescript
// Always delete in correct order
await testDb.delete(userApiKeys); // Delete children first
await testDb.delete(users); // Then parents
```

### Parallel Test Conflicts

```typescript
// Use unique identifiers
const testId = `${process.env.JEST_WORKER_ID}-${Date.now()}`;
const email = `test-${testId}@example.com`;
```

### Database Connection

```typescript
afterAll(async () => {
  // Close connection after all tests
  await testDb.$client.end();
});
```

## Quick Commands

```bash
# Run integration tests only
npm test -- tests/integration

# Run specific integration test
npm test -- tests/integration/auth/login.test.ts

# Debug integration test
npm test -- --verbose tests/integration/auth
```
