# Unit Testing Guide

Context-specific patterns for unit tests in this directory.

## Unit Test Principles

- Test single functions/methods in isolation
- Mock all external dependencies
- Focus on business logic, not implementation
- Keep tests fast (<100ms per test)
- Unit tests should be about 60% of all the tests we write

## File Naming

```typescript
// Source file
lib / auth / providers / database.ts;

// Unit test (adjacent)
lib / auth / providers / database.test.ts;
```

## Common Patterns

### Basic Function Test

```typescript
import { calculateDiscount } from '@/lib/utils/pricing';

describe('calculateDiscount', () => {
  it('should apply percentage discount correctly', () => {
    expect(calculateDiscount(100, 10)).toBe(90);
  });

  it('should handle zero discount', () => {
    expect(calculateDiscount(100, 0)).toBe(100);
  });

  it('should throw for negative amounts', () => {
    expect(() => calculateDiscount(-100, 10)).toThrow('Invalid amount');
  });
});
```

### Class/Service Test

```typescript
import { UserService } from '@/lib/services/user';

describe('UserService', () => {
  let service: UserService;
  let mockDb: jest.Mocked<Database>;
  let mockEmail: jest.Mocked<EmailService>;

  beforeEach(() => {
    mockDb = createMockDatabase();
    mockEmail = createMockEmailService();
    service = new UserService(mockDb, mockEmail);
  });

  it('should create user and send welcome email', async () => {
    mockDb.insert.mockResolvedValue({ id: '123' });
    mockEmail.sendWelcomeEmail.mockResolvedValue({ success: true });

    const result = await service.createUser({ email: 'test@example.com' });

    expect(result.id).toBe('123');
    expect(mockEmail.sendWelcomeEmail).toHaveBeenCalledWith('test@example.com');
  });
});
```

### React Hook Test

```typescript
import { renderHook, act } from '@testing-library/react';
import { useApiKeyValidation } from '@/lib/hooks/useApiKeyValidation';

describe('useApiKeyValidation', () => {
  it('should validate API key format', async () => {
    const { result } = renderHook(() => useApiKeyValidation());

    act(() => {
      result.current.validate('sk-test-123');
    });

    expect(result.current.isValid).toBe(true);
    expect(result.current.error).toBeNull();
  });
});
```

### Utility Function Test

```typescript
import { encrypt, decrypt, maskApiKey } from '@/lib/encryption';

describe('Encryption Utils', () => {
  it('should encrypt and decrypt correctly', () => {
    const original = 'sk-test-secret-key';
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);

    expect(encrypted).not.toBe(original);
    expect(decrypted).toBe(original);
  });

  it('should mask API key', () => {
    expect(maskApiKey('sk-test-1234567890')).toBe('sk-test-...7890');
  });
});
```

## Mocking Strategies

### Mock External Services

```typescript
jest.mock('@/lib/email/service', () => ({
  emailService: {
    sendEmail: jest.fn(),
    sendWelcomeEmail: jest.fn(),
  },
}));

jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(),
  currentUser: jest.fn(),
}));
```

### Mock Database

```typescript
const mockDb = {
  query: {
    users: {
      findFirst: jest.fn(),
    },
  },
  insert: jest.fn(() => ({
    values: jest.fn(() => ({
      returning: jest.fn(),
    })),
  })),
  update: jest.fn(() => ({
    set: jest.fn(() => ({
      where: jest.fn(),
    })),
  })),
};
```

### Mock Environment Variables

```typescript
describe('Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should use test database URL', () => {
    process.env.NODE_ENV = 'test';
    process.env.TEST_DATABASE_URL = 'postgresql://test';

    expect(getDatabaseUrl()).toBe('postgresql://test');
  });
});
```

## Test Data Factories

```typescript
// tests/helpers/factories.ts
export const createTestUser = (overrides = {}) => ({
  id: crypto.randomUUID(),
  email: `test-${Date.now()}@example.com`,
  name: 'Test User',
  createdAt: new Date(),
  ...overrides,
});

// Usage
const user = createTestUser({ name: 'John Doe' });
```

## Common Assertions

```typescript
// Value checks
expect(result).toBe(expected);
expect(result).toEqual(expected);
expect(result).toBeDefined();
expect(result).toBeNull();
expect(result).toBeTruthy();

// Function calls
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith(arg1, arg2);
expect(mockFn).toHaveBeenCalledTimes(2);

// Errors
expect(() => dangerousFunc()).toThrow();
expect(() => dangerousFunc()).toThrow('Specific error');

// Async
await expect(asyncFunc()).resolves.toBe(value);
await expect(asyncFunc()).rejects.toThrow();
```

## Performance Testing

```typescript
describe('Performance', () => {
  it('should complete within 100ms', async () => {
    const start = performance.now();
    await someFunction();
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100);
  });
});
```

## Quick Commands

```bash
# Run unit tests only
npm test -- tests/unit

# Run specific test file
npm test -- tests/unit/lib/auth/providers/database.test.ts

# Run with coverage
npm test -- --coverage tests/unit

# Watch mode
npm test -- --watch tests/unit
```
