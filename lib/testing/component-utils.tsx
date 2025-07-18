import { render, screen, fireEvent, waitFor, RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReactElement, ReactNode } from 'react'
import { jest } from '@jest/globals'

// Extended render options for better testing
export interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  // Add common providers and wrappers
  withAuth?: boolean
  withRouter?: boolean
  withQueryClient?: boolean
  initialUrl?: string
  mockAuth?: {
    user?: any
    isAuthenticated?: boolean
    permissions?: string[]
  }
}

// Mock providers for testing
const MockAuthProvider = ({ children, mockAuth }: { children: ReactNode; mockAuth?: any }) => {
  // Mock auth context
  return <div data-testid="mock-auth-provider">{children}</div>
}

const MockRouterProvider = ({ children, initialUrl }: { children: ReactNode; initialUrl?: string }) => {
  // Mock router context
  return <div data-testid="mock-router-provider">{children}</div>
}

const MockQueryProvider = ({ children }: { children: ReactNode }) => {
  // Mock query client
  return <div data-testid="mock-query-provider">{children}</div>
}

// Enhanced render function with common providers
export const renderWithProviders = (
  ui: ReactElement,
  options: ExtendedRenderOptions = {}
) => {
  const {
    withAuth = false,
    withRouter = false,
    withQueryClient = false,
    initialUrl = '/',
    mockAuth,
    ...renderOptions
  } = options

  const Wrapper = ({ children }: { children: ReactNode }) => {
    let component = <>{children}</>

    if (withQueryClient) {
      component = <MockQueryProvider>{component}</MockQueryProvider>
    }

    if (withRouter) {
      component = <MockRouterProvider initialUrl={initialUrl}>{component}</MockRouterProvider>
    }

    if (withAuth) {
      component = <MockAuthProvider mockAuth={mockAuth}>{component}</MockAuthProvider>
    }

    return component
  }

  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  }
}

// Component testing utilities
export const componentTestUtils = {
  /**
   * Test if a component renders without crashing
   */
  async shouldRender(component: ReactElement) {
    const { container } = renderWithProviders(component)
    expect(container.firstChild).toBeInTheDocument()
    return container
  },

  /**
   * Test component with different props
   */
  async testWithProps<T extends Record<string, any>>(
    Component: React.ComponentType<T>,
    propVariations: T[]
  ) {
    const results = []
    
    for (const props of propVariations) {
      const { container } = renderWithProviders(<Component {...props} />)
      results.push({
        props,
        container,
        success: container.firstChild !== null
      })
    }
    
    return results
  },

  /**
   * Test component accessibility
   */
  async testAccessibility(component: ReactElement) {
    const { container } = renderWithProviders(component)
    
    // Check for basic accessibility attributes
    const elements = container.querySelectorAll('*')
    const issues = []
    
    elements.forEach(el => {
      // Check for missing alt text on images
      if (el.tagName === 'IMG' && !el.getAttribute('alt')) {
        issues.push('Missing alt text on image')
      }
      
      // Check for missing labels on form elements
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) {
        const hasLabel = el.getAttribute('aria-label') || 
                        el.getAttribute('aria-labelledby') ||
                        document.querySelector(`label[for="${el.id}"]`)
        if (!hasLabel) {
          issues.push(`Missing label for ${el.tagName.toLowerCase()}`)
        }
      }
    })
    
    return { issues, passed: issues.length === 0 }
  },

  /**
   * Test component interactions
   */
  async testInteractions(component: ReactElement, interactions: {
    name: string
    action: () => Promise<void>
    expectation: () => Promise<void>
  }[]) {
    const { user } = renderWithProviders(component)
    const results = []
    
    for (const interaction of interactions) {
      try {
        await interaction.action()
        await interaction.expectation()
        results.push({ name: interaction.name, passed: true })
      } catch (error) {
        results.push({ 
          name: interaction.name, 
          passed: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }
    
    return results
  },

  /**
   * Test component loading states
   */
  async testLoadingStates(component: ReactElement, loadingProps: Record<string, boolean>) {
    const results = []
    
    for (const [propName, isLoading] of Object.entries(loadingProps)) {
      const Component = component.type as React.ComponentType<any>
      const props = { ...component.props, [propName]: isLoading }
      
      const { container } = renderWithProviders(<Component {...props} />)
      
      if (isLoading) {
        // Look for common loading indicators
        const loadingIndicators = container.querySelectorAll('[data-testid*="loading"], [class*="loading"], [class*="spinner"]')
        results.push({
          propName,
          isLoading,
          hasLoadingIndicator: loadingIndicators.length > 0,
          loadingElements: loadingIndicators.length
        })
      } else {
        results.push({
          propName,
          isLoading,
          hasLoadingIndicator: false,
          loadingElements: 0
        })
      }
    }
    
    return results
  },

  /**
   * Test component error states
   */
  async testErrorStates(component: ReactElement, errorProps: Record<string, string | null>) {
    const results = []
    
    for (const [propName, errorMessage] of Object.entries(errorProps)) {
      const Component = component.type as React.ComponentType<any>
      const props = { ...component.props, [propName]: errorMessage }
      
      const { container } = renderWithProviders(<Component {...props} />)
      
      if (errorMessage) {
        // Look for error message display
        const errorElements = container.querySelectorAll('[data-testid*="error"], [class*="error"], [role="alert"]')
        const hasErrorText = container.textContent?.includes(errorMessage) || false
        
        results.push({
          propName,
          errorMessage,
          hasErrorDisplay: errorElements.length > 0,
          hasErrorText,
          errorElements: errorElements.length
        })
      } else {
        results.push({
          propName,
          errorMessage: null,
          hasErrorDisplay: false,
          hasErrorText: false,
          errorElements: 0
        })
      }
    }
    
    return results
  }
}

// Form testing utilities
export const formTestUtils = {
  /**
   * Fill form fields with data
   */
  async fillForm(formData: Record<string, string>, user = userEvent.setup()) {
    for (const [fieldName, value] of Object.entries(formData)) {
      const field = screen.getByLabelText(new RegExp(fieldName, 'i')) || 
                   screen.getByPlaceholderText(new RegExp(fieldName, 'i')) ||
                   screen.getByDisplayValue('')
      
      if (field) {
        await user.clear(field)
        await user.type(field, value)
      }
    }
  },

  /**
   * Submit form and wait for response
   */
  async submitForm(submitButtonText = /submit|save|create/i, user = userEvent.setup()) {
    const submitButton = screen.getByRole('button', { name: submitButtonText })
    await user.click(submitButton)
    
    // Wait for potential async operations
    await waitFor(() => {
      // This is a placeholder - in real usage, you'd wait for specific conditions
    }, { timeout: 5000 })
  },

  /**
   * Test form validation
   */
  async testValidation(
    component: ReactElement,
    validationTests: {
      field: string
      invalidValue: string
      expectedError: string
    }[]
  ) {
    const { user } = renderWithProviders(component)
    const results = []
    
    for (const test of validationTests) {
      // Clear any existing values
      const field = screen.getByLabelText(new RegExp(test.field, 'i'))
      await user.clear(field)
      
      // Enter invalid value
      await user.type(field, test.invalidValue)
      
      // Trigger validation (usually by blurring or submitting)
      await user.tab()
      
      // Check for error message
      await waitFor(() => {
        const errorText = screen.queryByText(new RegExp(test.expectedError, 'i'))
        results.push({
          field: test.field,
          invalidValue: test.invalidValue,
          expectedError: test.expectedError,
          errorFound: !!errorText
        })
      })
    }
    
    return results
  }
}

// Mock utilities for testing
export const mockUtils = {
  /**
   * Create mock function with tracking
   */
  createMockFunction<T extends (...args: any[]) => any>(
    name: string,
    implementation?: T
  ): jest.MockedFunction<T> {
    const mockFn = jest.fn(implementation) as jest.MockedFunction<T>
    mockFn.mockName = name
    return mockFn
  },

  /**
   * Mock API responses
   */
  mockApiResponse(data: any, delay = 0) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(data), delay)
    })
  },

  /**
   * Mock component with test ID
   */
  mockComponent(name: string, props: Record<string, any> = {}) {
    return jest.fn(() => <div data-testid={`mock-${name}`} {...props} />)
  },

  /**
   * Mock hooks
   */
  mockHook<T>(name: string, returnValue: T) {
    return jest.fn(() => returnValue).mockName(name)
  },

  /**
   * Create mock router
   */
  mockRouter(initialPath = '/') {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      pathname: initialPath,
      query: {},
      asPath: initialPath,
      route: initialPath,
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    }
  }
}

