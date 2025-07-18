import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { DatabaseAuthProvider } from '@/lib/auth/providers/database'
import { SessionManager, DEFAULT_SECURITY_CONFIG } from '@/lib/auth/session-manager'
import { testDb } from '@/lib/db/test'
import { testHelpers, authTestHelpers } from '@/lib/db/test-helpers'

describe('Password Change Session Invalidation', () => {
  let provider: DatabaseAuthProvider
  let sessionManager: SessionManager
  let testUserId: string
  let testUserEmail: string

  beforeEach(async () => {
    await testHelpers.setupTest()
    
    // Create SessionManager and pass it to the provider
    sessionManager = new SessionManager(testDb, DEFAULT_SECURITY_CONFIG)
    provider = new DatabaseAuthProvider(testDb, sessionManager)
    
    // Create a test user
    testUserEmail = authTestHelpers.generateUniqueEmail('pwchange')
    const createResult = await provider.createUser({
      email: testUserEmail,
      password: 'InitialP@ssw0rd123!',
      name: 'Test User'
    })
    
    if (!createResult.success || !createResult.user) {
      throw new Error('Failed to create test user')
    }
    
    testUserId = createResult.user.id
  })

  afterEach(async () => {
    await testHelpers.teardownTest()
  })

  it('should invalidate all user sessions when password is changed', async () => {
    // Create multiple sessions for the user
    const authUser = {
      id: testUserId,
      email: testUserEmail,
      name: 'Test User',
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    // Create sessions from different IPs
    const session1 = await sessionManager.createSession(authUser, '192.168.1.1')
    const session2 = await sessionManager.createSession(authUser, '10.0.0.1')
    
    // Add delay to ensure sessions are persisted
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Verify both sessions are valid
    const validation1Before = await sessionManager.validateSession(session1.sessionToken, '192.168.1.1')
    const validation2Before = await sessionManager.validateSession(session2.sessionToken, '10.0.0.1')
    
    expect(validation1Before.valid).toBe(true)
    expect(validation2Before.valid).toBe(true)
    
    // Change the user's password
    const passwordChangeResult = await provider.changeUserPassword(
      testUserId,
      'InitialP@ssw0rd123!',
      'NewP@ssw0rd456!'
    )
    
    expect(passwordChangeResult.success).toBe(true)
    
    // Add delay to ensure invalidation is processed
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Verify both sessions are now invalid
    const validation1After = await sessionManager.validateSession(session1.sessionToken, '192.168.1.1')
    const validation2After = await sessionManager.validateSession(session2.sessionToken, '10.0.0.1')
    
    expect(validation1After.valid).toBe(false)
    expect(validation2After.valid).toBe(false)
  })

  it('should still complete password change even if session invalidation fails', async () => {
    // Create a mock SessionManager that throws on invalidation
    const mockSessionManager = new SessionManager(testDb, DEFAULT_SECURITY_CONFIG)
    mockSessionManager.invalidateUserSessions = jest.fn().mockRejectedValue(new Error('Session invalidation failed'))
    
    // Create provider with mock SessionManager
    const providerWithMock = new DatabaseAuthProvider(testDb, mockSessionManager)
    
    // Change password
    const result = await providerWithMock.changeUserPassword(
      testUserId,
      'InitialP@ssw0rd123!',
      'NewP@ssw0rd456!'
    )
    
    // Password change should succeed despite session invalidation failure
    expect(result.success).toBe(true)
    
    // Verify the mock was called
    expect(mockSessionManager.invalidateUserSessions).toHaveBeenCalledWith(testUserId, 'password_change')
    
    // Verify the new password works
    const authResult = await providerWithMock.authenticateUser(
      testUserEmail,
      'NewP@ssw0rd456!'
    )
    expect(authResult.success).toBe(true)
  })

  it('should handle password reset with session invalidation', async () => {
    // Create a session for the user
    const authUser = {
      id: testUserId,
      email: testUserEmail,
      name: 'Test User',
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    const session = await sessionManager.createSession(authUser, '192.168.1.1')
    
    // Add delay to ensure session is persisted
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Verify session is valid
    const validationBefore = await sessionManager.validateSession(session.sessionToken, '192.168.1.1')
    expect(validationBefore.valid).toBe(true)
    
    // Reset password (this should also invalidate sessions)
    const resetResult = await provider.resetUserPassword(
      testUserId,
      'ResetP@ssw0rd789!'
    )
    
    expect(resetResult.success).toBe(true)
    
    // Add delay to ensure invalidation is processed
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Verify session is now invalid after password reset
    const validationAfter = await sessionManager.validateSession(session.sessionToken, '192.168.1.1')
    expect(validationAfter.valid).toBe(false) // Sessions are invalidated after reset
  })
})