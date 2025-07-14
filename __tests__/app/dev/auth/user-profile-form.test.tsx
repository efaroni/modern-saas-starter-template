import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { UserProfileForm } from '@/app/dev/auth/components/user-profile-form'
import type { AuthUser } from '@/lib/auth/types'

// Mock the auth service
const mockUpdateUserProfile = jest.fn()
const mockVerifyEmail = jest.fn()

jest.mock('@/lib/auth/factory', () => ({
  authService: {
    updateUserProfile: mockUpdateUserProfile,
    verifyEmail: mockVerifyEmail
  }
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

  it('should update user profile successfully', async () => {
    const user = userEvent.setup()
    const updatedUser = { ...testUser, name: 'Updated Name' }
    mockUpdateUserProfile.mockResolvedValue({ success: true, user: updatedUser })

    render(
      <UserProfileForm 
        user={testUser} 
        onSuccess={mockOnSuccess} 
        onError={mockOnError} 
      />
    )

    const nameInput = screen.getByDisplayValue('Test User')
    await user.clear(nameInput)
    await user.type(nameInput, 'Updated Name')

    const submitButton = screen.getByText('Update Profile')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockUpdateUserProfile).toHaveBeenCalledWith('test-user-id', {
        name: 'Updated Name',
        email: 'test@example.com',
        image: 'https://example.com/avatar.jpg'
      })
      expect(mockOnSuccess).toHaveBeenCalledWith(updatedUser)
    })
  })

  it('should handle profile update error', async () => {
    const user = userEvent.setup()
    mockUpdateUserProfile.mockResolvedValue({ success: false, error: 'Update failed' })

    render(
      <UserProfileForm 
        user={testUser} 
        onSuccess={mockOnSuccess} 
        onError={mockOnError} 
      />
    )

    const submitButton = screen.getByText('Update Profile')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('Update failed')
    })
  })

  it('should verify email successfully', async () => {
    const user = userEvent.setup()
    const unverifiedUser = { ...testUser, emailVerified: null }
    const verifiedUser = { ...testUser, emailVerified: new Date() }
    mockVerifyEmail.mockResolvedValue({ success: true, user: verifiedUser })

    render(
      <UserProfileForm 
        user={unverifiedUser} 
        onSuccess={mockOnSuccess} 
        onError={mockOnError} 
      />
    )

    const verifyButton = screen.getByText('Verify now')
    await user.click(verifyButton)

    await waitFor(() => {
      expect(mockVerifyEmail).toHaveBeenCalledWith('test-user-id')
      expect(mockOnSuccess).toHaveBeenCalledWith(verifiedUser)
    })
  })

  it('should handle email verification error', async () => {
    const user = userEvent.setup()
    const unverifiedUser = { ...testUser, emailVerified: null }
    mockVerifyEmail.mockResolvedValue({ success: false, error: 'Verification failed' })

    render(
      <UserProfileForm 
        user={unverifiedUser} 
        onSuccess={mockOnSuccess} 
        onError={mockOnError} 
      />
    )

    const verifyButton = screen.getByText('Verify now')
    await user.click(verifyButton)

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('Verification failed')
    })
  })

  it('should show loading state during profile update', async () => {
    const user = userEvent.setup()
    
    let resolveUpdate: (value: any) => void
    const updatePromise = new Promise((resolve) => {
      resolveUpdate = resolve
    })
    mockUpdateUserProfile.mockReturnValue(updatePromise)

    render(
      <UserProfileForm 
        user={testUser} 
        onSuccess={mockOnSuccess} 
        onError={mockOnError} 
      />
    )

    const submitButton = screen.getByText('Update Profile')
    await user.click(submitButton)

    expect(screen.getByText('Updating...')).toBeInTheDocument()
    expect(submitButton).toBeDisabled()

    resolveUpdate!({ success: true, user: testUser })

    await waitFor(() => {
      expect(screen.getByText('Update Profile')).toBeInTheDocument()
      expect(submitButton).not.toBeDisabled()
    })
  })

  it('should validate form fields', async () => {
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
    
    await user.clear(nameInput)
    await user.clear(emailInput)
    await user.type(emailInput, 'invalid-email')

    const submitButton = screen.getByText('Update Profile')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument()
      expect(screen.getByText('Invalid email format')).toBeInTheDocument()
    })

    expect(mockUpdateUserProfile).not.toHaveBeenCalled()
  })
})