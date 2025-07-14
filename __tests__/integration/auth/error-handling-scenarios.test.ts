import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { AuthService } from '@/lib/auth/service'
import { MockAuthProvider } from '@/lib/auth/providers/mock'
import { MemorySessionStorage } from '@/lib/auth/session-storage'
import { MockEmailService } from '@/lib/email/mock'
import { MockUploadService } from '@/lib/upload/mock'
import type { AuthUser } from '@/lib/auth/types'

/**
 * Integration Tests: Auth Error Handling Scenarios
 * 
 * These tests validate error handling and edge cases in auth workflows:
 * - Business rule violations and constraint enforcement
 * - Service failure scenarios and graceful degradation
 * - Invalid input handling and validation
 * - Race conditions and concurrent operations
 * - External service failures and recovery
 */

describe('Auth Integration - Error Handling Scenarios', () => {
  let authService: AuthService
  let authProvider: MockAuthProvider
  let sessionStorage: MemorySessionStorage
  let emailService: MockEmailService
  let uploadService: MockUploadService

  beforeEach(() => {
    authProvider = new MockAuthProvider()
    sessionStorage = new MemorySessionStorage()
    emailService = new MockEmailService()
    uploadService = new MockUploadService()
    
    authService = new AuthService(authProvider, sessionStorage, emailService, uploadService)
    
    emailService.clearSentEmails()
    uploadService.clearUploadedFiles()
  })

  afterEach(() => {
    sessionStorage.removeSession()
    emailService.clearSentEmails()
    uploadService.clearUploadedFiles()
  })

  describe('Business Rule Violations', () => {
    it('should handle duplicate email registration gracefully', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'validPassword123',
        name: 'First User'
      }

      // First registration should succeed
      const firstResult = await authService.signUp(userData)
      expect(firstResult.success).toBe(true)
      expect(firstResult.user?.email).toBe(userData.email)

      // Second registration with same email should fail
      const secondResult = await authService.signUp({
        ...userData,
        name: 'Second User'
      })

      expect(secondResult.success).toBe(false)
      expect(secondResult.error).toBe('Email already exists')
      expect(secondResult.user).toBeUndefined()

      // Verify first user is still valid
      const sessionResult = await authService.getUser()
      expect(sessionResult.user?.name).toBe('First User')
    })

    it('should enforce password strength requirements', async () => {
      const baseUserData = {
        email: 'weakpassword@example.com',
        name: 'Weak Password User'
      }

      // Test various weak passwords
      const weakPasswords = [
        'short',      // Too short
        '1234567',    // Too short
        '',           // Empty
        ' ',          // Whitespace only
      ]

      for (const password of weakPasswords) {
        const result = await authService.signUp({
          ...baseUserData,
          password
        })

        expect(result.success).toBe(false)
        expect(result.error).toBe('Password must be at least 8 characters')
        expect(result.user).toBeUndefined()
      }

      // Verify no user was created
      const sessionResult = await authService.getUser()
      expect(sessionResult.user).toBeNull()
    })

    it('should validate email format requirements', async () => {
      const baseUserData = {
        password: 'validPassword123',
        name: 'Invalid Email User'
      }

      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user@.com',
        'user@com',
        '',
        ' ',
        'user space@example.com'
      ]

      for (const email of invalidEmails) {
        const result = await authService.signUp({
          ...baseUserData,
          email
        })

        expect(result.success).toBe(false)
        expect(result.error).toBe('Invalid email format')
        expect(result.user).toBeUndefined()
      }

      // Verify no user was created
      const sessionResult = await authService.getUser()
      expect(sessionResult.user).toBeNull()
    })

    it('should handle profile update with duplicate email', async () => {
      // Create two users
      const user1Result = await authService.signUp({
        email: 'user1@example.com',
        password: 'password123',
        name: 'User One'
      })

      await authService.signOut()

      const user2Result = await authService.signUp({
        email: 'user2@example.com',
        password: 'password123',
        name: 'User Two'
      })

      // Try to update user2's email to user1's email
      const updateResult = await authService.updateUserProfile(user2Result.user!.id, {
        email: 'user1@example.com'
      })

      expect(updateResult.success).toBe(false)
      expect(updateResult.error).toBe('Email already in use')

      // Verify user2's email wasn't changed
      const currentUser = await authService.getUser()
      expect(currentUser.user?.email).toBe('user2@example.com')
    })
  })

  describe('Authentication Failures', () => {
    let testUser: AuthUser

    beforeEach(async () => {
      const signUpResult = await authService.signUp({
        email: 'authfail@example.com',
        password: 'correctPassword123',
        name: 'Auth Test User'
      })
      testUser = signUpResult.user!
      await authService.signOut()
    })

    it('should handle invalid credentials gracefully', async () => {
      const invalidCredentials = [
        { email: 'authfail@example.com', password: 'wrongpassword' },
        { email: 'nonexistent@example.com', password: 'correctPassword123' },
        { email: 'authfail@example.com', password: '' },
        { email: '', password: 'correctPassword123' },
        { email: 'AUTHFAIL@EXAMPLE.COM', password: 'correctPassword123' }, // Case sensitive
      ]

      for (const credentials of invalidCredentials) {
        const result = await authService.signIn(credentials)

        expect(result.success).toBe(false)
        expect(result.error).toMatch(/Email is required|Password is required|Invalid credentials/)
        expect(result.user).toBeUndefined()

        // Verify no session was created
        const sessionResult = await authService.getUser()
        expect(sessionResult.user).toBeNull()
      }
    })

    it('should handle password change with wrong current password', async () => {
      // Sign in first
      await authService.signIn({
        email: 'authfail@example.com',
        password: 'correctPassword123'
      })

      const passwordChangeResult = await authService.changePassword(testUser.id, {
        currentPassword: 'wrongCurrentPassword',
        newPassword: 'newPassword123'
      })

      expect(passwordChangeResult.success).toBe(false)
      expect(passwordChangeResult.error).toBe('Current password is incorrect')

      // Verify password wasn't changed
      await authService.signOut()
      const signInResult = await authService.signIn({
        email: 'authfail@example.com',
        password: 'correctPassword123'
      })

      expect(signInResult.success).toBe(true)
    })

    it('should handle OAuth with unsupported provider', async () => {
      const unsupportedProviders = [
        'facebook',
        'twitter',
        'linkedin',
        'apple',
        'invalid-provider',
        '',
        ' '
      ]

      for (const provider of unsupportedProviders) {
        const result = await authService.signInWithOAuth(provider)

        expect(result.success).toBe(false)
        expect(result.error).toContain('not supported')

        // Verify no session was created
        const sessionResult = await authService.getUser()
        expect(sessionResult.user).toBeNull()
      }
    })
  })

  describe('Password Reset Failures', () => {
    let testUser: AuthUser

    beforeEach(async () => {
      const signUpResult = await authService.signUp({
        email: 'resetfail@example.com',
        password: 'originalPassword123',
        name: 'Reset Test User'
      })
      testUser = signUpResult.user!
      await authService.signOut()
    })

    it('should handle password reset with invalid email formats', async () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        '',
        ' '
      ]

      for (const email of invalidEmails) {
        const result = await authService.requestPasswordReset(email)

        expect(result.success).toBe(false)
        expect(result.error).toBe('Invalid email format')
      }

      // Verify no emails were sent
      const sentEmails = emailService.getSentEmails()
      expect(sentEmails).toHaveLength(0)
    })

    it('should handle password reset with non-existent email', async () => {
      const result = await authService.requestPasswordReset('nonexistent@example.com')

      // Should return success for security (don't reveal if email exists)
      expect(result.success).toBe(true)

      // But no email should be sent
      const sentEmails = emailService.getSentEmails()
      expect(sentEmails).toHaveLength(0)
    })

    it('should handle password reset with invalid tokens', async () => {
      const invalidTokens = [
        'invalid-token',
        'expired-token',
        '',
        ' ',
        'malformed-token-123'
      ]

      for (const token of invalidTokens) {
        const verifyResult = await authService.verifyPasswordResetToken(token)

        expect(verifyResult.success).toBe(false)
        expect(verifyResult.error).toBe('Invalid or expired reset token')

        const resetResult = await authService.resetPassword(token, 'newPassword123')

        expect(resetResult.success).toBe(false)
        expect(resetResult.error).toBe('Invalid or expired reset token')
      }
    })

    it('should handle password reset with weak new password', async () => {
      // Get valid reset token
      await authService.requestPasswordReset(testUser.email)
      const sentEmails = emailService.getSentEmails()
      const resetToken = sentEmails[0].data.resetToken

      const weakPasswords = [
        'short',
        '1234567',
        '',
        ' '
      ]

      for (const password of weakPasswords) {
        const result = await authService.resetPassword(resetToken, password)

        expect(result.success).toBe(false)
        expect(result.error).toBe('Password must be at least 8 characters')
      }

      // Verify token is still valid after failed attempts
      const verifyResult = await authService.verifyPasswordResetToken(resetToken)
      expect(verifyResult.success).toBe(true)
    })

    it('should handle email service failure during password reset', async () => {
      // Simulate email service failure
      emailService.setShouldFail(true)

      const result = await authService.requestPasswordReset(testUser.email)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to send reset email')

      // Verify no emails were sent
      const sentEmails = emailService.getSentEmails()
      expect(sentEmails).toHaveLength(0)
    })
  })

  describe('File Upload Failures', () => {
    let testUser: AuthUser

    beforeEach(async () => {
      const signUpResult = await authService.signUp({
        email: 'uploadfail@example.com',
        password: 'password123',
        name: 'Upload Test User'
      })
      testUser = signUpResult.user!
    })

    it('should handle invalid file types for avatar upload', async () => {
      const invalidFiles = [
        new File(['content'], 'document.pdf', { type: 'application/pdf' }),
        new File(['content'], 'document.txt', { type: 'text/plain' }),
        new File(['content'], 'video.mp4', { type: 'video/mp4' }),
        new File(['content'], 'audio.mp3', { type: 'audio/mpeg' }),
        new File(['content'], 'script.js', { type: 'application/javascript' }),
      ]

      for (const file of invalidFiles) {
        const result = await authService.uploadAvatar(testUser.id, file)

        expect(result.success).toBe(false)
        expect(result.error).toBe('Invalid file type. Only images are allowed.')
      }

      // Verify user still has no avatar
      const userResult = await authService.getUser()
      expect(userResult.user?.image).toBeNull()
    })

    it('should handle oversized files for avatar upload', async () => {
      // Create a file larger than 5MB
      const largeContent = 'a'.repeat(6 * 1024 * 1024) // 6MB
      const oversizedFile = new File([largeContent], 'large.jpg', { type: 'image/jpeg' })

      const result = await authService.uploadAvatar(testUser.id, oversizedFile)

      expect(result.success).toBe(false)
      expect(result.error).toBe('File too large. Maximum size is 5MB.')

      // Verify user still has no avatar
      const userResult = await authService.getUser()
      expect(userResult.user?.image).toBeNull()
    })

    it('should handle upload service failure', async () => {
      const validFile = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' })

      // Simulate upload service failure
      uploadService.setShouldFail(true)

      const result = await authService.uploadAvatar(testUser.id, validFile)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Upload failed')

      // Verify user still has no avatar
      const userResult = await authService.getUser()
      expect(userResult.user?.image).toBeNull()
    })

    it('should handle avatar deletion when no avatar exists', async () => {
      // Try to delete avatar when user has none
      const result = await authService.deleteAvatar(testUser.id)

      expect(result.success).toBe(false)
      expect(result.error).toBe('User has no avatar to delete')

      // Verify user state unchanged
      const userResult = await authService.getUser()
      expect(userResult.user?.image).toBeNull()
    })
  })

  describe('Session Management Failures', () => {
    it('should handle session refresh when no session exists', async () => {
      // Try to refresh session when logged out
      const result = await authService.refreshSession()

      expect(result.success).toBe(false)
      expect(result.error).toBe('No active session to refresh')

      // Verify still no session
      const sessionResult = await authService.getUser()
      expect(sessionResult.user).toBeNull()
    })

    it('should handle operations on non-existent users', async () => {
      const nonExistentUserId = 'non-existent-user-id'

      // Try various operations on non-existent user
      const profileResult = await authService.updateUserProfile(nonExistentUserId, {
        name: 'Updated Name'
      })

      expect(profileResult.success).toBe(false)
      expect(profileResult.error).toBe('User not found')

      const deleteResult = await authService.deleteUserAccount(nonExistentUserId)

      expect(deleteResult.success).toBe(false)
      expect(deleteResult.error).toBe('User not found')

      const verifyResult = await authService.verifyEmail(nonExistentUserId)

      expect(verifyResult.success).toBe(false)
      expect(verifyResult.error).toBe('User not found')

      const passwordResult = await authService.changePassword(nonExistentUserId, {
        currentPassword: 'old',
        newPassword: 'new'
      })

      expect(passwordResult.success).toBe(false)
      expect(passwordResult.error).toBe('User not found')
    })
  })

  describe('Race Condition Handling', () => {
    it('should handle concurrent login attempts', async () => {
      // Create user first
      await authService.signUp({
        email: 'concurrent@example.com',
        password: 'password123',
        name: 'Concurrent User'
      })

      await authService.signOut()

      // Attempt concurrent logins
      const loginPromises = Array(5).fill(null).map(() =>
        authService.signIn({
          email: 'concurrent@example.com',
          password: 'password123'
        })
      )

      const results = await Promise.all(loginPromises)

      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true)
        expect(result.user).toBeDefined()
      })

      // Should still have valid session
      const sessionResult = await authService.getUser()
      expect(sessionResult.user).toBeDefined()
    })

    it('should handle concurrent profile updates', async () => {
      // Create user first
      const signUpResult = await authService.signUp({
        email: 'profileupdate@example.com',
        password: 'password123',
        name: 'Profile User'
      })

      const userId = signUpResult.user!.id

      // Attempt concurrent profile updates
      const updatePromises = [
        authService.updateUserProfile(userId, { name: 'Name 1' }),
        authService.updateUserProfile(userId, { name: 'Name 2' }),
        authService.updateUserProfile(userId, { name: 'Name 3' }),
      ]

      const results = await Promise.all(updatePromises)

      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true)
      })

      // Final state should be consistent
      const finalUser = await authService.getUser()
      expect(finalUser.user?.name).toMatch(/^Name [1-3]$/)
    })
  })

  describe('Edge Case Scenarios', () => {
    it('should handle empty and whitespace-only inputs', async () => {
      const emptyInputs = [
        { email: '', password: 'password123', name: 'Test' },
        { email: '   ', password: 'password123', name: 'Test' },
        { email: 'test@example.com', password: '', name: 'Test' },
        { email: 'test@example.com', password: '   ', name: 'Test' },
      ]

      for (const input of emptyInputs) {
        const result = await authService.signUp(input)

        expect(result.success).toBe(false)
        expect(result.error).toMatch(/Email is required|Password is required|Invalid email format|Password must be at least 8 characters/)
      }

      // Verify no user was created
      const sessionResult = await authService.getUser()
      expect(sessionResult.user).toBeNull()
    })

    it('should handle extremely long inputs', async () => {
      const longString = 'a'.repeat(1000)

      const result = await authService.signUp({
        email: `${longString}@example.com`,
        password: 'password123',
        name: longString
      })

      // Should handle gracefully (either succeed or fail with proper error)
      expect(typeof result.success).toBe('boolean')
      if (!result.success) {
        expect(result.error).toBeDefined()
      }
    })

    it('should handle special characters in inputs', async () => {
      const specialChars = {
        email: 'test+tag@example.com',
        password: 'P@ssw0rd!#$%^&*()',
        name: 'Test User™ 中文 🚀'
      }

      const result = await authService.signUp(specialChars)

      // Should handle special characters properly
      expect(result.success).toBe(true)
      expect(result.user?.email).toBe(specialChars.email)
      expect(result.user?.name).toBe(specialChars.name)
    })
  })
})