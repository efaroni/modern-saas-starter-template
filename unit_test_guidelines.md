# Unit Testing Guidelines

Introduction
This document outlines our approach to unit testing for rapid, high-quality development. Unit tests form the foundation of our testing pyramid (70-80% of all tests), focusing on individual functions, methods, and components in isolation. By following these guidelines, we ensure fast feedback loops, maintainable code, and confidence in our business logic.
Key Principle: Test behavior, not implementation. Focus on what the code does for users, not how it achieves it.
File Structure
Default: Colocation Pattern (Use This)
Claude Code will use this pattern by default. Keep test files next to the code they test for better maintainability and easier navigation:
src/
├── components/
│ ├── Button.tsx
│ ├── Button.test.tsx
│ └── Button.stories.tsx
├── utils/
│ ├── validation.ts
│ └── validation.test.ts
└── services/
├── payment/
│ ├── payment.service.ts
│ ├── payment.service.test.ts
│ └── payment.types.ts

Why colocation works best:
Tests are immediately visible next to the code they test
Easier to maintain when refactoring or moving files
Import paths are simpler and more stable
Encourages writing tests (they're right there!)
Better for Claude Code to understand context and relationships
Alternative: Separate Test Directory
Some teams prefer separation, but this adds complexity:
src/
├── components/
├── utils/
└── services/
tests/
├── unit/
│ ├── components/
│ ├── utils/
│ └── services/
└── fixtures/

Note: Only use this pattern if you have strong organizational requirements for it.
Naming Conventions
Test Files
Pattern: [filename].test.[ext] or [filename].spec.[ext]
Examples: userService.test.ts, Button.test.tsx
Test Suites and Cases
// Describe what is being tested
describe('UserService', () => {
// Use "should" or "when" for behavior
describe('validateEmail', () => {
it('should return true for valid email formats', () => {
// Test implementation
});

    it('should return false when email is missing @ symbol', () => {
      // Test implementation
    });

});

describe('when creating a new user', () => {
it('should hash the password before saving', () => {
// Test implementation
});
});
});

Test Organization
AAA Pattern (Arrange, Act, Assert)
it('should calculate the correct total price with tax', () => {
// Arrange
const items = [
{ price: 10, quantity: 2 },
{ price: 5, quantity: 1 }
];
const taxRate = 0.08;

// Act
const total = calculateTotal(items, taxRate);

// Assert
expect(total).toBe(27); // (20 + 5) \* 1.08
});

Group Related Tests
describe('StringUtils', () => {
describe('truncate', () => {
it('should truncate strings longer than max length', () => {});
it('should return unchanged string if shorter than max', () => {});
it('should handle empty strings', () => {});
});

describe('capitalize', () => {
it('should capitalize first letter', () => {});
it('should handle empty strings', () => {});
});
});

Writing Effective Unit Tests
Focus on One Thing
Each test should verify a single behavior:
// ❌ Bad: Testing multiple behaviors
it('should validate and format user input', () => {
const input = ' JOHN@EXAMPLE.COM ';
const result = processEmail(input);
expect(result.isValid).toBe(true);
expect(result.formatted).toBe('john@example.com');
expect(result.domain).toBe('example.com');
});

// ✅ Good: Separate tests for each behavior
it('should validate email format', () => {
expect(isValidEmail('john@example.com')).toBe(true);
});

it('should normalize email to lowercase', () => {
expect(normalizeEmail('JOHN@EXAMPLE.COM')).toBe('john@example.com');
});

it('should extract domain from email', () => {
expect(extractDomain('john@example.com')).toBe('example.com');
});

Use Descriptive Test Data
// ❌ Bad: Unclear test data
const user = { id: 1, name: 'test', age: 25 };

// ✅ Good: Descriptive test data
const adultUser = { id: 1, name: 'John Doe', age: 25 };
const minorUser = { id: 2, name: 'Jane Smith', age: 16 };

Test Edge Cases
describe('divide', () => {
it('should divide two positive numbers', () => {
expect(divide(10, 2)).toBe(5);
});

it('should handle division by zero', () => {
expect(() => divide(10, 0)).toThrow();
});

it('should handle negative numbers', () => {
expect(divide(-10, 2)).toBe(-5);
});

it('should handle decimal results', () => {
expect(divide(10, 3)).toBeCloseTo(3.333, 3);
});
});

Mocking and Stubbing
Mock External Dependencies
// userService.test.ts
import { createUser } from './userService';
import { sendEmail } from '../email/emailService';
import { saveToDatabase } from '../db/database';

// Mock external services
jest.mock('../email/emailService');
jest.mock('../db/database');

describe('createUser', () => {
beforeEach(() => {
jest.clearAllMocks();
});

it('should send welcome email after creating user', async () => {
// Arrange
const userData = { email: 'new@example.com', name: 'New User' };
(saveToDatabase as jest.Mock).mockResolvedValue({ id: 123, ...userData });

    // Act
    await createUser(userData);

    // Assert
    expect(sendEmail).toHaveBeenCalledWith(
      'new@example.com',
      'Welcome to our platform!'
    );

});
});

Use Test Doubles Appropriately
// Simple stub for deterministic behavior
const getRandomNumber = jest.fn().mockReturnValue(0.5);

// Mock for complex objects
const mockRepository = {
find: jest.fn().mockResolvedValue([]),
save: jest.fn().mockResolvedValue({ id: 1 }),
delete: jest.fn().mockResolvedValue(true)
};

// Spy to verify calls while preserving original behavior
const consoleSpy = jest.spyOn(console, 'log');

Handling Dependencies
Dependency Injection
// ❌ Bad: Hard-coded dependencies
class OrderService {
async createOrder(items) {
const tax = await fetch('/api/tax').then(r => r.json());
// Hard to test
}
}

// ✅ Good: Injectable dependencies
class OrderService {
constructor(private taxService: TaxService) {}

async createOrder(items) {
const tax = await this.taxService.calculateTax(items);
// Easy to mock in tests
}
}

// In tests
it('should calculate order with tax', async () => {
const mockTaxService = { calculateTax: jest.fn().mockResolvedValue(10) };
const orderService = new OrderService(mockTaxService);
// ...
});

Factory Functions for Test Data
// testFactories.ts
export const createTestUser = (overrides = {}) => ({
id: Math.random().toString(),
email: 'test@example.com',
name: 'Test User',
createdAt: new Date(),
...overrides
});

// Usage in tests
it('should update user profile', () => {
const user = createTestUser({ name: 'Updated Name' });
// ...
});

Test Coverage
What to Test
Business Logic: Core algorithms, calculations, validations
Edge Cases: Boundary conditions, error states, null/undefined
Public APIs: Exported functions, class methods, component props
Critical Paths: Features that directly impact users or revenue
What NOT to Test
Third-party libraries: Trust that lodash, React, etc. work
Simple getters/setters: Unless they contain logic
Framework code: Don't test that React renders JSX
Implementation details: Private methods, internal state
Coverage Guidelines
// jest.config.js
module.exports = {
coverageThreshold: {
global: {
branches: 70, // Aim for 70-80% branch coverage
functions: 80, // 80% function coverage
lines: 80, // 80% line coverage
statements: 80 // 80% statement coverage
}
},
coveragePathIgnorePatterns: [
'node_modules',
'test',
'.stories.tsx',
'types.ts'
]
};

Best Practices

1. Keep Tests Fast
   // ❌ Bad: Real timers
   it('should timeout after 5 seconds', async () => {
   const promise = functionWithTimeout();
   await new Promise(resolve => setTimeout(resolve, 5000));
   expect(promise).rejects.toThrow();
   });

// ✅ Good: Mock timers
it('should timeout after 5 seconds', () => {
jest.useFakeTimers();
const promise = functionWithTimeout();
jest.advanceTimersByTime(5000);
expect(promise).rejects.toThrow();
});

2. Avoid Test Interdependence
   // ❌ Bad: Tests depend on order
   let counter = 0;
   it('should increment counter', () => {
   counter++;
   expect(counter).toBe(1);
   });

it('should have counter at 1', () => {
expect(counter).toBe(1); // Fails if run alone
});

// ✅ Good: Independent tests
it('should increment counter from 0 to 1', () => {
const counter = 0;
const result = increment(counter);
expect(result).toBe(1);
});

3. Use beforeEach for Common Setup
   describe('ShoppingCart', () => {
   let cart;

beforeEach(() => {
cart = new ShoppingCart();
});

afterEach(() => {
jest.clearAllMocks();
});

it('should add items to cart', () => {
cart.addItem({ id: 1, price: 10 });
expect(cart.getTotal()).toBe(10);
});
});

4. Write Tests First (When It Makes Sense)
   For bug fixes: Write a failing test that reproduces the bug
   For new features: Consider TDD for complex logic
   For refactoring: Ensure tests pass before and after
5. Make Tests Readable
   // Use helper functions for complex assertions
   const expectValidUser = (user) => {
   expect(user).toHaveProperty('id');
   expect(user.email).toMatch(/@/);
   expect(user.createdAt).toBeInstanceOf(Date);
   };

it('should create a valid user', () => {
const user = createUser(userData);
expectValidUser(user);
});

Examples
Testing Pure Functions
// utils/currency.ts
export const formatCurrency = (amount: number, currency = 'USD'): string => {
return new Intl.NumberFormat('en-US', {
style: 'currency',
currency
}).format(amount);
};

// utils/currency.test.ts
describe('formatCurrency', () => {
it('should format USD by default', () => {
expect(formatCurrency(1234.56)).toBe('$1,234.56');
});

it('should format other currencies', () => {
expect(formatCurrency(1234.56, 'EUR')).toBe('€1,234.56');
});

it('should handle zero', () => {
expect(formatCurrency(0)).toBe('$0.00');
});

it('should round to 2 decimal places', () => {
expect(formatCurrency(10.999)).toBe('$11.00');
});
});

Testing Async Functions
// services/userService.ts
export const fetchUserProfile = async (userId: string) => {
const response = await api.get(`/users/${userId}`);
if (!response.ok) {
throw new Error('USER_NOT_FOUND');
}
return response.data;
};

// services/userService.test.ts
import { fetchUserProfile } from './userService';
import \* as api from '../utils/api';

jest.mock('../utils/api');

describe('fetchUserProfile', () => {
it('should return user data on success', async () => {
const mockUser = { id: '123', name: 'John Doe' };
(api.get as jest.Mock).mockResolvedValue({
ok: true,
data: mockUser
});

    const user = await fetchUserProfile('123');

    expect(user).toEqual(mockUser);
    expect(api.get).toHaveBeenCalledWith('/users/123');

});

it('should throw error when user not found', async () => {
(api.get as jest.Mock).mockResolvedValue({
ok: false
});

    await expect(fetchUserProfile('999')).rejects.toThrow();

});
});

Testing React Components
// components/Button.tsx
export const Button = ({ onClick, disabled, children }) => (
<button onClick={onClick} disabled={disabled}>
{children}
</button>
);

// components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
it('should render children', () => {
render(<Button>Click me</Button>);
expect(screen.getByText('Click me')).toBeInTheDocument();
});

it('should call onClick when clicked', () => {
const handleClick = jest.fn();
render(<Button onClick={handleClick}>Click</Button>);

    fireEvent.click(screen.getByText('Click'));

    expect(handleClick).toHaveBeenCalledTimes(1);

});

it('should not call onClick when disabled', () => {
const handleClick = jest.fn();
render(<Button onClick={handleClick} disabled>Click</Button>);

    fireEvent.click(screen.getByText('Click'));

    expect(handleClick).not.toHaveBeenCalled();

});
});

