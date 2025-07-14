import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import AuthPage from '@/app/dev/auth/page'

// Mock the auth service
jest.mock('@/lib/auth/factory', () => ({
  authService: {
    signIn: jest.fn(),
    signUp: jest.fn(),
    getUser: jest.fn(),
    isConfigured: jest.fn(() => true),
    getConfiguration: jest.fn(() => ({ provider: 'mock', oauthProviders: ['google', 'github'] }))
  }
}))

import { authService } from '@/lib/auth/factory'

describe('AuthPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render auth page with login and signup tabs', () => {
    render(<AuthPage />)

    expect(screen.getByText('Authentication & User Management')).toBeInTheDocument()
    expect(screen.getByText('Section 2: Auth.js + user CRUD + OAuth')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /login/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /sign up/i })).toBeInTheDocument()
  })

  it('should show login form by default', () => {
    render(<AuthPage />)

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('should switch to signup form when signup tab is clicked', async () => {
    const user = userEvent.setup()
    render(<AuthPage />)

    const signupTab = screen.getByRole('tab', { name: /sign up/i })
    await user.click(signupTab)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument()
    })
  })

  it('should show success message after successful login', async () => {
    const user = userEvent.setup()
    const mockSignIn = authService.signIn as jest.MockedFunction<typeof authService.signIn>
    const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' }
    mockSignIn.mockResolvedValue({ success: true, user: mockUser })

    render(<AuthPage />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/successfully signed in/i)).toBeInTheDocument()
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })
  })

  it('should show error message when login fails', async () => {
    const user = userEvent.setup()
    const mockSignIn = authService.signIn as jest.MockedFunction<typeof authService.signIn>
    mockSignIn.mockResolvedValue({ success: false, error: 'Invalid credentials' })

    render(<AuthPage />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'wrongpassword')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
  })

  it('should show service status section', () => {
    render(<AuthPage />)

    expect(screen.getByText(/auth service status/i)).toBeInTheDocument()
    expect(screen.getByText(/mock auth/i)).toBeInTheDocument()
    expect(screen.getByText(/✅ configured/i)).toBeInTheDocument()
  })
})