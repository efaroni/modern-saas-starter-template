# Component Testing Utilities

This directory contains enhanced testing utilities for React components, forms, hooks, and API functions. These utilities build on top of React Testing Library to provide common testing patterns and reduce boilerplate code.

## Quick Start

```typescript
import { renderWithProviders, componentTestUtils } from '@/lib/testing/component-utils'

// Basic component test
const MyComponent = () => <div>Hello World</div>

describe('MyComponent', () => {
  it('should render', async () => {
    await componentTestUtils.shouldRender(<MyComponent />)
  })
})
```

## Core Utilities

### `renderWithProviders`

Enhanced render function that can automatically wrap components with common providers:

```typescript
import { renderWithProviders } from '@/lib/testing/component-utils'

// Basic usage
const { user } = renderWithProviders(<MyComponent />)

// With providers
const { user } = renderWithProviders(<MyComponent />, {
  withAuth: true,
  withRouter: true,
  withQueryClient: true,
  initialUrl: '/dashboard',
  mockAuth: {
    user: { id: '1', email: 'test@example.com' },
    isAuthenticated: true
  }
})
```

### `componentTestUtils`

Collection of utilities for testing component behavior:

```typescript
import { componentTestUtils } from '@/lib/testing/component-utils'

// Test basic rendering
await componentTestUtils.shouldRender(<MyComponent />)

// Test with different props
const results = await componentTestUtils.testWithProps(
  MyComponent, 
  [{ variant: 'primary' }, { variant: 'secondary' }]
)

// Test accessibility
const { issues, passed } = await componentTestUtils.testAccessibility(<MyComponent />)

// Test loading states
const results = await componentTestUtils.testLoadingStates(
  <MyComponent />, 
  { loading: true }
)

// Test error states
const results = await componentTestUtils.testErrorStates(
  <MyComponent />, 
  { error: 'Something went wrong' }
)
```

### `formTestUtils`

Utilities specifically for testing form components:

```typescript
import { formTestUtils } from '@/lib/testing/component-utils'

// Fill form with data
await formTestUtils.fillForm({
  email: 'test@example.com',
  password: 'password123'
})

// Submit form
await formTestUtils.submitForm(/submit/i)

// Test form validation
const results = await formTestUtils.testValidation(
  <MyForm />,
  [
    {
      field: 'email',
      invalidValue: 'invalid-email',
      expectedError: 'Please enter a valid email'
    }
  ]
)
```

### `mockUtils`

Helper functions for creating mocks:

```typescript
import { mockUtils } from '@/lib/testing/component-utils'

// Mock functions
const mockFn = mockUtils.createMockFunction('myFunction')

// Mock API responses
const mockResponse = mockUtils.mockApiResponse({ data: 'test' }, 100)

// Mock components
const MockComponent = mockUtils.mockComponent('MyComponent')

// Mock hooks
const mockHook = mockUtils.mockHook('useMyHook', { data: 'test' })

// Mock router
const mockRouter = mockUtils.mockRouter('/dashboard')
```

## Test Templates

Pre-configured test templates for common testing scenarios:

### Component Template

```typescript
import { testTemplates } from '@/lib/testing/test-templates'

const testConfig = testTemplates.component(
  'MyComponent',
  <MyComponent />,
  {
    testRendering: true,
    testProps: true,
    testAccessibility: true,
    testInteractions: true,
    testLoadingStates: true,
    testErrorStates: true,
    propVariations: [
      { variant: 'primary' },
      { variant: 'secondary' }
    ],
    loadingProps: { loading: true },
    errorProps: { error: 'Test error' }
  }
)
```

### Form Template

```typescript
const testConfig = testTemplates.form(
  'LoginForm',
  <LoginForm />,
  {
    testRendering: true,
    testValidation: true,
    testSubmission: true,
    formData: {
      email: 'test@example.com',
      password: 'password123'
    },
    validationTests: [
      {
        field: 'email',
        invalidValue: 'invalid',
        expectedError: 'Invalid email'
      }
    ]
  }
)
```

### Hook Template

```typescript
const testConfig = testTemplates.hook(
  'useMyHook',
  () => useMyHook(),
  {
    testInitialState: true,
    testStateChanges: true,
    initialValue: { data: null, loading: false }
  }
)
```

### API Template

```typescript
const testConfig = testTemplates.api(
  'fetchUser',
  fetchUser,
  {
    testSuccess: true,
    testError: true,
    testLoading: true,
    successArgs: ['user123'],
    errorArgs: ['invalid-id'],
    expectedSuccessResponse: { id: 'user123', name: 'John' }
  }
)
```

## Performance Testing

