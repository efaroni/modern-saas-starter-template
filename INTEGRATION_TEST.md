# Integration Testing Best Practices Guide

## Overview

Integration tests verify that different components or services work correctly together. They test the interactions between modules, external services, databases, and APIs to ensure the system functions as a cohesive whole.

## Core Philosophy

Integration tests are most useful when focused on testing **interactions between components** rather than every possible scenario. Key principles:

- **Focus on critical paths and boundaries** - Test main user workflows and business processes that span multiple components
- **Test realistic data flows** - Use real or realistic data that mirrors production
- **Keep them focused and fast** - Test "happy path" and key error scenarios, not every edge case
- **Use them to validate contracts** - Ensure contracts between services/modules work correctly
- **Test configuration and environment concerns** - Validate real databases, message queues, file systems, and external services
- **Make them independent and repeatable** - Each test should run independently and leave the system in a clean state

## Writing Effective Integration Tests

### Test Structure Example
```typescript
describe('User Registration Integration', () => {
  let testDb: TestDatabase
  let transaction: DatabaseTransaction
  
  beforeAll(async () => {
    testDb = await TestDatabase.create()
  })
  
  afterAll(async () => {
    await testDb.destroy()
  })
  
  beforeEach(async () => {
    // Transaction-based isolation for speed and reliability
    transaction = await testDb.beginTransaction()
    await seedMinimalData(transaction)
  })
  
  afterEach(async () => {
    // Rollback ensures clean state for next test
    await transaction.rollback()
  })
  
  it('should complete full user registration workflow', async () => {
    // Arrange
    const userData = testDataFactories.createUser({
      email: 'test@example.com',
      name: 'Test User'
    })
    
    // Act - Test the complete flow
    const registerResponse = await request(app)
      .post('/api/register')
      .send(userData)
    
    // Assert - Verify all aspects
    expect(registerResponse.status).toBe(201)
    expect(registerResponse.body).toHaveProperty('id')
    
    // Verify database state
    const user = await getUserById(registerResponse.body.id, transaction)
    expect(user.email).toBe(userData.email)
    
    // Verify side effects (e.g., welcome email)
    expect(mockEmailService.getSentEmails()).toHaveLength(1)
  })
})
```

## Database Testing Strategy

### Containerized Test Database
```yaml
# docker-compose.test.yml
version: '3.8'
services:
  test-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp_test
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_pass
    ports:
      - "5433:5432"  # Different port to avoid conflicts
    tmpfs:
      - /var/lib/postgresql/data  # In-memory for speed
```

### Transaction-Based Isolation (Recommended)
```typescript
// lib/test-helpers.ts
export class TestDatabaseManager {
  private static instance: TestDatabaseManager
  
  async beginTransaction(): Promise<DatabaseTransaction> {
    const tx = await this.db.transaction()
    // Inject transaction into your app's database layer
    app.setDatabaseTransaction(tx)
    return tx
  }
  
  async seedMinimalData(tx?: DatabaseTransaction) {
    // Only seed absolutely necessary data
    await this.db.insert(roles).values([
      { name: 'user' },
      { name: 'admin' }
    ]).execute(tx)
  }
}

// Usage in tests
export async function withTestTransaction<T>(
  fn: (tx: DatabaseTransaction) => Promise<T>
): Promise<T> {
  const tx = await testDb.beginTransaction()
  try {
    await seedMinimalData(tx)
    return await fn(tx)
  } finally {
    await tx.rollback()
  }
}
```

### Test Data Factories
```typescript
// test/factories/index.ts
export const testDataFactories = {
  createUser: (overrides = {}) => ({
    id: `user-${Date.now()}-${Math.random()}`,
    email: `test-${Date.now()}@example.com`,
    name: 'Test User',
    createdAt: new Date(),
    ...overrides
  }),
  
  createApiKey: (provider: string, overrides = {}) => {
    const defaults = {
      openai: {
        privateKey: 'sk-test-1234567890abcdefghijklmnopqrstuvwxyz',
        metadata: { model: 'gpt-4', organization: 'test-org' }
      },
      stripe: {
        privateKey: 'sk_test_1234567890abcdefghijklmnopqrstuvwxyz',
        publicKey: 'pk_test_1234567890abcdefghijklmnopqrstuvwxyz',
        metadata: { mode: 'test', webhook_secret: 'whsec_test' }
      }
    }
    
    return {
      userId: `user-${Date.now()}`,
      provider,
      ...defaults[provider],
      ...overrides
    }
  }
}
```

## Testing Categories

