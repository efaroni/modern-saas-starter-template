import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { MockAuthProvider } from '@/lib/auth/providers/mock'
import { AuthService } from '@/lib/auth/service'
import type { AuthUser } from '@/lib/auth/types'

describe('User Profile Management', () => {
  let authProvider: MockAuthProvider
  let authService: AuthService
  let testUser: AuthUser

  beforeEach(async () => {
    authProvider = new MockAuthProvider()
    authService = new AuthService(authProvider)
    
    // Create a test user
    const result = await authService.signUp({
      email: 'profile@example.com',
      password: 'password123',
      name: 'Test Profile User'
    })
    
    if (result.success && result.user) {
      testUser = result.user
    }
  })

  describe('Get User Profile', () => {
    it('should retrieve user profile by id', async () => {
      const result = await authService.getUserProfile(testUser.id)
      
      expect(result.success).toBe(true)
      expect(result.user).toEqual({
        id: testUser.id,
        email: 'profile@example.com',
        name: 'Test Profile User',
        image: null,
        emailVerified: null
      })
    })

    it('should return null for non-existent user', async () => {
      const result = await authService.getUserProfile('non-existent-id')
      
      expect(result.success).toBe(true)
      expect(result.user).toBeNull()
    })

    it('should get current user profile from session', async () => {
      const result = await authService.getCurrentUserProfile()
      
      expect(result.success).toBe(true)
      expect(result.user?.email).toBe('profile@example.com')
    })

    it('should return null when no user is logged in', async () => {
      await authService.signOut()
      const result = await authService.getCurrentUserProfile()
      
      expect(result.success).toBe(true)
      expect(result.user).toBeNull()
    })
  })

  describe('Update User Profile', () => {
    it('should update user name', async () => {
      const result = await authService.updateUserProfile(testUser.id, {
        name: 'Updated Name'
      })
      
      expect(result.success).toBe(true)
      expect(result.user?.name).toBe('Updated Name')
      expect(result.user?.email).toBe('profile@example.com')
    })

    it('should update user email', async () => {
      const result = await authService.updateUserProfile(testUser.id, {
        email: 'newemail@example.com'
      })
      
      expect(result.success).toBe(true)
      expect(result.user?.email).toBe('newemail@example.com')
      expect(result.user?.emailVerified).toBeNull()
    })

    it('should update user image', async () => {
      const result = await authService.updateUserProfile(testUser.id, {
        image: 'https://example.com/avatar.jpg'
      })
      
      expect(result.success).toBe(true)
      expect(result.user?.image).toBe('https://example.com/avatar.jpg')
    })

    it('should update multiple fields at once', async () => {
      const result = await authService.updateUserProfile(testUser.id, {
        name: 'New Name',
        email: 'new@example.com',
        image: 'https://example.com/new-avatar.jpg'
      })
      
      expect(result.success).toBe(true)
      expect(result.user?.name).toBe('New Name')
      expect(result.user?.email).toBe('new@example.com')
      expect(result.user?.image).toBe('https://example.com/new-avatar.jpg')
    })

    it('should fail to update non-existent user', async () => {
      const result = await authService.updateUserProfile('non-existent-id', {
        name: 'Should Fail'
      })
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('User not found')
    })

    it('should fail to update email to existing email', async () => {
      // Try to update to the existing test user email (test@example.com is hardcoded in mock)
      const result = await authService.updateUserProfile(testUser.id, {
        email: 'test@example.com'
      })
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Email already in use')
    })

    it('should validate email format on update', async () => {
      const result = await authService.updateUserProfile(testUser.id, {
        email: 'invalid-email'
      })
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid email format')
    })
  })

  describe('Delete User Account', () => {
    it('should delete user account', async () => {
      const deleteResult = await authService.deleteUserAccount(testUser.id)
      
      expect(deleteResult.success).toBe(true)
      
      // Verify user is deleted
      const getResult = await authService.getUserProfile(testUser.id)
      expect(getResult.user).toBeNull()
    })

    it('should fail to delete non-existent user', async () => {
      const result = await authService.deleteUserAccount('non-existent-id')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('User not found')
    })

    it('should clear session when deleting current user', async () => {
      const deleteResult = await authService.deleteUserAccount(testUser.id)
      expect(deleteResult.success).toBe(true)
      
      const sessionResult = await authService.getUser()
      expect(sessionResult.user).toBeNull()
    })
  })

  describe('Email Verification', () => {
    it('should mark email as verified', async () => {
      const result = await authService.verifyEmail(testUser.id)
      
      expect(result.success).toBe(true)
      expect(result.user?.emailVerified).toBeInstanceOf(Date)
    })

    it('should fail to verify email for non-existent user', async () => {
      const result = await authService.verifyEmail('non-existent-id')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('User not found')
    })
  })

  describe('Change Password', () => {
    it('should change user password with correct current password', async () => {
      const result = await authService.changePassword(testUser.id, {
        currentPassword: 'password123',
        newPassword: 'newpassword123'
      })
      
      expect(result.success).toBe(true)
      
      // Verify can login with new password
      await authService.signOut()
      const loginResult = await authService.signIn({
        email: 'profile@example.com',
        password: 'newpassword123'
      })
      
      expect(loginResult.success).toBe(true)
    })

    it('should fail to change password with incorrect current password', async () => {
      const result = await authService.changePassword(testUser.id, {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123'
      })
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Current password is incorrect')
    })

    it('should fail to change password for non-existent user', async () => {
      const result = await authService.changePassword('non-existent-id', {
        currentPassword: 'password123',
        newPassword: 'newpassword123'
      })
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('User not found')
    })

    it('should validate new password length', async () => {
      const result = await authService.changePassword(testUser.id, {
        currentPassword: 'password123',
        newPassword: 'short'
      })
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Password must be at least 8 characters')
    })
  })
})