Testing Error Handling
// services/validation.ts
export class ValidationError extends Error {
constructor(public code: string, message?: string) {
super(message);
this.name = 'ValidationError';
}
}

export const validateAge = (age: number): void => {
if (age < 0) {
throw new ValidationError('AGE_NEGATIVE');
}
if (age > 150) {
throw new ValidationError('AGE_TOO_HIGH');
}
if (!Number.isInteger(age)) {
throw new ValidationError('AGE_NOT_INTEGER');
}
};

// services/validation.test.ts
describe('validateAge', () => {
it('should accept valid ages', () => {
expect(() => validateAge(25)).not.toThrow();
expect(() => validateAge(0)).not.toThrow();
expect(() => validateAge(150)).not.toThrow();
});

it('should throw for negative ages', () => {
expect(() => validateAge(-1)).toThrow();

    // If testing error codes specifically
    try {
      validateAge(-1);
    } catch (error) {
      expect(error.code).toBe('AGE_NEGATIVE');
    }

});

it('should throw for ages over 150', () => {
expect(() => validateAge(151)).toThrow();
});

it('should throw for decimal ages', () => {
expect(() => validateAge(25.5)).toThrow();
});
});

// Alternative: Testing error codes with custom matcher
expect.extend({
toThrowWithCode(received, expectedCode) {
try {
received();
return {
pass: false,
message: () => `Expected function to throw with code ${expectedCode}`
};
} catch (error) {
const pass = error.code === expectedCode;
return {
pass,
message: () => pass
? `Expected function not to throw with code ${expectedCode}`
: `Expected function to throw with code ${expectedCode}, but got ${error.code}`
};
}
}
});

// Usage
it('should throw AGE_NEGATIVE for negative ages', () => {
expect(() => validateAge(-1)).toThrowWithCode('AGE_NEGATIVE');
});

Testing HTTP Error Responses
// For API error responses, test status codes not messages
it('should handle 404 responses', async () => {
(api.get as jest.Mock).mockResolvedValue({
ok: false,
status: 404
});

const result = await fetchResource('123');

expect(result.error).toBeDefined();
expect(result.status).toBe(404);
// Don't test: expect(result.message).toBe('Resource not found')
});
