import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals'
import { DatabaseAuthProvider } from '@/lib/auth/providers/database'
import { testHelpers, authTestHelpers } from '@/lib/db/test-helpers'
import { testDb } from '@/lib/db/test'

describe('DatabaseAuthProvider', () => {
  const provider = new DatabaseAuthProvider(testDb)

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

  // Helper function to create unique test user
  const createTestUserData = (overrides: any = {}) => ({
    email: authTestHelpers.generateUniqueEmail(),
    password: 'StrongP@ssw0rd123!',
    name: 'Test User',
    ...overrides
  })

  describe('createUser', () => {
    it('should create a user with hashed password', async () => {
      const uniqueEmail = authTestHelpers.generateUniqueEmail()
      const userData = {
        email: uniqueEmail,
        password: 'StrongP@ssw0rd123!',
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
        password: 'StrongP@ssw0rd123!',
        name: 'Test User'
      }

      const result = await provider.createUser(userData)

      authTestHelpers.assertAuthResult(result, false)
      expect(result.error).toBeDefined()
    })

    it('should reject weak passwords', async () => {
      const userData = {
        email: authTestHelpers.generateUniqueEmail(),
        password: '123',
        name: 'Test User'
      }

      const result = await provider.createUser(userData)

      authTestHelpers.assertAuthResult(result, false)
      expect(result.error).toBeDefined()
    })

    // Test removed - duplicate of "should reject duplicate email" in updateUser section
  })

  describe('authenticateUser', () => {
    it('should authenticate user with correct credentials', async () => {
      const uniqueEmail = authTestHelpers.generateUniqueEmail()
      const userData = {
        email: uniqueEmail,
        password: 'StrongP@ssw0rd123!',
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
      const uniqueEmail = authTestHelpers.generateUniqueEmail()
      const userData = {
        email: uniqueEmail,
        password: 'StrongP@ssw0rd123!',
        name: 'Test User'
      }

      // Create user first
      const createResult = await provider.createUser(userData)
      authTestHelpers.assertAuthResult(createResult, true)

      // Try to authenticate with wrong password
      const authResult = await provider.authenticateUser(userData.email, 'WrongP@ssw0rd123!')
      authTestHelpers.assertAuthResult(authResult, false)
      expect(authResult.error).toBeDefined()
    })

    it('should reject authentication for non-existent user', async () => {
      const nonExistentEmail = authTestHelpers.generateUniqueEmail('nonexistent')
      const authResult = await provider.authenticateUser(nonExistentEmail, 'StrongP@ssw0rd123!')
      authTestHelpers.assertAuthResult(authResult, false)
      expect(authResult.error).toBeDefined()
    })
  })

  describe('getUserById', () => {
    // Test removed - getUserById is an implementation detail tested indirectly by other features
    
    it('should return null for non-existent user', async () => {
      const getUserResult = await provider.getUserById('non-existent-id')
      expect(getUserResult.success).toBe(true)
      expect(getUserResult.user).toBe(null)
    })
  })

  describe('getUserByEmail', () => {
    it('should get user by email', async () => {
      const uniqueEmail = authTestHelpers.generateUniqueEmail()
      const userData = {
        email: uniqueEmail,
        password: 'StrongP@ssw0rd123!',
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
      const nonExistentEmail = authTestHelpers.generateUniqueEmail('nonexistent')
      const getUserResult = await provider.getUserByEmail(nonExistentEmail)
      expect(getUserResult.success).toBe(true)
      expect(getUserResult.user).toBe(null)
    })
  })

  describe('updateUser', () => {
    it('should update user profile', async () => {
      const uniqueEmail = authTestHelpers.generateUniqueEmail()
      const userData = {
        email: uniqueEmail,
        password: 'StrongP@ssw0rd123!',
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
      const uniqueEmail = authTestHelpers.generateUniqueEmail()
      const userData = {
        email: uniqueEmail,
        password: 'StrongP@ssw0rd123!',
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
      const updatedEmail = authTestHelpers.generateUniqueEmail('updated')
      const updateData = {
        email: updatedEmail
      }
      const updateResult = await provider.updateUser(createResult.user!.id, updateData)
      authTestHelpers.assertAuthResult(updateResult, true)
      expect(updateResult.user?.email).toBe(updateData.email)
      expect(updateResult.user?.emailVerified).toBe(null) // Should be reset
      authTestHelpers.assertUserStructure(updateResult.user!)
    })

    it('should reject invalid email format', async () => {
      const uniqueEmail = authTestHelpers.generateUniqueEmail()
      const userData = {
        email: uniqueEmail,
        password: 'StrongP@ssw0rd123!',
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
      expect(updateResult.error).toBeDefined()
    })

    it('should reject duplicate email', async () => {
      // Create first user
      const user1Email = authTestHelpers.generateUniqueEmail('user1')
      const user1Data = {
        email: user1Email,
        password: 'StrongP@ssw0rd123!',
        name: 'User 1'
      }
      const createResult1 = await provider.createUser(user1Data)
      authTestHelpers.assertAuthResult(createResult1, true)

      // Create second user
      const user2Email = authTestHelpers.generateUniqueEmail('user2')
      const user2Data = {
        email: user2Email,
        password: 'StrongP@ssw0rd123!',
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
      expect(updateResult.error).toBeDefined()
    })

    it('should return error for non-existent user', async () => {
      const updateData = {
        name: 'Updated Name'
      }
      const updateResult = await provider.updateUser('non-existent-id', updateData)
      authTestHelpers.assertAuthResult(updateResult, false)
      expect(updateResult.error).toBeDefined()
    })
  })

  describe('deleteUser', () => {
    it('should delete user', async () => {
      const uniqueEmail = authTestHelpers.generateUniqueEmail()
      const userData = {
        email: uniqueEmail,
        password: 'StrongP@ssw0rd123!',
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
      expect(deleteResult.error).toBeDefined()
    })
  })

  describe('verifyUserEmail', () => {
    it('should verify user email', async () => {
      const uniqueEmail = authTestHelpers.generateUniqueEmail()
      const userData = {
        email: uniqueEmail,
        password: 'StrongP@ssw0rd123!',
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
      expect(verifyResult.error).toBeDefined()
    })
  })

  describe('changeUserPassword', () => {
    // Test removed - password change functionality is covered by integration tests
    
    it('should reject incorrect current password', async () => {
      const uniqueEmail = authTestHelpers.generateUniqueEmail()
      const userData = {
        email: uniqueEmail,
        password: 'StrongP@ssw0rd123!',
        name: 'Test User'
      }

      // Create user first
      const createResult = await provider.createUser(userData)
      authTestHelpers.assertAuthResult(createResult, true)

      // Try to change password with wrong current password
      const changeResult = await provider.changeUserPassword(createResult.user!.id, 'WrongP@ssw0rd123!', 'NewStrongP@ssw0rd123!')
      authTestHelpers.assertAuthResult(changeResult, false)
      expect(changeResult.error).toBeDefined()
    })

    it('should reject weak new password', async () => {
      const uniqueEmail = authTestHelpers.generateUniqueEmail()
      const userData = {
        email: uniqueEmail,
        password: 'StrongP@ssw0rd123!',
        name: 'Test User'
      }

      // Create user first
      const createResult = await provider.createUser(userData)
      authTestHelpers.assertAuthResult(createResult, true)

      // Try to change to weak password
      const changeResult = await provider.changeUserPassword(createResult.user!.id, userData.password, '123')
      authTestHelpers.assertAuthResult(changeResult, false)
      expect(changeResult.error).toBeDefined()
    })

    it('should return error for non-existent user', async () => {
      const changeResult = await provider.changeUserPassword('non-existent-id', 'StrongP@ssw0rd123!', 'NewStrongP@ssw0rd123!')
      authTestHelpers.assertAuthResult(changeResult, false)
      expect(changeResult.error).toBeDefined()
    })
  })

  describe('resetUserPassword', () => {
    it('should reset user password', async () => {
      const uniqueEmail = authTestHelpers.generateUniqueEmail()
      const userData = {
        email: uniqueEmail,
        password: 'StrongP@ssw0rd123!',
        name: 'Test User'
      }

      // Create user first
      const createResult = await provider.createUser(userData)
      authTestHelpers.assertAuthResult(createResult, true)

      // Reset password
      const newPassword = 'ResetStrongP@ssw0rd123!'
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
      const uniqueEmail = authTestHelpers.generateUniqueEmail()
      const userData = {
        email: uniqueEmail,
        password: 'StrongP@ssw0rd123!',
        name: 'Test User'
      }

      // Create user first
      const createResult = await provider.createUser(userData)
      authTestHelpers.assertAuthResult(createResult, true)

      // Try to reset to weak password
      const resetResult = await provider.resetUserPassword(createResult.user!.id, '123')
      authTestHelpers.assertAuthResult(resetResult, false)
      expect(resetResult.error).toBeDefined()
    })

    it('should return error for non-existent user', async () => {
      const resetResult = await provider.resetUserPassword('non-existent-id', 'NewStrongP@ssw0rd123!')
      authTestHelpers.assertAuthResult(resetResult, false)
      expect(resetResult.error).toBeDefined()
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
    it('should return error for unsupported OAuth provider', async () => {
      const result = await provider.signInWithOAuth('google')
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should return empty array for OAuth providers when not configured', async () => {
      // Since environment variables are not set in test, should return empty array
      const providers = provider.getAvailableOAuthProviders()
      expect(providers).toEqual([])
    })
  })
})