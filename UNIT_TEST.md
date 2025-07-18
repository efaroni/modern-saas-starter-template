# Unit Testing Best Practices Guide

## Overview

Unit tests are automated tests that verify individual components or functions in isolation. They form the foundation of a robust testing strategy, ensuring code reliability at the smallest functional level while enabling confident refactoring and rapid development.

## Core Principles

### Test One Thing at a Time
Each unit test should focus on a single behavior or scenario. When a test fails, it should be immediately clear what functionality is broken.

### Follow the AAA Pattern
Structure every test using Arrange-Act-Assert:
```typescript
it('should calculate the correct total with tax', () => {
  // Arrange - Set up test data and dependencies
  const calculator = new PriceCalculator()
  const items = [{ price: 100 }, { price: 50 }]
  const taxRate = 0.08
  
  // Act - Execute the function being tested
  const total = calculator.calculateTotal(items, taxRate)
  
  // Assert - Verify the expected outcome
  expect(total).toBe(162) // 150 + (150 * 0.08)
})
```

### Keep Tests Independent
Tests should not depend on execution order or share state. Each test must be able to run in isolation and produce consistent results.

### Make Tests Fast
Unit tests should run in milliseconds, not seconds. Mock external dependencies and avoid I/O operations.

## Writing Effective Unit Tests

### Clear and Descriptive Test Names
```typescript
// ❌ Bad: Vague test name
it('should work correctly', () => {})

// ✅ Good: Descriptive name following MethodName_StateUnderTest_ExpectedBehavior
it('calculateDiscount_whenUserIsVIP_shouldApply20PercentDiscount', () => {})

// ✅ Also good: Natural language description
it('should apply 20% discount when user has VIP status', () => {})
```

### Comprehensive Test Coverage
```typescript
describe('PasswordValidator', () => {
  describe('validate', () => {
    // Happy path
    it('should return true for valid password', () => {
      const result = validator.validate('SecureP@ss123')
      expect(result.isValid).toBe(true)
    })
    
    // Edge cases
    it('should reject password shorter than 8 characters', () => {
      const result = validator.validate('Short1!')
      expect(result.isValid).toBe(false)
      expect(result.errorCode).toBe('PASSWORD_TOO_SHORT')
      expect(result.minLength).toBe(8)
    })
    
    // Boundary conditions
    it('should accept password with exactly 8 characters', () => {
      const result = validator.validate('Exact8!@')
      expect(result.isValid).toBe(true)
    })
    
    // Error scenarios
    it('should handle null input gracefully', () => {
      const result = validator.validate(null)
      expect(result.isValid).toBe(false)
      expect(result.errorCode).toBe('PASSWORD_REQUIRED')
    })
  })
})
```

### Effective Mocking
```typescript
// Mock external dependencies to isolate the unit under test
describe('UserService', () => {
  let userService: UserService
  let mockDatabase: jest.Mocked<Database>
  let mockEmailService: jest.Mocked<EmailService>
  
  beforeEach(() => {
    mockDatabase = createMockDatabase()
    mockEmailService = createMockEmailService()
    userService = new UserService(mockDatabase, mockEmailService)
  })
  
  it('should send welcome email when user is created', async () => {
    // Arrange
    const newUser = { email: 'test@example.com', name: 'Test User' }
    mockDatabase.insert.mockResolvedValue({ id: 1, ...newUser })
    
    // Act
    await userService.createUser(newUser)
    
    // Assert - Verify the interaction
    expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledWith(
      'test@example.com',
      'Test User'
    )
  })
})
```

## Best Practices Checklist

### ✅ Do's
- Write tests before or alongside production code (TDD/BDD)
- Keep tests simple, readable, and focused
- Use meaningful assertions that clearly express intent
- Test both positive and negative scenarios
- Maintain fast test execution (aim for milliseconds per test)
- Use descriptive test names that explain the scenario
- Group related tests using describe blocks
- Mock external dependencies (database, API calls, file system)
- Use test data builders for complex objects
- Test edge cases and boundary conditions
- Keep test code DRY using helper functions and shared setup

### ❌ Don'ts
- Don't test implementation details, focus on behavior
- Don't test multiple units together (that's integration testing)
- Don't use production data or external services
- Don't write tests that are harder to understand than the code
- Don't ignore flaky tests - fix them immediately
- Don't test private methods directly - test through public interface
- Don't use random data that could cause intermittent failures
- Don't skip writing tests for "simple" functions
- Don't let test code quality slip - maintain it like production code
- Don't mock everything - some simple utilities can be used directly

## Common Testing Patterns

