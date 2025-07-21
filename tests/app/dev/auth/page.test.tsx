import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import AuthPage from '@/app/(auth)/auth/page'

// Mock the server actions
const mockLogoutAction = jest.fn()
const mockGetAuthConfigurationAction = jest.fn()

jest.mock('@/app/actions/auth', () => ({
  logoutAction: mockLogoutAction,
  getAuthConfigurationAction: mockGetAuthConfigurationAction
}))

describe('AuthPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset mock implementations to default state
    mockGetAuthConfigurationAction.mockResolvedValue({ provider: 'mock', oauthProviders: ['google', 'github'] })
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
    // Find the main form submit button specifically, not the OAuth buttons
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument()
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


  it('should show service status section', () => {
    render(<AuthPage />)

    expect(screen.getByText(/auth service status/i)).toBeInTheDocument()
    expect(screen.getByText(/mock auth/i)).toBeInTheDocument()
    expect(screen.getByText(/✅ configured/i)).toBeInTheDocument()
  })
})