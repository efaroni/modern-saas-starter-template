import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { SessionManager, DEFAULT_SECURITY_CONFIG } from '@/lib/auth/session-manager'
import { testHelpers, authTestHelpers } from '@/lib/db/test-helpers'
import { AuthUser } from '@/lib/auth/types'
import { testDb } from '@/lib/db/test'

describe('SessionManager', () => {
  let sessionManager: SessionManager
  let testUser: AuthUser

  beforeEach(async () => {
    await testHelpers.setupTest()
    
    // Create a real user in the database for session tests with retry logic
    const { DatabaseAuthProvider } = require('@/lib/auth/providers/database')
    const { testDb } = require('@/lib/db/test')
    const provider = new DatabaseAuthProvider(testDb)
    
    // Retry logic for test stability
    let result
    let retries = 3
    while (retries > 0) {
      const uniqueEmail = authTestHelpers.generateUniqueEmail('session')
      result = await provider.createUser({
        email: uniqueEmail,
        name: 'Test User',
        password: 'StrongP@ssw0rd123!'
      })
      
      if (result.success && result.user) {
        break
      }
      
      retries--
      if (retries > 0) {
        // Wait a bit before retry
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    if (!result?.success || !result?.user) {
      throw new Error('Failed to create test user for session tests after 3 attempts')
    }
    
    testUser = result.user
    
    sessionManager = new SessionManager(testDb, {
      ...DEFAULT_SECURITY_CONFIG,
      maxAge: 3600, // 1 hour for testing
      inactivityTimeout: 1800, // 30 minutes for testing
      maxConcurrentSessions: 2
    })
  })

  afterEach(async () => {
    // Clean up any sessions that might have been created during testing
    try {
      await sessionManager.invalidateUserSessions(testUser.id)
    } catch {
      // Ignore errors during cleanup
    }
    await testHelpers.teardownTest()
  })

  describe('createSession', () => {
    it('should create a new session with secure configuration', async () => {
      let result
      let attempts = 0
      const maxAttempts = 3
      
      do {
        attempts++
        try {
          result = await sessionManager.createSession(
            testUser,
            '127.0.0.1',
            'Test User Agent'
          )
          break
        } catch (error) {
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100))
          } else {
            throw error
          }
        }
      } while (attempts < maxAttempts)

      expect(result.sessionToken).toBeTruthy()
      expect(result.sessionToken).toHaveLength(64) // 32 bytes hex = 64 chars
      expect(result.expires).toBeInstanceOf(Date)
      expect(result.cookieOptions.httpOnly).toBe(true)
      expect(result.cookieOptions.secure).toBe(false) // false in test env
      expect(result.cookieOptions.sameSite).toBe('lax') // 'lax' in test/dev env, 'strict' in production
    })

    it('should create unique session tokens', async () => {
      let result1, result2
      
      // Create first session with retry
      let attempts = 0
      const maxAttempts = 3
      do {
        attempts++
        try {
          result1 = await sessionManager.createSession(testUser, '127.0.0.1')
          break
        } catch (error) {
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100))
          } else {
            throw error
          }
        }
      } while (attempts < maxAttempts)
      
      // Create second session with retry
      attempts = 0
      do {
        attempts++
        try {
          result2 = await sessionManager.createSession(testUser, '127.0.0.1')
          break
        } catch (error) {
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100))
          } else {
            throw error
          }
        }
      } while (attempts < maxAttempts)

      expect(result1.sessionToken).not.toBe(result2.sessionToken)
    })

    it('should set correct expiration time', async () => {
      const beforeCreation = Date.now()
      let result
      let attempts = 0
      const maxAttempts = 3
      
      do {
        attempts++
        try {
          result = await sessionManager.createSession(testUser, '127.0.0.1')
          break
        } catch (error) {
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100))
          } else {
            throw error
          }
        }
      } while (attempts < maxAttempts)
      const afterCreation = Date.now()

      const expectedExpiry = beforeCreation + 3600 * 1000 // 1 hour
      expect(result.expires.getTime()).toBeGreaterThanOrEqual(expectedExpiry)
      expect(result.expires.getTime()).toBeLessThanOrEqual(afterCreation + 3600 * 1000)
    })
  })

  describe('validateSession', () => {
    it('should validate a valid session', async () => {
      // Retry session creation for parallel test stability
      let sessionResult
      let attempts = 0
      const maxAttempts = 3
      
      do {
        attempts++
        try {
          sessionResult = await sessionManager.createSession(testUser, '127.0.0.1')
          break
        } catch (error) {
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100))
          } else {
            throw error
          }
        }
      } while (attempts < maxAttempts)
      
      const { sessionToken } = sessionResult
      const result = await sessionManager.validateSession(sessionToken, '127.0.0.1')
      
      expect(result.valid).toBe(true)
      expect(result.user).toBeDefined()
      expect(result.user?.id).toBe(testUser.id)
      expect(result.action).toBe('refresh')
    })

    it('should reject invalid session token', async () => {
      const result = await sessionManager.validateSession('invalid-token', '127.0.0.1')
      
      expect(result.valid).toBe(false)
      expect(result.user).toBeUndefined()
    })

    it('should reject empty session token', async () => {
      const result = await sessionManager.validateSession('', '127.0.0.1')
      
      expect(result.valid).toBe(false)
      expect(result.user).toBeUndefined()
    })
  })

  describe('destroySession', () => {
    it('should successfully destroy a session', async () => {
      const { sessionToken } = await sessionManager.createSession(testUser, '127.0.0.1')
      
      // Verify session exists
      let result = await sessionManager.validateSession(sessionToken, '127.0.0.1')
      expect(result.valid).toBe(true)
      
      // Destroy session
      await sessionManager.destroySession(sessionToken)
      
      // Verify session is destroyed
      result = await sessionManager.validateSession(sessionToken, '127.0.0.1')
      expect(result.valid).toBe(false)
    })

    it('should handle destroying non-existent session gracefully', async () => {
      await expect(sessionManager.destroySession('non-existent-token')).resolves.not.toThrow()
    })
  })

  describe('getUserSessions', () => {
    it('should return empty array for user with no sessions', async () => {
      const sessions = await sessionManager.getUserSessions(testUser.id)
      expect(sessions).toEqual([])
    })

    it('should return active sessions for user', async () => {
      await sessionManager.createSession(testUser, '127.0.0.1')
      await sessionManager.createSession(testUser, '192.168.1.1')
      
      const sessions = await sessionManager.getUserSessions(testUser.id)
      expect(sessions).toHaveLength(2)
    })
  })

  describe('invalidateUserSessions', () => {
    it('should invalidate all sessions for a user', async () => {
      const { sessionToken: token1 } = await sessionManager.createSession(testUser, '127.0.0.1')
      const { sessionToken: token2 } = await sessionManager.createSession(testUser, '192.168.1.1')
      
      // Verify both sessions are valid
      expect((await sessionManager.validateSession(token1, '127.0.0.1')).valid).toBe(true)
      expect((await sessionManager.validateSession(token2, '192.168.1.1')).valid).toBe(true)
      
      // Invalidate all sessions
      await sessionManager.invalidateUserSessions(testUser.id, 'security_test')
      
      // Verify both sessions are invalid
      expect((await sessionManager.validateSession(token1, '127.0.0.1')).valid).toBe(false)
      expect((await sessionManager.validateSession(token2, '192.168.1.1')).valid).toBe(false)
    })
  })

  describe('cookie configuration', () => {
    it('should return correct cookie configuration', () => {
      const config = sessionManager.getCookieConfig()
      
      expect(config.name).toBe('auth_session')
      expect(config.options.httpOnly).toBe(true)
      expect(config.options.secure).toBe(false) // false in test env
      expect(config.options.sameSite).toBe('lax') // 'lax' in test/dev env, 'strict' in production
      expect(config.options.path).toBe('/')
    })

    it('should create correct cookie string', () => {
      const token = 'test-session-token'
      const expires = new Date('2024-01-01T12:00:00Z')
      
      const cookieString = sessionManager.createCookieString(token, expires)
      
      expect(cookieString).toContain('auth_session=test-session-token')
      expect(cookieString).toContain('Expires=Mon, 01 Jan 2024 12:00:00 GMT')
      expect(cookieString).toContain('Path=/')
      expect(cookieString).toContain('HttpOnly')
      expect(cookieString).toContain('SameSite=lax') // 'lax' in test/dev env, 'strict' in production
    })

    it('should create correct clear cookie string', () => {
      const clearCookieString = sessionManager.createClearCookieString()
      
      expect(clearCookieString).toContain('auth_session=')
      expect(clearCookieString).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT')
      expect(clearCookieString).toContain('Path=/')
    })
  })

  describe('session security', () => {
    it('should handle concurrent session limits', async () => {
      // Create maximum allowed sessions
      const session1 = await sessionManager.createSession(testUser, '127.0.0.1')
      const session2 = await sessionManager.createSession(testUser, '192.168.1.1')
      
      // Verify both sessions are active
      expect((await sessionManager.validateSession(session1.sessionToken, '127.0.0.1')).valid).toBe(true)
      expect((await sessionManager.validateSession(session2.sessionToken, '192.168.1.1')).valid).toBe(true)
      
      // Create one more session (should deactivate oldest)
      const session3 = await sessionManager.createSession(testUser, '10.0.0.1')
      
      // Verify newest session is active
      expect((await sessionManager.validateSession(session3.sessionToken, '10.0.0.1')).valid).toBe(true)
    })

    it('should handle session cleanup', async () => {
      // This test would verify that expired sessions are cleaned up
      // For now, we'll just verify the method doesn't throw
      await expect(sessionManager.cleanupExpiredSessions()).resolves.not.toThrow()
    })
  })
})