### 1. Complete Workflow Testing
```typescript
describe('CRUD Workflow - Complete User Journey', () => {
  it('should perform complete CRUD workflow', async () => {
    await withTestTransaction(async (tx) => {
      // CREATE
      const createResponse = await request(app)
        .post('/api/items')
        .send(testDataFactories.createItem())
      
      expect(createResponse.status).toBe(201)
      const itemId = createResponse.body.id
      
      // READ - Verify creation
      const getResponse = await request(app)
        .get(`/api/items/${itemId}`)
      
      expect(getResponse.body.name).toBe('Test Item')
      
      // UPDATE
      const updateResponse = await request(app)
        .put(`/api/items/${itemId}`)
        .send({ name: 'Updated Item' })
      
      expect(updateResponse.status).toBe(200)
      
      // DELETE
      const deleteResponse = await request(app)
        .delete(`/api/items/${itemId}`)
      
      expect(deleteResponse.status).toBe(204)
      
      // Verify deletion
      const finalGet = await request(app)
        .get(`/api/items/${itemId}`)
      
      expect(finalGet.status).toBe(404)
    })
  })
})
```

### 2. Contract Validation
```typescript
describe('API Contract Validation', () => {
  it('should maintain consistent API response format', async () => {
    const response = await request(app)
      .get('/api/users')
      .expect(200)
    
    // Validate response schema
    expect(response.body).toMatchObject({
      data: expect.any(Array),
      pagination: {
        page: expect.any(Number),
        pageSize: expect.any(Number),
        total: expect.any(Number)
      }
    })
    
    // Use JSON Schema for stricter validation
    const valid = ajv.validate(userListSchema, response.body)
    expect(valid).toBe(true)
  })
})
```

### 3. Error Handling and Edge Cases
```typescript
describe('Error Handling', () => {
  it('should handle database constraints gracefully', async () => {
    const user = testDataFactories.createUser({
      email: 'duplicate@example.com'
    })
    
    // First creation should succeed
    await request(app)
      .post('/api/users')
      .send(user)
      .expect(201)
    
    // Duplicate should fail with proper error
    const response = await request(app)
      .post('/api/users')
      .send(user)
      .expect(409)
    
    expect(response.body.errorCode).toBe('USER_EMAIL_EXISTS')
    expect(response.body.field).toBe('email')
  })
  
  it('should handle external service failures', async () => {
    // Mock external service failure
    mockExternalServices.paymentGateway
      .onPost('/charge')
      .reply(500, { error: 'Service unavailable' })
    
    const response = await request(app)
      .post('/api/payments')
      .send({ amount: 100 })
      .expect(503)
    
    expect(response.body.errorCode).toBe('PAYMENT_SERVICE_UNAVAILABLE')
    expect(response.body.retryable).toBe(true)
  })
})
```

### 4. Performance and Timeout Testing
```typescript
describe('Performance Testing', () => {
  it('should handle slow database queries gracefully', async () => {
    // Simulate slow query
    jest.spyOn(db, 'query').mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 5000))
      throw new Error('Query timeout')
    })
    
    const response = await request(app)
      .get('/api/reports/complex')
      .expect(504)
    
    expect(response.body.errorCode).toBe('REQUEST_TIMEOUT')
    expect(response.body.timeout).toBe(5000)
  })
})
```

## External Service Testing

### Service Virtualization
```typescript
// test/mocks/external-services.ts
import { MockAdapter } from 'axios-mock-adapter'

export const mockExternalServices = {
  openAI: new MockAdapter(openAIClient),
  stripe: new MockAdapter(stripeClient),
  emailService: new MockAdapter(emailClient)
}

// Usage in tests
beforeEach(() => {
  mockExternalServices.openAI
    .onPost('/v1/chat/completions')
    .reply(200, {
      choices: [{
        message: { content: 'Mocked response' }
      }]
    })
})
```

### Testing with Real External Services (Staging/Sandbox)
```typescript
describe('Payment Integration (Sandbox)', () => {
  // Skip in CI to avoid flakiness
  const testIf = process.env.CI ? it.skip : it
  
  testIf('should process payment through Stripe sandbox', async () => {
    const payment = {
      amount: 1000,
      currency: 'usd',
      source: 'tok_visa' // Stripe test token
    }
    
    const response = await request(app)
      .post('/api/payments')
      .send(payment)
      .expect(200)
    
    expect(response.body.chargeId).toMatch(/^ch_test_/)
  })
})
```

## Best Practices Checklist

