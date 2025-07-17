import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { DatabaseAuthProvider } from '@/lib/auth/providers/database'
import { testHelpers, authTestHelpers } from '@/lib/db/test-helpers'
import { TokenService } from '@/lib/auth/token-service'

describe('Email Integration', () => {
  let provider: DatabaseAuthProvider
  let tokenService: TokenService

  beforeEach(async () => {
    await testHelpers.setupTest()
    provider = new DatabaseAuthProvider()
    tokenService = new TokenService()
  })

  afterEach(async () => {
    await testHelpers.teardownTest()
  })

  describe('Email Verification Flow', () => {
    it('should send verification email for existing user', async () => {
      // Create a user first
      const userEmail = authTestHelpers.generateUniqueEmail()
      const createResult = await provider.createUser({
        email: userEmail,
        name: 'Test User',
        password: 'StrongP@ssw0rd123!'
      })
      
      expect(createResult.success).toBe(true)
      expect(createResult.user?.emailVerified).toBe(null)

      // Send verification email
      const verificationResult = await provider.sendEmailVerification(userEmail)
      expect(verificationResult.success).toBe(true)
    })

    it('should reject verification email for non-existent user', async () => {
      const nonExistentEmail = authTestHelpers.generateUniqueEmail('nonexistent')
      
      const verificationResult = await provider.sendEmailVerification(nonExistentEmail)
      expect(verificationResult.success).toBe(false)
      expect(verificationResult.error).toBe('User not found')
    })

    it('should reject verification email for already verified user', async () => {
      // Create and verify a user
      const userEmail = authTestHelpers.generateUniqueEmail()
      const createResult = await provider.createUser({
        email: userEmail,
        name: 'Test User',
        password: 'StrongP@ssw0rd123!'
      })
      
      expect(createResult.success).toBe(true)
      
      // Mark email as verified
      await provider.verifyUserEmail(createResult.user!.id)
      
      // Try to send verification email again
      const verificationResult = await provider.sendEmailVerification(userEmail)
      expect(verificationResult.success).toBe(false)
      expect(verificationResult.error).toBe('Email is already verified')
    })

    it('should complete verification flow with valid token', async () => {
      // Create a user
      const userEmail = authTestHelpers.generateUniqueEmail()
      const createResult = await provider.createUser({
        email: userEmail,
        name: 'Test User',
        password: 'StrongP@ssw0rd123!'
      })
      
      expect(createResult.success).toBe(true)

      // Create a verification token manually for testing
      const tokenData = await tokenService.createToken(userEmail, 'email_verification', 60)
      
      // Verify email with token
      const verifyResult = await provider.verifyEmailWithToken(tokenData.token)
      expect(verifyResult.success).toBe(true)
      
      // Check that user is now verified
      const userResult = await provider.getUserByEmail(userEmail)
      expect(userResult.success).toBe(true)
      expect(userResult.user?.emailVerified).toBeTruthy()
    })

    it('should reject invalid verification token', async () => {
      const invalidToken = 'email_verification:invalid-token'
      
      const verifyResult = await provider.verifyEmailWithToken(invalidToken)
      expect(verifyResult.success).toBe(false)
      expect(verifyResult.error).toBe('Invalid or expired token')
    })
  })

  describe('Password Reset Flow', () => {
    it('should send password reset email for existing user', async () => {
      // Create a user first
      const userEmail = authTestHelpers.generateUniqueEmail()
      const createResult = await provider.createUser({
        email: userEmail,
        name: 'Test User',
        password: 'StrongP@ssw0rd123!'
      })
      
      expect(createResult.success).toBe(true)

      // Send password reset email
      const resetResult = await provider.sendPasswordReset(userEmail)
      expect(resetResult.success).toBe(true)
    })

    it('should silently succeed for non-existent user (security)', async () => {
      const nonExistentEmail = authTestHelpers.generateUniqueEmail('nonexistent')
      
      const resetResult = await provider.sendPasswordReset(nonExistentEmail)
      expect(resetResult.success).toBe(true) // Should not reveal user existence
    })

    it('should complete password reset with valid token', async () => {
      // Create a user
      const userEmail = authTestHelpers.generateUniqueEmail()
      const createResult = await provider.createUser({
        email: userEmail,
        name: 'Test User',
        password: 'StrongP@ssw0rd123!'
      })
      
      expect(createResult.success).toBe(true)

      // Create a password reset token manually for testing
      const tokenData = await tokenService.createToken(userEmail, 'password_reset', 60)
      
      // Reset password with token
      const newPassword = 'NewStrongP@ssw0rd123!'
      const resetResult = await provider.resetPasswordWithToken(tokenData.token, newPassword)
      expect(resetResult.success).toBe(true)
      
      // Verify user can authenticate with new password
      const authResult = await provider.authenticateUser(userEmail, newPassword)
      expect(authResult.success).toBe(true)
      
      // Verify user cannot authenticate with old password
      const oldAuthResult = await provider.authenticateUser(userEmail, 'StrongP@ssw0rd123!')
      expect(oldAuthResult.success).toBe(false)
    })

    it('should reject weak password in reset', async () => {
      // Create a user
      const userEmail = authTestHelpers.generateUniqueEmail()
      const createResult = await provider.createUser({
        email: userEmail,
        name: 'Test User',
        password: 'StrongP@ssw0rd123!'
      })
      
      expect(createResult.success).toBe(true)

      // Create a password reset token
      const tokenData = await tokenService.createToken(userEmail, 'password_reset', 60)
      
      // Try to reset with weak password
      const resetResult = await provider.resetPasswordWithToken(tokenData.token, 'weak')
      expect(resetResult.success).toBe(false)
      expect(resetResult.error).toContain('Password must be at least 8 characters')
    })

    it('should reject invalid password reset token', async () => {
      const invalidToken = 'password_reset:invalid-token'
      
      const resetResult = await provider.resetPasswordWithToken(invalidToken, 'NewStrongP@ssw0rd123!')
      expect(resetResult.success).toBe(false)
      expect(resetResult.error).toBe('Invalid or expired token')
    })
  })

  describe('Token Service', () => {
    it('should create and verify tokens correctly', async () => {
      const identifier = authTestHelpers.generateUniqueEmail()
      
      // Create a token
      const tokenData = await tokenService.createToken(identifier, 'email_verification', 60)
      expect(tokenData.token).toBeDefined()
      expect(tokenData.type).toBe('email_verification')
      expect(tokenData.expires).toBeInstanceOf(Date)
      
      // Verify the token
      const verification = await tokenService.verifyToken(tokenData.token, identifier)
      expect(verification.valid).toBe(true)
      expect(verification.type).toBe('email_verification')
      
      // Token should be consumed (one-time use)
      const secondVerification = await tokenService.verifyToken(tokenData.token, identifier)
      expect(secondVerification.valid).toBe(false)
    })

    it('should reject expired tokens', async () => {
      const identifier = authTestHelpers.generateUniqueEmail()
      
      // Create a token that expires immediately
      const tokenData = await tokenService.createToken(identifier, 'email_verification', 0)
      
      // Wait a bit to ensure expiration
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Try to verify expired token
      const verification = await tokenService.verifyToken(tokenData.token, identifier)
      expect(verification.valid).toBe(false)
    })

    it('should cleanup expired tokens', async () => {
      const identifier = authTestHelpers.generateUniqueEmail()
      
      // Create an expired token
      await tokenService.createToken(identifier, 'email_verification', 0)
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Cleanup expired tokens
      await tokenService.cleanupExpiredTokens()
      
      // Verify no tokens remain
      const tokens = await tokenService.getTokensForIdentifier(identifier)
      expect(tokens.length).toBe(0)
    })
  })
})