```typescript
import { performanceUtils } from '@/lib/testing/component-utils'

// Measure render time
const { average, min, max } = await performanceUtils.measureRenderTime(
  <MyComponent />,
  10 // iterations
)

// Test with large datasets
const results = await performanceUtils.testWithLargeData(
  MyComponent,
  (size) => Array.from({ length: size }, (_, i) => ({ id: i, name: `Item ${i}` })),
  [100, 1000, 5000]
)
```

## Snapshot Testing

```typescript
import { snapshotUtils } from '@/lib/testing/component-utils'

// Test snapshots with different props
snapshotUtils.testSnapshots(
  MyComponent,
  [
    { name: 'default', props: {} },
    { name: 'with-data', props: { data: mockData } }
  ]
)

// Test responsive snapshots
snapshotUtils.testResponsiveSnapshots(
  <MyComponent />,
  [320, 768, 1024, 1440]
)
```

## Best Practices

### 1. Use Descriptive Test Names

```typescript
// Good
it('should display error message when email is invalid')

// Bad
it('should work')
```

### 2. Test User Interactions, Not Implementation

```typescript
// Good - tests user interaction
it('should submit form when submit button is clicked', async () => {
  const { user } = renderWithProviders(<LoginForm />)
  
  await user.type(screen.getByLabelText(/email/i), 'test@example.com')
  await user.type(screen.getByLabelText(/password/i), 'password123')
  await user.click(screen.getByRole('button', { name: /submit/i }))
  
  expect(screen.getByText('Login successful')).toBeInTheDocument()
})

// Bad - tests implementation
it('should call handleSubmit when form is submitted', async () => {
  const mockHandleSubmit = jest.fn()
  // ... test implementation details
})
```

### 3. Use Accessibility-First Queries

```typescript
// Good
screen.getByRole('button', { name: /submit/i })
screen.getByLabelText(/email/i)

// Less ideal
screen.getByTestId('submit-button')
screen.getByClassName('email-input')
```

### 4. Test Loading and Error States

```typescript
it('should show loading state while submitting', async () => {
  const { user } = renderWithProviders(<MyForm />)
  
  // Trigger loading state
  await user.click(screen.getByRole('button', { name: /submit/i }))
  
  // Assert loading state
  expect(screen.getByText('Loading...')).toBeInTheDocument()
})

it('should display error when submission fails', async () => {
  // Mock API to return error
  mockApiCall.mockRejectedValue(new Error('Submission failed'))
  
  const { user } = renderWithProviders(<MyForm />)
  await user.click(screen.getByRole('button', { name: /submit/i }))
  
  expect(screen.getByText('Submission failed')).toBeInTheDocument()
})
```

### 5. Clean Up After Tests

```typescript
afterEach(() => {
  jest.clearAllMocks()
  // Clear any global state
  // Reset any modified DOM
})
```

## Common Testing Patterns

### Testing Async Operations

```typescript
it('should handle async operations', async () => {
  const { user } = renderWithProviders(<AsyncComponent />)
  
  await user.click(screen.getByText('Load Data'))
  
  // Wait for async operation
  await waitFor(() => {
    expect(screen.getByText('Data loaded')).toBeInTheDocument()
  })
})
```

### Testing Context/State Changes

```typescript
it('should update UI when context changes', async () => {
  const { user } = renderWithProviders(<MyComponent />, {
    withAuth: true,
    mockAuth: { isAuthenticated: false }
  })
  
  expect(screen.getByText('Please log in')).toBeInTheDocument()
  
  // Simulate auth state change
  // This would depend on your specific implementation
})
```

### Testing Error Boundaries

```typescript
it('should catch and display errors', () => {
  const ThrowError = () => {
    throw new Error('Test error')
  }
  
  renderWithProviders(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  )
  
  expect(screen.getByText('Something went wrong')).toBeInTheDocument()
})
```

## Integration with Jest

Add to your Jest configuration:

```javascript
// jest.config.js
module.exports = {
  setupFilesAfterEnv: ['<rootDir>/lib/testing/setup.ts'],
  testEnvironment: 'jsdom',
  moduleNameMapping: {
    '@/lib/testing/(.*)': '<rootDir>/lib/testing/$1'
  }
}
```

Create a setup file:

```typescript
// lib/testing/setup.ts
import '@testing-library/jest-dom'
import { configure } from '@testing-library/react'

// Configure testing library
configure({
  testIdAttribute: 'data-testid',
})

// Global test setup
beforeEach(() => {
  // Reset any global state
})

afterEach(() => {
  // Cleanup after each test
})
```

## Examples

See the `examples/` directory for complete examples of:
- Component testing with all utilities
- Form testing with validation
- Hook testing with state changes
- API testing with error handling
- Integration testing with multiple components

These utilities provide a comprehensive testing foundation that grows with your application while maintaining consistency and reducing boilerplate code.