### ✅ Do's
- Use transaction-based isolation for speed and reliability
- Create realistic test data with factories
- Test complete workflows, not just individual endpoints
- Validate API contracts and response formats
- Test both success and failure scenarios
- Use containerized databases with tmpfs for speed
- Mock external services to avoid flakiness
- Run tests in parallel when possible
- Monitor and optimize slow tests
- Use proper setup/teardown to ensure clean state

### ❌ Don'ts
- Don't share state between tests
- Don't use production databases or services
- Don't test every edge case (that's for unit tests)
- Don't use hardcoded IDs or data
- Don't skip error scenario testing
- Don't let tests become too slow (>5 seconds per test)
- Don't ignore flaky tests - fix them immediately
- Don't test implementation details, focus on behavior
- Don't forget to test authentication and authorization
- Don't use actual external APIs in CI/CD pipelines

## Testing Pyramid Alignment

### Distribution
- **Unit Tests (70-80%)**: Fast, focused on logic
- **Integration Tests (15-25%)**: Key workflows and interactions
- **E2E Tests (5-10%)**: Critical user journeys

### Integration Test Focus Areas
For maximum value, integration tests should cover:

1. **Complete CRUD workflows** - Full lifecycle testing
2. **API contract validation** - Response format consistency
3. **Database constraints** - Foreign keys, unique constraints
4. **Authentication/Authorization** - Access control flows
5. **External service integration** - API calls, message queues
6. **Error handling** - Graceful degradation
7. **Data transformation** - Serialization/deserialization
8. **Transaction boundaries** - Rollback scenarios

## Performance Optimization

### Speed Improvements
```typescript
// Parallel test execution
export default {
  maxWorkers: process.env.CI ? 4 : '50%',
  testTimeout: 30000
}

// Shared test database connection pool
let dbPool: DatabasePool

beforeAll(async () => {
  dbPool = await createTestDatabasePool({
    max: 10,
    idleTimeoutMillis: 1000
  })
})

// Minimal data seeding
async function seedMinimalData() {
  // Only seed what's absolutely necessary
  // Use lazy loading for additional data
}
```

### Monitoring Test Performance
```typescript
// test/helpers/performance.ts
export function trackTestPerformance() {
  let startTime: number
  
  beforeEach(() => {
    startTime = Date.now()
  })
  
  afterEach(() => {
    const duration = Date.now() - startTime
    const testName = expect.getState().currentTestName
    
    if (duration > 3000) {
      console.warn(`Slow test detected: ${testName} took ${duration}ms`)
    }
    
    // Optional: Send to monitoring service
    metrics.recordTestDuration(testName, duration)
  })
}
```

## Common Patterns and Anti-Patterns

### ✅ Good Pattern: Test Data Builders
```typescript
const user = testDataFactories.createUser({
  role: 'admin',
  email: 'admin@test.com'
})
```

### ❌ Anti-Pattern: Shared Mutable State
```typescript
// DON'T DO THIS
let sharedUser: User

beforeAll(async () => {
  sharedUser = await createUser() // Shared between tests
})
```

### ✅ Good Pattern: Explicit State Verification
```typescript
// Verify state explicitly
const users = await db.select().from(usersTable)
expect(users).toHaveLength(1)
expect(users[0].email).toBe('test@example.com')
```

### ❌ Anti-Pattern: Testing Implementation Details
```typescript
// DON'T DO THIS
expect(service._privateMethod()).toBe(true) // Testing internals
```

## Tools and Frameworks

### Testing Frameworks
- **API Testing**: Supertest, REST Assured, Postman/Newman
- **Database Testing**: TestContainers, Docker Compose
- **Service Mocking**: MSW, WireMock, Nock
- **Contract Testing**: Pact, Spring Cloud Contract
- **Schema Validation**: Ajv, Joi, Zod

### Recommended Stack for Modern SaaS
```json
{
  "test-framework": "Jest or Vitest",
  "api-testing": "Supertest",
  "database": "TestContainers or Docker Compose",
  "mocking": "MSW for HTTP, Jest mocks for modules",
  "assertions": "Jest matchers + custom matchers",
  "ci-cd": "GitHub Actions, CircleCI, or GitLab CI"
}
```

## Summary

Effective integration testing requires finding the right balance between coverage and maintainability. Focus on testing the interactions between components, use transaction-based isolation for speed, create realistic test scenarios, and always clean up after your tests. Remember that integration tests complement unit tests - they catch different types of issues and together form a comprehensive testing strategy.

The key to successful integration testing is to keep tests fast, independent, and focused on real-world scenarios. By following these best practices, you'll build a test suite that gives you confidence in your system's behavior while remaining maintainable as your application grows.