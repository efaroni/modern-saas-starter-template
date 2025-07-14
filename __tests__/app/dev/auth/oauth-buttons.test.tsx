import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { OAuthButtons } from '@/app/dev/auth/components/oauth-buttons'

// Mock the auth service
const mockSignInWithOAuth = jest.fn()
const mockGetAvailableOAuthProviders = jest.fn()

jest.mock('@/lib/auth/factory', () => ({
  authService: {
    signInWithOAuth: mockSignInWithOAuth,
    getAvailableOAuthProviders: mockGetAvailableOAuthProviders
  }
}))

describe('OAuthButtons', () => {
  const mockOnSuccess = jest.fn()
  const mockOnError = jest.fn()

  const defaultProviders = [
    {
      id: 'google',
      name: 'Google',
      iconUrl: 'https://developers.google.com/identity/images/g-logo.png'
    },
    {
      id: 'github',
      name: 'GitHub',
      iconUrl: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetAvailableOAuthProviders.mockReturnValue(defaultProviders)
  })

  it('should render OAuth provider buttons', () => {
    render(<OAuthButtons onSuccess={mockOnSuccess} onError={mockOnError} />)

    expect(screen.getByText('Or continue with')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in with github/i })).toBeInTheDocument()
  })

  it('should not render anything when no OAuth providers are available', () => {
    mockGetAvailableOAuthProviders.mockReturnValueOnce([])
    
    const { container } = render(<OAuthButtons onSuccess={mockOnSuccess} onError={mockOnError} />)
    
    expect(container.firstChild).toBeNull()
  })

  it('should call signInWithOAuth when Google button is clicked', async () => {
    const user = userEvent.setup()
    const mockUser = { id: 'google-user-id', email: 'user@gmail.com' }
    mockSignInWithOAuth.mockResolvedValue({ success: true, user: mockUser })

    render(<OAuthButtons onSuccess={mockOnSuccess} onError={mockOnError} />)

    const googleButton = screen.getByRole('button', { name: /sign in with google/i })
    await user.click(googleButton)

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith('google')
    }, { timeout: 3000 })
  })

  it('should call signInWithOAuth when GitHub button is clicked', async () => {
    const user = userEvent.setup()
    const mockUser = { id: 'github-user-id', email: 'user@github.com' }
    mockSignInWithOAuth.mockResolvedValue({ success: true, user: mockUser })

    render(<OAuthButtons onSuccess={mockOnSuccess} onError={mockOnError} />)

    const githubButton = screen.getByRole('button', { name: /sign in with github/i })
    await user.click(githubButton)

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith('github')
    }, { timeout: 3000 })
  })

  it('should call onSuccess when OAuth sign in is successful', async () => {
    const user = userEvent.setup()
    const mockUser = { id: 'google-user-id', email: 'user@gmail.com' }
    mockSignInWithOAuth.mockResolvedValue({ success: true, user: mockUser })

    render(<OAuthButtons onSuccess={mockOnSuccess} onError={mockOnError} />)

    const googleButton = screen.getByRole('button', { name: /sign in with google/i })
    await user.click(googleButton)

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith(mockUser)
    }, { timeout: 3000 })
  })

  it('should call onError when OAuth sign in fails', async () => {
    const user = userEvent.setup()
    mockSignInWithOAuth.mockResolvedValue({ success: false, error: 'OAuth failed' })

    render(<OAuthButtons onSuccess={mockOnSuccess} onError={mockOnError} />)

    const googleButton = screen.getByRole('button', { name: /sign in with google/i })
    await user.click(googleButton)

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('OAuth failed')
    }, { timeout: 3000 })
  })

  it('should handle OAuth exception and call onError', async () => {
    const user = userEvent.setup()
    mockSignInWithOAuth.mockRejectedValue(new Error('Network error'))

    render(<OAuthButtons onSuccess={mockOnSuccess} onError={mockOnError} />)

    const googleButton = screen.getByRole('button', { name: /sign in with google/i })
    await user.click(googleButton)

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('An unexpected error occurred during OAuth sign in')
    }, { timeout: 3000 })
  })

  it('should show loading state during OAuth sign in', async () => {
    const user = userEvent.setup()
    
    // Create a promise that we can control
    let resolveOAuth: (value: any) => void
    const oauthPromise = new Promise((resolve) => {
      resolveOAuth = resolve
    })
    mockSignInWithOAuth.mockReturnValue(oauthPromise)

    render(<OAuthButtons onSuccess={mockOnSuccess} onError={mockOnError} />)

    const googleButton = screen.getByRole('button', { name: /sign in with google/i })
    await user.click(googleButton)

    // Check loading state
    expect(screen.getByText(/signing in with google/i)).toBeInTheDocument()
    expect(googleButton).toBeDisabled()
    
    // GitHub button should also be disabled
    const githubButton = screen.getByRole('button', { name: /sign in with github/i })
    expect(githubButton).toBeDisabled()

    // Resolve the promise
    resolveOAuth!({ success: true, user: { id: 'google-user-id', email: 'user@gmail.com' } })

    await waitFor(() => {
      expect(screen.getByText(/sign in with google/i)).toBeInTheDocument()
      expect(googleButton).not.toBeDisabled()
      expect(githubButton).not.toBeDisabled()
    })
  })

  it('should disable all buttons when one OAuth provider is loading', async () => {
    const user = userEvent.setup()
    
    let resolveOAuth: (value: any) => void
    const oauthPromise = new Promise((resolve) => {
      resolveOAuth = resolve
    })
    mockSignInWithOAuth.mockReturnValue(oauthPromise)

    render(<OAuthButtons onSuccess={mockOnSuccess} onError={mockOnError} />)

    const googleButton = screen.getByRole('button', { name: /sign in with google/i })
    const githubButton = screen.getByRole('button', { name: /sign in with github/i })
    
    await user.click(googleButton)

    // Both buttons should be disabled
    expect(googleButton).toBeDisabled()
    expect(githubButton).toBeDisabled()

    // Resolve the promise
    resolveOAuth!({ success: true, user: { id: 'google-user-id', email: 'user@gmail.com' } })

    await waitFor(() => {
      expect(googleButton).not.toBeDisabled()
      expect(githubButton).not.toBeDisabled()
    })
  })

  it('should display appropriate icons for providers', () => {
    render(<OAuthButtons onSuccess={mockOnSuccess} onError={mockOnError} />)

    const googleButton = screen.getByRole('button', { name: /sign in with google/i })
    const githubButton = screen.getByRole('button', { name: /sign in with github/i })

    expect(googleButton).toHaveTextContent('🔍')
    expect(githubButton).toHaveTextContent('🐙')
  })
})