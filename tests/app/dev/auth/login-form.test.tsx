import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Mock the server action first
const mockLoginAction = jest.fn()

jest.mock('@/app/actions/auth', () => ({
  loginAction: mockLoginAction
}))

import { LoginForm } from '@/app/(dev)/auth/components/login-form'

describe('LoginForm', () => {
  const mockOnSuccess = jest.fn()
  const mockOnError = jest.fn()
  const mockOnForgotPassword = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset mock implementations to default state
    mockLoginAction.mockResolvedValue({ success: false, error: 'Invalid credentials' })
  })

  afterAll(() => {
    // Restore original modules after all tests in this suite
    jest.restoreAllMocks()
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

  it('should show validation error for invalid email', async () => {
    const user = userEvent.setup()
    render(<LoginForm onSuccess={mockOnSuccess} onError={mockOnError} onForgotPassword={mockOnForgotPassword} />)

    const emailInput = screen.getByLabelText(/email/i)
    await user.type(emailInput, 'invalid-email')

    const submitButton = screen.getByRole('button', { name: 'Sign in' })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument()
    })
  })


  it('should call onError when login fails', async () => {
    mockLoginAction.mockResolvedValue({ success: false, error: 'Invalid credentials' })

    const user = userEvent.setup()
    render(<LoginForm onSuccess={mockOnSuccess} onError={mockOnError} onForgotPassword={mockOnForgotPassword} />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'wrongpassword')

    const submitButton = screen.getByRole('button', { name: 'Sign in' })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('Invalid credentials')
    })
  })


  it('should call onForgotPassword when forgot password link is clicked', async () => {
    const user = userEvent.setup()
    render(<LoginForm onSuccess={mockOnSuccess} onError={mockOnError} onForgotPassword={mockOnForgotPassword} />)

    const forgotPasswordLink = screen.getByText(/forgot your password/i)
    await user.click(forgotPasswordLink)

    expect(mockOnForgotPassword).toHaveBeenCalled()
  })

})