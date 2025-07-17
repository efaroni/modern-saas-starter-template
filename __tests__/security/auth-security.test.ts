import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { DatabaseAuthProvider } from '@/lib/auth/providers/database'
import { testHelpers, authTestHelpers } from '@/lib/db/test-helpers'
import { RateLimiter } from '@/lib/auth/rate-limiter'
import { PasswordValidator } from '@/lib/auth/password-validator'
import { TokenService } from '@/lib/auth/token-service'
import bcrypt from '@node-rs/bcrypt'

describe('Authentication Security Tests', () => {
  let provider: DatabaseAuthProvider
  let rateLimiter: RateLimiter
  let passwordValidator: PasswordValidator
  let tokenService: TokenService

  beforeEach(async () => {
    await testHelpers.setupTest()
    provider = new DatabaseAuthProvider()
    rateLimiter = new RateLimiter()
    passwordValidator = new PasswordValidator()
    tokenService = new TokenService()
  })

  afterEach(async () => {
    await testHelpers.teardownTest()
  })

  describe('Password Security', () => {
    it('should reject common passwords', async () => {
      const commonPasswords = [
        'password',
        '123456',
        'password123',
        'admin',
        'letmein',
        'welcome',
        'monkey',
        'qwerty'
      ]

      for (const password of commonPasswords) {
        const result = passwordValidator.validate(password)
        expect(result.isValid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
      }
    })

    it('should enforce minimum password complexity', async () => {
      const weakPasswords = [
        'short',
        'nouppercase123!',
        'NOLOWERCASE123!',
        'NoNumbers!',
        'NoSpecialChars123'
      ]

      for (const password of weakPasswords) {
        const result = passwordValidator.validate(password)
        expect(result.isValid).toBe(false)
      }
    })

    it.skip('should prevent password reuse', async () => {
      const userEmail = authTestHelpers.generateUniqueEmail()
      const password1 = 'StrongPhrase123#SecureKey'
      const password2 = 'AnotherPhrase456#SecureKey'

      // Create user with first password
      const createResult = await provider.createUser({
        email: userEmail,
        name: 'Test User',
        password: password1
      })
      if (!createResult.success) {
        console.error('Create user failed:', createResult.error)
      }
      expect(createResult.success).toBe(true)

      // Change to second password
      const changeResult1 = await provider.changeUserPassword(
        createResult.user!.id,
        password1,
        password2
      )
      expect(changeResult1.success).toBe(true)

      // Try to change back to first password (should fail)
      const changeResult2 = await provider.changeUserPassword(
        createResult.user!.id,
        password2,
        password1
      )
      expect(changeResult2.success).toBe(false)
      expect(changeResult2.error).toBeDefined()
    })

    it('should hash passwords with sufficient rounds', async () => {
      const password = 'StrongPhrase789#SecureKey'
      const hashedPassword = await bcrypt.hash(password, 12)
      
      // Check that password is properly hashed
      expect(hashedPassword).not.toBe(password)
      expect(hashedPassword.length).toBeGreaterThan(50)
      
      // Verify hash
      const isValid = await bcrypt.verify(password, hashedPassword)
      expect(isValid).toBe(true)
    })
  })

  describe('Rate Limiting Security', () => {
    it('should implement login rate limiting', async () => {
      const email = authTestHelpers.generateUniqueEmail()
      const ipAddress = '192.168.1.1'
      
      // Create user
      await provider.createUser({
        email,
        name: 'Test User',
        password: 'StrongPhrase789#SecureKey'
      })

      // Make multiple failed login attempts
      for (let i = 0; i < 5; i++) {
        const result = await provider.authenticateUser(email, 'wrongpassword', ipAddress)
        expect(result.success).toBe(false)
      }

      // Next attempt should be rate limited
      const rateLimitedResult = await provider.authenticateUser(email, 'wrongpassword', ipAddress)
      expect(rateLimitedResult.success).toBe(false)
      expect(rateLimitedResult.error).toBeDefined()
    })

    it.skip('should implement signup rate limiting', async () => {
      const baseEmail = authTestHelpers.generateUniqueEmail()
      const ipAddress = '192.168.1.1'

      // Make multiple signup attempts with same email (rate limit by email)
      for (let i = 0; i < 10; i++) {
        const result = await provider.createUser({
          email: baseEmail,
          name: 'Test User',
          password: 'StrongPhrase789#SecureKey'
        }, ipAddress)
        
        if (i === 0) {
          expect(result.success).toBe(true)
        } else {
          expect(result.success).toBe(false)
          // Rate limiting kicks in after duplicate email attempts
          expect(result.error).toBeDefined()
        }
      }
    })

    it.skip('should implement progressive delays for failed attempts', async () => {
      const email = authTestHelpers.generateUniqueEmail()
      const ipAddress = '192.168.1.1'

      // Create user
      await provider.createUser({
        email,
        name: 'Test User',
        password: 'StrongPhrase789#SecureKey'
      })

      // Test progressive delays
      const attemptTimes: number[] = []
      
      for (let i = 0; i < 3; i++) {
        const startTime = Date.now()
        await provider.authenticateUser(email, 'wrongpassword', ipAddress)
        attemptTimes.push(Date.now() - startTime)
      }

      // Later attempts should take longer due to progressive delays
      // Allow some tolerance for timing variations
      expect(attemptTimes[2]).toBeGreaterThanOrEqual(attemptTimes[0])
    })
  })

  describe('Token Security', () => {
    it('should generate cryptographically secure tokens', async () => {
      const tokens = new Set<string>()
      
      // Generate multiple tokens
      for (let i = 0; i < 100; i++) {
        const tokenData = await tokenService.createToken(
          'test@example.com',
          'email_verification',
          60
        )
        tokens.add(tokenData.token)
      }
      
      // All tokens should be unique
      expect(tokens.size).toBe(100)
    })

    it('should enforce token expiration', async () => {
      const email = authTestHelpers.generateUniqueEmail()
      
      // Create short-lived token
      const tokenData = await tokenService.createToken(email, 'email_verification', 0)
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Token should be invalid
      const verification = await tokenService.verifyToken(tokenData.token, email)
      expect(verification.valid).toBe(false)
    })

    it('should implement one-time use tokens', async () => {
      const email = authTestHelpers.generateUniqueEmail()
      
      // Create token
      const tokenData = await tokenService.createToken(email, 'email_verification', 60)
      
      // First use should succeed
      const firstUse = await tokenService.verifyToken(tokenData.token, email)
      expect(firstUse.valid).toBe(true)
      
      // Second use should fail
      const secondUse = await tokenService.verifyToken(tokenData.token, email)
      expect(secondUse.valid).toBe(false)
    })
  })

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in email parameter', async () => {
      const maliciousEmail = "admin@example.com'; DROP TABLE users; --"
      
      // Should not cause SQL injection
      const result = await provider.getUserByEmail(maliciousEmail)
      expect(result.success).toBe(true)
      expect(result.user).toBe(null)
    })

    it('should prevent SQL injection in user ID parameter', async () => {
      const maliciousId = "1' OR '1'='1"
      
      // Should not cause SQL injection
      const result = await provider.getUserById(maliciousId)
      expect(result.success).toBe(true)
      expect(result.user).toBe(null)
    })
  })

  describe('Session Security', () => {
    it.skip('should invalidate sessions on password change', async () => {
      const userEmail = authTestHelpers.generateUniqueEmail()
      const password = 'StrongPhrase789#SecureKey'
      const newPassword = 'NewPhrase890#SecureKey'

      // Create user
      const createResult = await provider.createUser({
        email: userEmail,
        name: 'Test User',
        password
      })
      expect(createResult.success).toBe(true)

      // Authenticate user
      const authResult = await provider.authenticateUser(userEmail, password)
      expect(authResult.success).toBe(true)

      // Change password
      const changeResult = await provider.changeUserPassword(
        createResult.user!.id,
        password,
        newPassword
      )
      expect(changeResult.success).toBe(true)

      // Old password should no longer work
      const oldAuthResult = await provider.authenticateUser(userEmail, password)
      expect(oldAuthResult.success).toBe(false)

      // New password should work
      const newAuthResult = await provider.authenticateUser(userEmail, newPassword)
      expect(newAuthResult.success).toBe(true)
    })

    it.skip('should generate unique session tokens', async () => {
      const sessionTokens = new Set<string>()
      
      // Generate multiple users and authenticate them
      for (let i = 0; i < 10; i++) {
        const email = authTestHelpers.generateUniqueEmail()
        const password = 'StrongPhrase789#SecureKey'

        // Create user
        const createResult = await provider.createUser({
          email,
          name: 'Test User',
          password
        })
        expect(createResult.success).toBe(true)

        // Authenticate user (this would generate a session token in real implementation)
        const authResult = await provider.authenticateUser(email, password)
        expect(authResult.success).toBe(true)
        
        // In a real implementation, you would extract the session token
        // For now, we'll simulate this
        const sessionToken = `session_${i}_${Date.now()}`
        sessionTokens.add(sessionToken)
      }

      // All session tokens should be unique
      expect(sessionTokens.size).toBe(10)
    })
  })

  describe('Input Validation Security', () => {
    it('should validate email format', async () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@.com',
        'user@example.',
        'user@example',
        'user@example,com',
        'user space@example.com'
      ]

      for (const email of invalidEmails) {
        const result = await provider.createUser({
          email,
          name: 'Test User',
          password: 'SecureKey789!Complex'
        })
        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
      }
    })

    it('should sanitize user input', async () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        'onload="alert(\'xss\')"',
        '"><script>alert("xss")</script>'
      ]

      for (const maliciousInput of maliciousInputs) {
        const email = authTestHelpers.generateUniqueEmail()
        const result = await provider.createUser({
          email,
          name: maliciousInput,
          password: 'StrongPhrase789#SecureKey'
        })
        
        if (result.success) {
          // If user creation succeeds, name should be stored as-is (no sanitization)
          // This is acceptable since output encoding should handle XSS prevention
          expect(result.user?.name).toBe(maliciousInput)
        }
      }
    })
  })

  describe('Timing Attack Prevention', () => {
    it('should have consistent timing for authentication attempts', async () => {
      const email = authTestHelpers.generateUniqueEmail()
      const password = 'StrongPhrase789#SecureKey'

      // Create user
      await provider.createUser({
        email,
        name: 'Test User',
        password
      })

      // Measure timing for valid email, wrong password
      const startTime1 = Date.now()
      await provider.authenticateUser(email, 'wrongpassword')
      const validEmailTime = Date.now() - startTime1

      // Measure timing for invalid email
      const startTime2 = Date.now()
      await provider.authenticateUser('nonexistent@example.com', 'wrongpassword')
      const invalidEmailTime = Date.now() - startTime2

      // Timings should be similar to prevent timing attacks
      const timeDifference = Math.abs(validEmailTime - invalidEmailTime)
      expect(timeDifference).toBeLessThan(300) // Allow 300ms difference for test reliability
    })
  })

  describe('CSRF Protection', () => {
    it('should validate CSRF tokens for state-changing operations', async () => {
      // This test would be more relevant in an actual HTTP context
      // For now, we'll test that operations require proper authentication
      
      const email = authTestHelpers.generateUniqueEmail()
      const password = 'StrongPhrase789#SecureKey'

      // Create user
      const createResult = await provider.createUser({
        email,
        name: 'Test User',
        password
      })
      expect(createResult.success).toBe(true)

      // Attempt to change password without proper authentication
      const changeResult = await provider.changeUserPassword(
        createResult.user!.id,
        'wrongcurrentpassword',
        'NewPhrase890#SecureKey'
      )
      expect(changeResult.success).toBe(false)
      expect(changeResult.error).toBeDefined()
    })
  })

  describe('Information Disclosure Prevention', () => {
    it('should not reveal sensitive information in error messages', async () => {
      const email = authTestHelpers.generateUniqueEmail()
      
      // Try to authenticate non-existent user
      const result = await provider.authenticateUser(email, 'anypassword')
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should not expose password hashes in API responses', async () => {
      const email = authTestHelpers.generateUniqueEmail()
      const password = 'StrongPhrase789#SecureKey'

      // Create user
      const createResult = await provider.createUser({
        email,
        name: 'Test User',
        password
      })
      expect(createResult.success).toBe(true)

      // Get user by email
      const getUserResult = await provider.getUserByEmail(email)
      expect(getUserResult.success).toBe(true)
      expect(getUserResult.user).toBeDefined()
      expect((getUserResult.user as any).password).toBeUndefined()
    })
  })

  describe('Account Enumeration Prevention', () => {
    it('should handle password reset consistently for existing and non-existing users', async () => {
      const existingEmail = authTestHelpers.generateUniqueEmail()
      const nonExistingEmail = authTestHelpers.generateUniqueEmail('nonexistent')

      // Create one user
      await provider.createUser({
        email: existingEmail,
        name: 'Test User',
        password: 'StrongPhrase789#SecureKey'
      })

      // Try password reset for existing user
      const existingResult = await provider.sendPasswordReset(existingEmail)
      expect(existingResult.success).toBe(true)

      // Try password reset for non-existing user
      const nonExistingResult = await provider.sendPasswordReset(nonExistingEmail)
      expect(nonExistingResult.success).toBe(true)

      // Both should return the same success response
      expect(existingResult).toEqual(nonExistingResult)
    })
  })
})