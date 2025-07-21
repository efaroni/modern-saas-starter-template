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
    
    let result
    let attempts = 0
    const maxAttempts = 3
    
    do {
      attempts++
      const uniqueEmail = authTestHelpers.generateUniqueEmail('session')
      result = await provider.createUser({
        email: uniqueEmail,
        name: 'Test User',
        password: 'StrongP@ssw0rd123!'
      })
      
      if (result?.success && result?.user) {
        break
      }
      
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } while (attempts < maxAttempts)
    
    if (!result?.success || !result?.user) {
      throw new Error(`Failed to create test user for session tests after ${maxAttempts} attempts`)
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
    // Clean up test data
    await testHelpers.teardownTest()
  })

  describe('createSession', () => {
    it('should create a new session with secure configuration', async () => {
      const result = await sessionManager.createSession(
        testUser,
        '127.0.0.1',
        'Test User Agent'
      )

      expect(result.sessionToken).toBeTruthy()
      expect(result.sessionToken).toHaveLength(64) // 32 bytes hex = 64 chars
      expect(result.expires).toBeInstanceOf(Date)
      expect(result.cookieOptions.httpOnly).toBe(true)
      expect(result.cookieOptions.secure).toBe(false) // false in test env
      expect(result.cookieOptions.sameSite).toBe('lax') // 'lax' in test/dev env, 'strict' in production
    })


    it('should set correct expiration time', async () => {
      const beforeCreation = Date.now()
      const result = await sessionManager.createSession(testUser, '127.0.0.1')
      const afterCreation = Date.now()

      const expectedExpiry = beforeCreation + 3600 * 1000 // 1 hour
      expect(result.expires.getTime()).toBeGreaterThanOrEqual(expectedExpiry)
      expect(result.expires.getTime()).toBeLessThanOrEqual(afterCreation + 3600 * 1000)
    })
  })

  describe('validateSession', () => {
    it('should validate a valid session', async () => {
      const sessionResult = await sessionManager.createSession(testUser, '127.0.0.1')
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

  // Note: invalidateUserSessions is tested through integration tests in
  // tests/integration/auth/password-change-sessions.test.ts
  // which covers the real-world use case of session invalidation after password changes


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

  })
})