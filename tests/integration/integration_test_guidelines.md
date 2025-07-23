# Integration Test Guidelines

## Introduction

This document outlines our team's approach to integration testing. Integration tests verify that different components of our system work correctly together, bridging the gap between unit tests (which test individual functions) and E2E tests (which test complete user workflows). Following these guidelines helps us catch integration issues early, maintain confidence in our API contracts, and ship quality code quickly.

## Integration Test Guidelines

### 1. Test Real Interactions, Mock External Dependencies

Focus on testing real interactions between your application components (e.g., API endpoints with database queries) while mocking external services like payment providers or email services.

**Example**: When testing a user registration endpoint, use a real test database but mock the email service:

```javascript
// Good: Real DB, mocked email
it('creates user and sends welcome email', async () => {
  const emailMock = jest.fn();
  const response = await request(app)
    .post('/api/users')
    .send({ email: 'test@example.com', password: 'secure123' });

  expect(response.status).toBe(201);
  expect(await User.findByEmail('test@example.com')).toBeTruthy();
  expect(emailMock).toHaveBeenCalledWith('welcome', 'test@example.com');
});
```

### 2. Keep Tests Independent and Idempotent

Each test should set up its own data and clean up after itself. Tests should produce the same result whether run once or multiple times.

**Example**: Use database transactions or cleanup hooks:

```javascript
beforeEach(async () => {
  await db.migrate.latest();
  await db.seed.run();
});

afterEach(async () => {
  await db.rollback();
});
```

### 3. Test Critical User Journeys

Prioritize testing the paths that directly impact user experience and business value. Don't aim for 100% coverage—focus on what matters.

**Critical paths to test**:

- Authentication and authorization flows
- Payment processing workflows
- Core CRUD operations for your main entities
- Data validation and error handling

### 4. Use Realistic Test Data

Create test data that mirrors production scenarios, including edge cases. Avoid using "test1", "test2" naming patterns.

**Example**:

```javascript
const testUsers = [
  { name: 'María García', email: 'maria.garcia@example.com' },
  { name: "John O'Brien", email: 'john.obrien@example.com' }, // Test special characters
  { name: '李明', email: 'li.ming@example.com' }, // Test Unicode
];
```

### 5. Test Error Scenarios Explicitly

Don't just test the happy path. Verify your application handles errors gracefully and returns appropriate error codes.

**Example**:

```javascript
it('returns 409 when email already exists', async () => {
  await User.create({ email: 'existing@example.com' });

  const response = await request(app)
    .post('/api/users')
    .send({ email: 'existing@example.com', password: 'password123' });

  expect(response.status).toBe(409);
  expect(response.body.error).toBeDefined();
});
```

### 6. Keep Tests Fast and Focused

Integration tests are slower than unit tests but shouldn't take forever. Aim for each test to complete in under 1 second.

**Tips for speed**:

- Use in-memory databases when possible (SQLite for tests)
- Parallelize test suites that don't share state
- Only seed necessary data for each test
- Consider using database snapshots for complex setups

## Best Practices for Implementation

### 1. Establish Clear Naming Conventions

Use descriptive test names that explain what is being tested and the expected outcome:

```javascript
// Good: Clear intent and expected result
it('returns 404 when updating non-existent resource', ...)

// Bad: Vague and unclear
it('handles update errors', ...)
```

### 2. Create Shared Test Utilities

Build helper functions for common operations to keep tests DRY and maintainable:

```javascript
// testUtils.js
export const authenticatedRequest = app => {
  const agent = request.agent(app);
  beforeEach(async () => {
    await agent.post('/api/auth/login').send(testCredentials);
  });
  return agent;
};
```

### 3. Run Integration Tests in CI/CD

Configure your pipeline to run integration tests on every pull request. Use environment variables to ensure tests run against dedicated test databases and services.

### 4. Document Complex Test Setups

When a test requires specific configuration or context, add comments explaining why:

```javascript
// This test verifies our rate limiting works correctly.
// We need to make 11 requests because the limit is 10 per minute.
it('rate limits after 10 requests', async () => { ... });
```

### 5. Review and Refactor Tests Regularly

Treat test code with the same care as production code. Remove obsolete tests, refactor duplicated logic, and ensure tests remain relevant as your application evolves.

## Conclusion

Following these integration test guidelines helps us maintain a robust, reliable codebase while moving quickly. Well-written integration tests catch bugs that unit tests miss and are more maintainable than extensive E2E test suites. By focusing on critical paths, keeping tests independent and fast, and maintaining clear documentation, we can confidently ship features knowing our system components work well together.