### Parameterized Tests
Reduce duplication when testing multiple scenarios:
```typescript
// Jest/Vitest
describe('calculateTax', () => {
  test.each([
    { income: 0, expected: 0 },
    { income: 10000, expected: 1000 },
    { income: 50000, expected: 7500 },
    { income: 100000, expected: 20000 },
  ])('should calculate $expected tax for $income income', ({ income, expected }) => {
    expect(calculateTax(income)).toBe(expected)
  })
})

// Python pytest
@pytest.mark.parametrize("income,expected", [
    (0, 0),
    (10000, 1000),
    (50000, 7500),
    (100000, 20000),
])
def test_calculate_tax(income, expected):
    assert calculate_tax(income) == expected
```

### Testing Async Code
```typescript
describe('DataFetcher', () => {
  it('should fetch user data successfully', async () => {
    // Mock the API call
    mockApi.get.mockResolvedValue({ 
      data: { id: 1, name: 'John Doe' } 
    })
    
    const user = await dataFetcher.fetchUser(1)
    
    expect(user).toEqual({ id: 1, name: 'John Doe' })
    expect(mockApi.get).toHaveBeenCalledWith('/users/1')
  })
  
  it('should handle API errors gracefully', async () => {
    mockApi.get.mockRejectedValue({
      response: { 
        status: 404,
        data: { errorCode: 'USER_NOT_FOUND' }
      }
    })
    
    await expect(dataFetcher.fetchUser(1))
      .rejects
      .toMatchObject({
        code: 'USER_NOT_FOUND',
        statusCode: 404
      })
  })
})
```

### Testing Error Scenarios
```typescript
describe('FileProcessor', () => {
  it('should throw error for unsupported file type', () => {
    expect(() => {
      fileProcessor.process('document.pdf')
    }).toThrow(UnsupportedFileTypeError)
    
    // Or if using error codes
    try {
      fileProcessor.process('document.pdf')
    } catch (error) {
      expect(error.code).toBe('UNSUPPORTED_FILE_TYPE')
      expect(error.fileType).toBe('pdf')
      expect(error.supportedTypes).toEqual(['csv', 'json', 'xml'])
    }
  })
  
  it('should handle file read errors', async () => {
    mockFs.readFile.mockRejectedValue(new Error('Permission denied'))
    
    const result = await fileProcessor.process('data.csv')
    
    expect(result.success).toBe(false)
    expect(result.errorCode).toBe('FILE_READ_ERROR')
    expect(result.errorType).toBe('PERMISSION_DENIED')
  })
})
```

### Test Data Builders
Create maintainable test data:
```typescript
// test/builders/user.builder.ts
export class UserBuilder {
  private user: User = {
    id: 'default-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    createdAt: new Date('2024-01-01')
  }
  
  withId(id: string): this {
    this.user.id = id
    return this
  }
  
  withEmail(email: string): this {
    this.user.email = email
    return this
  }
  
  asAdmin(): this {
    this.user.role = 'admin'
    return this
  }
  
  build(): User {
    return { ...this.user }
  }
}

// Usage in tests
const adminUser = new UserBuilder()
  .withEmail('admin@example.com')
  .asAdmin()
  .build()
```

## Testing Different Types of Code

### Pure Functions
```typescript
// Easiest to test - no side effects
describe('calculateCompoundInterest', () => {
  it('should calculate correct interest for valid inputs', () => {
    const result = calculateCompoundInterest({
      principal: 1000,
      rate: 0.05,
      time: 10,
      compound: 12
    })
    
    expect(result).toBeCloseTo(1647.01, 2)
  })
})
```

### Classes and Methods
```typescript
describe('ShoppingCart', () => {
  let cart: ShoppingCart
  
  beforeEach(() => {
    cart = new ShoppingCart()
  })
  
  describe('addItem', () => {
    it('should add item to empty cart', () => {
      const item = { id: '1', name: 'Widget', price: 10 }
      
      cart.addItem(item)
      
      expect(cart.getItems()).toHaveLength(1)
      expect(cart.getTotal()).toBe(10)
    })
    
    it('should increase quantity for duplicate items', () => {
      const item = { id: '1', name: 'Widget', price: 10 }
      
      cart.addItem(item)
      cart.addItem(item)
      
      expect(cart.getItems()).toHaveLength(1)
      expect(cart.getItems()[0].quantity).toBe(2)
      expect(cart.getTotal()).toBe(20)
    })
  })
})
```

### Functions with Side Effects
```typescript
describe('Logger', () => {
  let mockConsole: jest.SpyInstance
  
  beforeEach(() => {
    mockConsole = jest.spyOn(console, 'log').mockImplementation()
  })
  
  afterEach(() => {
    mockConsole.mockRestore()
  })
  
  it('should log message with timestamp', () => {
    const fixedDate = new Date('2024-01-01T12:00:00Z')
    jest.useFakeTimers().setSystemTime(fixedDate)
    
    logger.info('Test message')
    
    expect(mockConsole).toHaveBeenCalledWith(
      '[2024-01-01T12:00:00.000Z] INFO: Test message'
    )
    
    jest.useRealTimers()
  })
})
```

## Test Doubles and Mocking

