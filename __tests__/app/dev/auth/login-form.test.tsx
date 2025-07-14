import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { LoginForm } from '@/app/dev/auth/components/login-form'

// Mock the auth service
const mockSignIn = jest.fn() as jest.MockedFunction<any>
const mockIsConfigured = jest.fn(() => true)
const mockGetConfiguration = jest.fn(() => ({ provider: 'mock', oauthProviders: ['google', 'github'] }))

jest.mock('@/lib/auth/factory', () => ({
  authService: {
    signIn: mockSignIn,
    isConfigured: mockIsConfigured,
    getConfiguration: mockGetConfiguration
  }
}))

import { authService } from '@/lib/auth/factory'

describe('LoginForm', () => {
  const mockOnSuccess = jest.fn()
  const mockOnError = jest.fn()
  const mockOnForgotPassword = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockSignIn.mockClear()
    mockIsConfigured.mockClear()
    mockGetConfiguration.mockClear()
  })

  it('should render login form with email and password fields', () => {
    render(<LoginForm onSuccess={mockOnSuccess} onError={mockOnError} onForgotPassword={mockOnForgotPassword} />)

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('should show validation errors for empty fields', async () => {
    const user = userEvent.setup()
    render(<LoginForm onSuccess={mockOnSuccess} onError={mockOnError} onForgotPassword={mockOnForgotPassword} />)

    const submitButton = screen.getByRole('button', { name: 'Sign in' })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
  })

  it('should show validation error for invalid email format', async () => {
    const user = userEvent.setup()
    render(<LoginForm onSuccess={mockOnSuccess} onError={mockOnError} onForgotPassword={mockOnForgotPassword} />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: 'Sign in' })

    // Type invalid email and valid password to trigger our validation
    await user.type(emailInput, 'invalid-email')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument()
    })
  })

  it('should call authService.signIn with correct credentials', async () => {
    const user = userEvent.setup()
    mockSignIn.mockResolvedValue({ success: true, user: { id: '1', email: 'test@example.com' } })

    render(<LoginForm onSuccess={mockOnSuccess} onError={mockOnError} onForgotPassword={mockOnForgotPassword} />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: 'Sign in' })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      })
    }, { timeout: 3000 })
  })

  it('should call onSuccess when login is successful', async () => {
    const user = userEvent.setup()
    const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' }
    mockSignIn.mockResolvedValue({ success: true, user: mockUser })

    render(<LoginForm onSuccess={mockOnSuccess} onError={mockOnError} onForgotPassword={mockOnForgotPassword} />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: 'Sign in' })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith(mockUser)
    })
  })

  it('should call onError when login fails', async () => {
    const user = userEvent.setup()
    mockSignIn.mockResolvedValue({ success: false, error: 'Invalid credentials' })

    render(<LoginForm onSuccess={mockOnSuccess} onError={mockOnError} onForgotPassword={mockOnForgotPassword} />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: 'Sign in' })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'wrongpassword')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('Invalid credentials')
    }, { timeout: 5000 })
  })

  it('should show loading state during login', async () => {
    const user = userEvent.setup()
    
    // Create a promise that we can control
    let resolveSignIn: (value: any) => void
    const signInPromise = new Promise((resolve) => {
      resolveSignIn = resolve
    })
    mockSignIn.mockReturnValue(signInPromise)

    render(<LoginForm onSuccess={mockOnSuccess} onError={mockOnError} onForgotPassword={mockOnForgotPassword} />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: 'Sign in' })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    // Check loading state
    expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()

    // Resolve the promise
    resolveSignIn!({ success: true, user: { id: '1', email: 'test@example.com' } })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Sign in' })).not.toBeDisabled()
    })
  })

  it('should display service status indicators', () => {
    render(<LoginForm onSuccess={mockOnSuccess} onError={mockOnError} onForgotPassword={mockOnForgotPassword} />)

    // Should show that mock auth is configured
    expect(screen.getByText(/mock auth/i)).toBeInTheDocument()
    expect(screen.getByText(/✅/)).toBeInTheDocument()
  })
})