// Performance testing utilities
export const performanceUtils = {
  /**
   * Measure component render time
   */
  async measureRenderTime(component: ReactElement, iterations = 10) {
    const times = []
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      const { unmount } = renderWithProviders(component)
      const end = performance.now()
      
      times.push(end - start)
      unmount()
    }
    
    return {
      average: times.reduce((a, b) => a + b, 0) / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
      times
    }
  },

  /**
   * Test component with large datasets
   */
  async testWithLargeData(
    Component: React.ComponentType<any>,
    dataGenerator: (size: number) => any,
    sizes = [100, 1000, 5000]
  ) {
    const results = []
    
    for (const size of sizes) {
      const data = dataGenerator(size)
      const start = performance.now()
      
      try {
        const { unmount } = renderWithProviders(<Component data={data} />)
        const end = performance.now()
        
        results.push({
          size,
          renderTime: end - start,
          success: true
        })
        
        unmount()
      } catch (error) {
        results.push({
          size,
          renderTime: -1,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    return results
  }
}

// Snapshot testing utilities
export const snapshotUtils = {
  /**
   * Create component snapshot with different props
   */
  testSnapshots<T extends Record<string, any>>(
    Component: React.ComponentType<T>,
    propVariations: { name: string; props: T }[]
  ) {
    propVariations.forEach(({ name, props }) => {
      const { container } = renderWithProviders(<Component {...props} />)
      expect(container.firstChild).toMatchSnapshot(name)
    })
  },

  /**
   * Test responsive snapshots
   */
  testResponsiveSnapshots(
    component: ReactElement,
    breakpoints = [320, 768, 1024, 1440]
  ) {
    breakpoints.forEach(width => {
      // Mock window width
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: width,
      })
      
      const { container } = renderWithProviders(component)
      expect(container.firstChild).toMatchSnapshot(`width-${width}`)
    })
  }
}

// Export all utilities
export {
  // Re-export common testing library functions
  render,
  screen,
  fireEvent,
  waitFor,
  userEvent,
}