### Types of Test Doubles
```typescript
// Stub - Returns predetermined values
const stubDatabase = {
  getUser: jest.fn().mockReturnValue({ id: 1, name: 'John' })
}

// Mock - Verifies interactions
const mockEmailService = {
  send: jest.fn()
}
// Later: expect(mockEmailService.send).toHaveBeenCalledWith(...)

// Spy - Records calls while executing real implementation
const spy = jest.spyOn(calculator, 'add')
calculator.calculate(5, 3)
expect(spy).toHaveBeenCalledWith(5, 3)

// Fake - Working implementation for testing
class FakeUserRepository {
  private users = new Map()
  
  async save(user: User): Promise<void> {
    this.users.set(user.id, user)
  }
  
  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null
  }
}
```

## Test Organization and Maintenance

### File Structure
```
src/
  components/
    UserCard.tsx
    UserCard.test.tsx    # Colocate tests with code
  services/
    auth/
      AuthService.ts
      AuthService.test.ts
  utils/
    validation.ts
    validation.test.ts
    
# Or separate test directory
tests/
  unit/
    components/
      UserCard.test.tsx
    services/
      AuthService.test.ts
  integration/
    api/
      users.test.ts
```

### Shared Test Utilities
```typescript
// test/utils/setup.ts
export function setupMockDate(date: string) {
  const fixedDate = new Date(date)
  jest.useFakeTimers().setSystemTime(fixedDate)
  
  return () => jest.useRealTimers()
}

// test/utils/assertions.ts
export function expectToBeWithinRange(
  actual: number,
  min: number,
  max: number
) {
  expect(actual).toBeGreaterThanOrEqual(min)
  expect(actual).toBeLessThanOrEqual(max)
}
```

## Performance and Optimization

### Keep Tests Fast
```typescript
// ❌ Slow: Real timer
it('should retry after delay', async () => {
  await service.fetchWithRetry()
  await new Promise(resolve => setTimeout(resolve, 5000))
  expect(mockApi.get).toHaveBeenCalledTimes(2)
})

// ✅ Fast: Fake timers
it('should retry after delay', async () => {
  jest.useFakeTimers()
  
  const promise = service.fetchWithRetry()
  
  jest.advanceTimersByTime(5000)
  await promise
  
  expect(mockApi.get).toHaveBeenCalledTimes(2)
  jest.useRealTimers()
})
```

### Optimize Test Execution
```javascript
// jest.config.js
module.exports = {
  // Run tests in parallel
  maxWorkers: '50%',
  
  // Cache transformation results
  cacheDirectory: '.jest-cache',
  
  // Only run tests for changed files
  onlyChanged: true, // in watch mode
  
  // Fail fast
  bail: 1, // stop after first test failure in CI
}
```

## Common Pitfalls and How to Avoid Them

### ❌ Testing Implementation Details
```typescript
// Bad: Testing private method
it('should format date correctly', () => {
  // @ts-ignore accessing private method
  expect(service._formatDate(date)).toBe('2024-01-01')
})

// Good: Test through public interface
it('should return formatted user data', () => {
  const user = service.getUser(1)
  expect(user.createdDate).toBe('2024-01-01')
})
```

### ❌ Overmocking
```typescript
// Bad: Mocking simple utilities
jest.mock('./utils/math')

// Good: Use real implementation for simple, deterministic functions
import { add } from './utils/math' // Use the real function
```

### ❌ Unclear Test Failures
```typescript
// Bad: Generic assertion
expect(result).toBeTruthy()

// Good: Specific assertion with clear failure message
expect(result.success).toBe(true)
expect(result.data).toEqual({ id: 1, status: 'active' })
```

## Tools and Frameworks

### Popular Unit Testing Frameworks
- **JavaScript/TypeScript**: Jest, Vitest, Mocha + Chai
- **Python**: pytest, unittest
- **Java**: JUnit 5, TestNG
- **C#**: xUnit, NUnit, MSTest
- **Go**: Built-in testing package, Testify
- **Ruby**: RSpec, Minitest
- **PHP**: PHPUnit, Pest

### Useful Testing Libraries
- **Mocking**: Jest mocks, Sinon.js, ts-mockito
- **Assertions**: Chai, Jest matchers, Hamcrest
- **Test Data**: Faker.js, Chance.js, Factory Bot
- **Coverage**: Istanbul/nyc, Jest coverage, Coverage.py
- **Mutation Testing**: Stryker, PIT

## Summary

Effective unit testing is a skill that improves with practice. Focus on writing tests that are fast, reliable, and maintainable. Remember:

1. **Test behavior, not implementation** - Your tests should survive refactoring
2. **Keep tests simple and focused** - One concept per test
3. **Use descriptive names** - Tests serve as documentation
4. **Mock external dependencies** - Keep tests fast and deterministic
5. **Maintain test quality** - Treat test code with the same care as production code

Well-written unit tests give you confidence to refactor, add features, and fix bugs without breaking existing functionality. They're an investment in your code's future maintainability and your team's productivity.