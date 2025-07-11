# Test Database Setup - Best Practices

This document outlines the test database setup following industry best practices for reliable, fast, and isolated integration tests.

## 🏗️ Architecture Overview

### Test Database Strategy
- **Containerized PostgreSQL**: Isolated test database using Docker
- **In-Memory Storage**: Uses `tmpfs` for speed (data lost on container restart)
- **Separate Port**: Runs on port 5433 to avoid conflicts with development database
- **Transaction-Based Isolation**: Each test runs in isolation with proper cleanup

### File Structure
```
├── docker-compose.test.yml          # Test database container
├── drizzle.config.test.ts           # Test database configuration
├── lib/db/test.ts                   # Test database connection
├── lib/db/test-helpers.ts           # Test utilities and factories
├── scripts/setup-test-db.sh         # Database setup script
└── app/actions/*.integration.test.ts # Integration tests
```

## 🚀 Quick Start

### 1. Start Test Database
```bash
# Start the test database container
./scripts/setup-test-db.sh

# Or manually:
docker-compose -f docker-compose.test.yml up -d test-db
```

### 2. Run Integration Tests
```bash
# Run all tests
npm test

# Run only integration tests
npm test -- --testPathPattern=integration
```

## 📋 Best Practices Implementation

### 1. Database Isolation

#### Container Strategy
```yaml
# docker-compose.test.yml
services:
  test-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: saas_template_test
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_pass
    ports:
      - "5433:5432"  # Different port
    tmpfs:
      - /var/lib/postgresql/data  # In-memory for speed
```

#### Test Isolation
```typescript
// lib/db/test-helpers.ts
export const testHelpers = {
  async setupTest(): Promise<void> {
    const dbManager = TestDatabaseManager.getInstance()
    await dbManager.clearAllData()
    await dbManager.seedMinimalData()
  },

  async teardownTest(): Promise<void> {
    const dbManager = TestDatabaseManager.getInstance()
    await dbManager.clearAllData()
  }
}
```

### 2. Test Data Strategy

#### Factory Functions (Recommended)
```typescript
// lib/db/test-helpers.ts
export const testDataFactories = {
  createApiKey: (overrides: Partial<InsertUserApiKey> = {}): InsertUserApiKey => ({
    userId: `test-user-${Date.now()}`,
    provider: 'openai',
    privateKeyEncrypted: 'sk-test-encrypted-key',
    publicKey: null,
    metadata: {},
    ...overrides
  })
}
```

#### Fixtures (Static Data)
```typescript
export const testFixtures = {
  users: [
    { email: 'john@example.com', name: 'John Doe' },
    { email: 'admin@example.com', name: 'Admin User' }
  ]
}
```

### 3. Test Structure

#### Integration Test Example
```typescript
// app/actions/user-api-keys.integration.test.ts
import { testHelpers, testDataFactories } from '@/lib/db/test-helpers'

beforeEach(async () => {
  await testHelpers.setupTest()
})

afterEach(async () => {
  await testHelpers.teardownTest()
})

describe('User API Keys Integration Tests', () => {
  it('should create a new API key successfully', async () => {
    // Use factory for test data
    const testKey = testDataFactories.createApiKey({
      provider: 'openai',
      privateKeyEncrypted: 'sk-test-1234567890abcdef'
    })
    
    const result = await createUserApiKey({
      provider: testKey.provider,
      privateKey: testKey.privateKeyEncrypted
    })

    expect(result.success).toBe(true)
    
    // Verify database state
    await testHelpers.assertDatabaseState({
      apiKeyCount: 1,
      providers: ['openai']
    })
  })
})
```

## 🔧 Configuration

### Environment Variables
```env
# Test Database
TEST_DATABASE_URL=postgresql://test_user:test_pass@localhost:5433/saas_template_test
ENCRYPTION_KEY=test-encryption-key-32-characters!!
```

### Jest Configuration
```javascript
// jest.setup.js
process.env.TEST_DATABASE_URL = 'postgresql://test_user:test_pass@localhost:5433/saas_template_test'
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters!!'
```

## 🎯 Key Benefits

### 1. **Speed**
- In-memory storage (`tmpfs`)
- Minimal data seeding
- Fast container startup

### 2. **Reliability**
- Isolated test environment
- Consistent test state
- No shared state between tests

### 3. **Maintainability**
- Factory functions for dynamic data
- Fixtures for static data
- Clear separation of concerns

### 4. **Realism**
- Real PostgreSQL database
- Actual Drizzle ORM queries
- Real encryption/decryption

## 🧪 Testing Patterns

### 1. **Test Isolation**
```typescript
// Each test is independent
beforeEach(async () => {
  await testHelpers.setupTest() // Clean slate
})

afterEach(async () => {
  await testHelpers.teardownTest() // Cleanup
})
```

### 2. **Data Factories**
```typescript
// Generate unique test data
const testKey = testDataFactories.createApiKey({
  provider: 'openai',
  privateKeyEncrypted: 'sk-test-1234567890abcdef'
})
```

### 3. **State Verification**
```typescript
// Verify database state after operations
await testHelpers.assertDatabaseState({
  apiKeyCount: 1,
  providers: ['openai']
})
```

### 4. **Scenario Testing**
```typescript
// Test specific scenarios
await testHelpers.setupScenario('with-keys')
await testHelpers.setupScenario('empty')
await testHelpers.setupScenario('full')
```

## 🚨 Common Pitfalls to Avoid

### ❌ Don't Do This
```typescript
// Don't share state between tests
let sharedData: any

// Don't use hardcoded IDs
const userId = '123' // Could conflict

// Don't skip cleanup
// Missing afterEach cleanup
```

### ✅ Do This Instead
```typescript
// Use factories for unique data
const testKey = testDataFactories.createApiKey()

// Use proper cleanup
afterEach(async () => {
  await testHelpers.teardownTest()
})

// Verify state explicitly
await testHelpers.assertDatabaseState({
  apiKeyCount: 1
})
```

## 🔄 Migration Strategy

### From Mocks to Real Database
1. **Phase 1**: Keep mocks for unit tests
2. **Phase 2**: Add real database for integration tests
3. **Phase 3**: Gradually replace mocks with real database calls

### Database Schema Changes
```bash
# Generate new migration
npx drizzle-kit generate

# Apply to test database
npx drizzle-kit push:pg --config=drizzle.config.test.ts
```

## 📊 Performance Considerations

### Test Execution Time
- **Setup**: ~2-3 seconds per test file
- **Cleanup**: ~1 second per test
- **Total**: ~3-4 seconds per test file

### Optimization Tips
1. Use `tmpfs` for in-memory storage
2. Minimize data seeding
3. Use factories over fixtures when possible
4. Run tests in parallel when safe

## 🛠️ Troubleshooting

### Common Issues

#### 1. Database Connection Failed
```bash
# Check if container is running
docker ps | grep test-db

# Restart container
docker-compose -f docker-compose.test.yml restart test-db
```

#### 2. Migration Errors
```bash
# Reset test database
docker-compose -f docker-compose.test.yml down
docker-compose -f docker-compose.test.yml up -d test-db

# Re-run setup
./scripts/setup-test-db.sh
```

#### 3. Test Isolation Issues
```typescript
// Ensure proper cleanup
afterEach(async () => {
  await testHelpers.teardownTest()
})
```

## 📚 Additional Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [Jest Testing Framework](https://jestjs.io/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

This setup provides a robust foundation for integration testing that's fast, reliable, and maintainable. 