import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals'
import { DatabaseAuthProvider } from '@/lib/auth/providers/database'
import { testHelpers, authTestHelpers } from '@/lib/db/test-helpers'

describe('DatabaseAuthProvider', () => {
  const provider = new DatabaseAuthProvider()

  beforeAll(async () => {
    await testHelpers.setupTest()
  })

  afterAll(async () => {
    await testHelpers.teardownTest()
  })

  beforeEach(async () => {
    await authTestHelpers.cleanupAuthData()
  })

  afterEach(async () => {
    await authTestHelpers.cleanupAuthData()
  })

  describe('createUser', () => {
    it('should create a user with hashed password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      }

      const result = await provider.createUser(userData)

      authTestHelpers.assertAuthResult(result, true)
      expect(result.user?.email).toBe(userData.email)
      expect(result.user?.name).toBe(userData.name)
      expect(result.user?.id).toBeDefined()
      authTestHelpers.assertUserStructure(result.user!)
    })

    it('should reject invalid email formats', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'password123',
        name: 'Test User'
      }

      const result = await provider.createUser(userData)

      authTestHelpers.assertAuthResult(result, false)
      expect(result.error).toBe('Invalid email format')
    })

    it('should reject weak passwords', async () => {
      const userData = {
        email: 'test@example.com',
        password: '123',
        name: 'Test User'
      }

      const result = await provider.createUser(userData)

      authTestHelpers.assertAuthResult(result, false)
      expect(result.error).toBe('Password must be at least 8 characters')
    })

    it('should reject duplicate emails', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      }

      // Create first user
      const firstResult = await provider.createUser(userData)
      authTestHelpers.assertAuthResult(firstResult, true)

      // Try to create second user with same email
      const secondResult = await provider.createUser(userData)
      authTestHelpers.assertAuthResult(secondResult, false)
      expect(secondResult.error).toBe('Email already exists')
    })
  })

  describe('authenticateUser', () => {
    it('should authenticate user with correct credentials', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      }

      // Create user first
      const createResult = await provider.createUser(userData)
      authTestHelpers.assertAuthResult(createResult, true)

      // Authenticate with correct password
      const authResult = await provider.authenticateUser(userData.email, userData.password)
      authTestHelpers.assertAuthResult(authResult, true)
      expect(authResult.user?.email).toBe(userData.email)
      expect(authResult.user?.name).toBe(userData.name)
      authTestHelpers.assertUserStructure(authResult.user!)
    })

    it('should reject authentication with wrong password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      }

      // Create user first
      const createResult = await provider.createUser(userData)
      authTestHelpers.assertAuthResult(createResult, true)

      // Try to authenticate with wrong password
      const authResult = await provider.authenticateUser(userData.email, 'wrongpassword')
      authTestHelpers.assertAuthResult(authResult, false)
      expect(authResult.error).toBe('Invalid credentials')
    })

    it('should reject authentication for non-existent user', async () => {
      const authResult = await provider.authenticateUser('nonexistent@example.com', 'password123')
      authTestHelpers.assertAuthResult(authResult, false)
      expect(authResult.error).toBe('Invalid credentials')
    })
  })

  describe('getUserById', () => {
    it('should get user by ID', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      }

      // Create user first
      const createResult = await provider.createUser(userData)
      authTestHelpers.assertAuthResult(createResult, true)

      // Get user by ID
      const getUserResult = await provider.getUserById(createResult.user!.id)
      authTestHelpers.assertAuthResult(getUserResult, true)
      expect(getUserResult.user?.email).toBe(userData.email)
      expect(getUserResult.user?.name).toBe(userData.name)
      authTestHelpers.assertUserStructure(getUserResult.user!)
    })

    it('should return null for non-existent user', async () => {
      const getUserResult = await provider.getUserById('non-existent-id')
      expect(getUserResult.success).toBe(true)
      expect(getUserResult.user).toBe(null)
    })
  })

  describe('getUserByEmail', () => {
    it('should get user by email', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      }

      // Create user first
      const createResult = await provider.createUser(userData)
      authTestHelpers.assertAuthResult(createResult, true)

      // Get user by email
      const getUserResult = await provider.getUserByEmail(userData.email)
      authTestHelpers.assertAuthResult(getUserResult, true)
      expect(getUserResult.user?.email).toBe(userData.email)
      expect(getUserResult.user?.name).toBe(userData.name)
      authTestHelpers.assertUserStructure(getUserResult.user!)
    })

    it('should return null for non-existent email', async () => {
      const getUserResult = await provider.getUserByEmail('nonexistent@example.com')
      expect(getUserResult.success).toBe(true)
      expect(getUserResult.user).toBe(null)
    })
  })

  describe('updateUser', () => {
    it('should update user profile', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      }

      // Create user first
      const createResult = await provider.createUser(userData)
      authTestHelpers.assertAuthResult(createResult, true)

      // Update user
      const updateData = {
        name: 'Updated Name',
        image: 'https://example.com/avatar.jpg'
      }
      const updateResult = await provider.updateUser(createResult.user!.id, updateData)
      authTestHelpers.assertAuthResult(updateResult, true)
      expect(updateResult.user?.name).toBe(updateData.name)
      expect(updateResult.user?.image).toBe(updateData.image)
      authTestHelpers.assertUserStructure(updateResult.user!)
    })

    it('should update user email and reset verification', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      }

      // Create user first
      const createResult = await provider.createUser(userData)
      authTestHelpers.assertAuthResult(createResult, true)

      // Verify email first
      const verifyResult = await provider.verifyUserEmail(createResult.user!.id)
      authTestHelpers.assertAuthResult(verifyResult, true)
      expect(verifyResult.user?.emailVerified).toBeTruthy()

      // Update email
      const updateData = {
        email: 'updated@example.com'
      }
      const updateResult = await provider.updateUser(createResult.user!.id, updateData)
      authTestHelpers.assertAuthResult(updateResult, true)
      expect(updateResult.user?.email).toBe(updateData.email)
      expect(updateResult.user?.emailVerified).toBe(null) // Should be reset
      authTestHelpers.assertUserStructure(updateResult.user!)
    })

    it('should reject invalid email format', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      }

      // Create user first
      const createResult = await provider.createUser(userData)
      authTestHelpers.assertAuthResult(createResult, true)

      // Try to update with invalid email
      const updateData = {
        email: 'invalid-email'
      }
      const updateResult = await provider.updateUser(createResult.user!.id, updateData)
      authTestHelpers.assertAuthResult(updateResult, false)
      expect(updateResult.error).toBe('Invalid email format')
    })

    it('should reject duplicate email', async () => {
      // Create first user
      const user1Data = {
        email: 'user1@example.com',
        password: 'password123',
        name: 'User 1'
      }
      const createResult1 = await provider.createUser(user1Data)
      authTestHelpers.assertAuthResult(createResult1, true)

      // Create second user
      const user2Data = {
        email: 'user2@example.com',
        password: 'password123',
        name: 'User 2'
      }
      const createResult2 = await provider.createUser(user2Data)
      authTestHelpers.assertAuthResult(createResult2, true)

      // Try to update second user with first user's email
      const updateData = {
        email: user1Data.email
      }
      const updateResult = await provider.updateUser(createResult2.user!.id, updateData)
      authTestHelpers.assertAuthResult(updateResult, false)
      expect(updateResult.error).toBe('Email already in use')
    })

    it('should return error for non-existent user', async () => {
      const updateData = {
        name: 'Updated Name'
      }
      const updateResult = await provider.updateUser('non-existent-id', updateData)
      authTestHelpers.assertAuthResult(updateResult, false)
      expect(updateResult.error).toBe('User not found')
    })
  })

  describe('deleteUser', () => {
    it('should delete user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      }

      // Create user first
      const createResult = await provider.createUser(userData)
      authTestHelpers.assertAuthResult(createResult, true)

      // Delete user
      const deleteResult = await provider.deleteUser(createResult.user!.id)
      authTestHelpers.assertAuthResult(deleteResult, true, false)

      // Verify user is deleted
      const getUserResult = await provider.getUserById(createResult.user!.id)
      expect(getUserResult.success).toBe(true)
      expect(getUserResult.user).toBe(null)
    })

    it('should return error for non-existent user', async () => {
      const deleteResult = await provider.deleteUser('non-existent-id')
      authTestHelpers.assertAuthResult(deleteResult, false)
      expect(deleteResult.error).toBe('User not found')
    })
  })

  describe('verifyUserEmail', () => {
    it('should verify user email', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      }

      // Create user first
      const createResult = await provider.createUser(userData)
      authTestHelpers.assertAuthResult(createResult, true)
      expect(createResult.user?.emailVerified).toBe(null)

      // Verify email
      const verifyResult = await provider.verifyUserEmail(createResult.user!.id)
      authTestHelpers.assertAuthResult(verifyResult, true)
      expect(verifyResult.user?.emailVerified).toBeTruthy()
      authTestHelpers.assertUserStructure(verifyResult.user!)
    })

    it('should return error for non-existent user', async () => {
      const verifyResult = await provider.verifyUserEmail('non-existent-id')
      authTestHelpers.assertAuthResult(verifyResult, false)
      expect(verifyResult.error).toBe('User not found')
    })
  })

  describe('changeUserPassword', () => {
    it('should change user password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      }

      // Create user first
      const createResult = await provider.createUser(userData)
      authTestHelpers.assertAuthResult(createResult, true)

      // Change password
      const newPassword = 'newpassword123'
      const changeResult = await provider.changeUserPassword(createResult.user!.id, userData.password, newPassword)
      authTestHelpers.assertAuthResult(changeResult, true)
      authTestHelpers.assertUserStructure(changeResult.user!)

      // Verify new password works
      const authResult = await provider.authenticateUser(userData.email, newPassword)
      authTestHelpers.assertAuthResult(authResult, true)

      // Verify old password doesn't work
      const oldAuthResult = await provider.authenticateUser(userData.email, userData.password)
      authTestHelpers.assertAuthResult(oldAuthResult, false)
    })

    it('should reject incorrect current password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      }

      // Create user first
      const createResult = await provider.createUser(userData)
      authTestHelpers.assertAuthResult(createResult, true)

      // Try to change password with wrong current password
      const changeResult = await provider.changeUserPassword(createResult.user!.id, 'wrongpassword', 'newpassword123')
      authTestHelpers.assertAuthResult(changeResult, false)
      expect(changeResult.error).toBe('Current password is incorrect')
    })

    it('should reject weak new password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      }

      // Create user first
      const createResult = await provider.createUser(userData)
      authTestHelpers.assertAuthResult(createResult, true)

      // Try to change to weak password
      const changeResult = await provider.changeUserPassword(createResult.user!.id, userData.password, '123')
      authTestHelpers.assertAuthResult(changeResult, false)
      expect(changeResult.error).toBe('Password must be at least 8 characters')
    })

    it('should return error for non-existent user', async () => {
      const changeResult = await provider.changeUserPassword('non-existent-id', 'password123', 'newpassword123')
      authTestHelpers.assertAuthResult(changeResult, false)
      expect(changeResult.error).toBe('User not found')
    })
  })

  describe('resetUserPassword', () => {
    it('should reset user password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      }

      // Create user first
      const createResult = await provider.createUser(userData)
      authTestHelpers.assertAuthResult(createResult, true)

      // Reset password
      const newPassword = 'resetpassword123'
      const resetResult = await provider.resetUserPassword(createResult.user!.id, newPassword)
      authTestHelpers.assertAuthResult(resetResult, true)
      authTestHelpers.assertUserStructure(resetResult.user!)

      // Verify new password works
      const authResult = await provider.authenticateUser(userData.email, newPassword)
      authTestHelpers.assertAuthResult(authResult, true)

      // Verify old password doesn't work
      const oldAuthResult = await provider.authenticateUser(userData.email, userData.password)
      authTestHelpers.assertAuthResult(oldAuthResult, false)
    })

    it('should reject weak new password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      }

      // Create user first
      const createResult = await provider.createUser(userData)
      authTestHelpers.assertAuthResult(createResult, true)

      // Try to reset to weak password
      const resetResult = await provider.resetUserPassword(createResult.user!.id, '123')
      authTestHelpers.assertAuthResult(resetResult, false)
      expect(resetResult.error).toBe('Password must be at least 8 characters')
    })

    it('should return error for non-existent user', async () => {
      const resetResult = await provider.resetUserPassword('non-existent-id', 'newpassword123')
      authTestHelpers.assertAuthResult(resetResult, false)
      expect(resetResult.error).toBe('User not found')
    })
  })

  describe('configuration', () => {
    it('should report as configured when DATABASE_URL is set', async () => {
      expect(provider.isConfigured()).toBe(true)
    })

    it('should return correct configuration', async () => {
      const config = provider.getConfiguration()
      expect(config.provider).toBe('nextauth')
      expect(config.oauthProviders).toEqual([])
    })
  })

  describe('OAuth methods', () => {
    it('should return not implemented for OAuth signin', async () => {
      const result = await provider.signInWithOAuth('google')
      expect(result.success).toBe(false)
      expect(result.error).toBe('OAuth not implemented yet')
    })

    it('should return empty array for OAuth providers', async () => {
      const providers = provider.getAvailableOAuthProviders()
      expect(providers).toEqual([])
    })
  })
})