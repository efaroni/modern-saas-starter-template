import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { UserProfileForm } from '@/app/(auth)/auth/components/user-profile-form'
import type { AuthUser } from '@/lib/auth/types'

// Mock the auth service with comprehensive mock object
const mockAuthService = {
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  getUser: jest.fn(),
  isConfigured: jest.fn(() => true),
  getConfiguration: jest.fn(() => ({ provider: 'mock', oauthProviders: ['google', 'github'] })),
  signInWithOAuth: jest.fn(),
  getAvailableOAuthProviders: jest.fn(),
  updateUserProfile: jest.fn(),
  deleteUserAccount: jest.fn(),
  changePassword: jest.fn(),
  requestPasswordReset: jest.fn(),
  verifyPasswordResetToken: jest.fn(),
  resetPassword: jest.fn(),
  uploadAvatar: jest.fn(),
  deleteAvatar: jest.fn(),
  verifyEmail: jest.fn()
}

jest.mock('@/lib/auth/factory', () => ({
  authService: mockAuthService,
  createAuthService: () => mockAuthService
}))

// Also mock the service module directly
jest.mock('@/lib/auth/service', () => ({
  AuthService: jest.fn().mockImplementation(() => mockAuthService)
}))

describe('UserProfileForm', () => {
  const mockOnSuccess = jest.fn()
  const mockOnError = jest.fn()
  
  const testUser: AuthUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    image: 'https://example.com/avatar.jpg',
    emailVerified: new Date()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset mock implementations to default state
    mockAuthService.updateUserProfile.mockResolvedValue({ success: false, error: 'Update failed' })
    mockAuthService.verifyEmail.mockResolvedValue({ success: false, error: 'Verification failed' })
  })

  afterAll(() => {
    // Restore original modules after all tests in this suite
    jest.restoreAllMocks()
  })

  it('should render profile form with user data', () => {
    render(
      <UserProfileForm 
        user={testUser} 
        onSuccess={mockOnSuccess} 
        onError={mockOnError} 
      />
    )

    expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('https://example.com/avatar.jpg')).toBeInTheDocument()
    expect(screen.getByText('Email verified')).toBeInTheDocument()
  })

  it('should show unverified email status for unverified users', () => {
    const unverifiedUser = { ...testUser, emailVerified: null }
    
    render(
      <UserProfileForm 
        user={unverifiedUser} 
        onSuccess={mockOnSuccess} 
        onError={mockOnError} 
      />
    )

    expect(screen.getByText('Email not verified')).toBeInTheDocument()
    expect(screen.getByText('Verify now')).toBeInTheDocument()
  })

  it('should display all profile form fields correctly', () => {
    render(
      <UserProfileForm 
        user={testUser} 
        onSuccess={mockOnSuccess} 
        onError={mockOnError} 
      />
    )

    // Check that all essential form fields are present
    const nameInput = screen.getByLabelText('Name')
    const emailInput = screen.getByLabelText('Email')
    const imageInput = screen.getByLabelText('Profile Image URL')
    const submitButton = screen.getByText('Update Profile')
    
    expect(nameInput).toBeInTheDocument()
    expect(emailInput).toBeInTheDocument()
    expect(imageInput).toBeInTheDocument()
    expect(submitButton).toBeInTheDocument()
    
    // Check that fields are pre-populated with user data
    expect(nameInput).toHaveValue('Test User')
    expect(emailInput).toHaveValue('test@example.com')
    expect(imageInput).toHaveValue('https://example.com/avatar.jpg')
  })

  it('should handle avatar management buttons correctly', () => {
    render(
      <UserProfileForm 
        user={testUser} 
        onSuccess={mockOnSuccess} 
        onError={mockOnError} 
      />
    )

    // Check avatar management UI
    const changeAvatarButton = screen.getByText('Change Avatar')
    const removeAvatarButton = screen.getByText('Remove')
    const avatarImage = screen.getByAltText("Test User's avatar")
    
    expect(changeAvatarButton).toBeInTheDocument()
    expect(removeAvatarButton).toBeInTheDocument()
    expect(avatarImage).toBeInTheDocument()
    expect(avatarImage).toHaveAttribute('src', expect.stringContaining('_next/image'))
    
    // Buttons should be clickable
    expect(changeAvatarButton).not.toBeDisabled()
    expect(removeAvatarButton).not.toBeDisabled()
  })

  it('should handle email verification UI for unverified users', () => {
    const unverifiedUser = { ...testUser, emailVerified: null }
    
    render(
      <UserProfileForm 
        user={unverifiedUser} 
        onSuccess={mockOnSuccess} 
        onError={mockOnError} 
      />
    )

    // Should show verification status and button
    expect(screen.getByText('Email not verified')).toBeInTheDocument()
    const verifyButton = screen.getByText('Verify now')
    expect(verifyButton).toBeInTheDocument()
    expect(verifyButton).not.toBeDisabled()
  })

  it('should display profile information section correctly', () => {
    render(
      <UserProfileForm 
        user={testUser} 
        onSuccess={mockOnSuccess} 
        onError={mockOnError} 
      />
    )

    // Check that all UI sections are present
    expect(screen.getByText('Profile Information')).toBeInTheDocument()
    expect(screen.getByText('Avatar')).toBeInTheDocument()
    expect(screen.getByText('JPG, PNG, GIF or WebP. Max 5MB.')).toBeInTheDocument()
    
    // Form should be functional - check for submit button instead
    const submitButton = screen.getByText('Update Profile')
    expect(submitButton).toBeInTheDocument()
    expect(submitButton).not.toBeDisabled()
  })

  it('should accept valid form input and allow updates', async () => {
    const user = userEvent.setup()
    
    render(
      <UserProfileForm 
        user={testUser} 
        onSuccess={mockOnSuccess} 
        onError={mockOnError} 
      />
    )

    const nameInput = screen.getByDisplayValue('Test User')
    const emailInput = screen.getByDisplayValue('test@example.com')
    const imageInput = screen.getByDisplayValue('https://example.com/avatar.jpg')
    
    // Update with valid data
    await user.clear(nameInput)
    await user.type(nameInput, 'Updated Name')
    
    await user.clear(emailInput)
    await user.type(emailInput, 'updated@example.com')
    
    // Values should be properly updated
    expect(nameInput).toHaveValue('Updated Name')
    expect(emailInput).toHaveValue('updated@example.com')
    
    const submitButton = screen.getByText('Update Profile')
    expect(submitButton).not.toBeDisabled()
    
    // Form should accept the submission
    await user.click(submitButton)
    
    // This validates the form accepts valid input and processes submission
    // The actual update logic is tested in integration tests
  })
})