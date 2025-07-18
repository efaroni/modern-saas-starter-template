import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { RateLimiter } from '@/lib/auth/rate-limiter'
import { testHelpers } from '@/lib/db/test-helpers'
import { testDb } from '@/lib/db/test'

describe('RateLimiter', () => {
  const rateLimiter = new RateLimiter(testDb)

  beforeEach(async () => {
    await testHelpers.setupTest()
  })

  afterEach(async () => {
    await testHelpers.teardownTest()
  })

  describe('checkRateLimit', () => {
    it('should allow requests within rate limit', async () => {
      const result = await rateLimiter.checkRateLimit('test@example.com', 'login')
      
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(5)
      expect(result.locked).toBe(false)
      expect(result.resetTime).toBeInstanceOf(Date)
    })

    it('should handle unknown action types gracefully', async () => {
      const result = await rateLimiter.checkRateLimit('test@example.com', 'unknown')
      
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(999)
      expect(result.locked).toBe(false)
    })

    it('should differentiate between different action types', async () => {
      const identifier = 'test@example.com'
      
      // Exhaust login attempts
      for (let i = 0; i < 5; i++) {
        await rateLimiter.recordAttempt(identifier, 'login', false)
      }
      
      // Add a longer delay to ensure database operations complete
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const loginResult = await rateLimiter.checkRateLimit(identifier, 'login')
      const signupResult = await rateLimiter.checkRateLimit(identifier, 'signup')
      
      expect(loginResult.allowed).toBe(false)
      expect(signupResult.allowed).toBe(true)
    })
  })

  describe('recordAttempt', () => {
    it('should record successful attempts', async () => {
      await rateLimiter.recordAttempt('test@example.com', 'login', true, '127.0.0.1', 'TestAgent')
      
      // This should not throw an error
      expect(true).toBe(true)
    })

    it('should record failed attempts', async () => {
      await rateLimiter.recordAttempt('test@example.com', 'login', false, '127.0.0.1', 'TestAgent')
      
      // This should not throw an error
      expect(true).toBe(true)
    })

    it('should handle missing optional parameters', async () => {
      await rateLimiter.recordAttempt('test@example.com', 'login', true)
      
      // This should not throw an error
      expect(true).toBe(true)
    })
  })

  describe('checkIPRateLimit', () => {
    it('should allow requests from new IPs', async () => {
      const result = await rateLimiter.checkIPRateLimit('192.168.1.1', 'login')
      
      expect(result.allowed).toBe(true)
      expect(result.locked).toBe(false)
    })

    it('should handle missing IP address', async () => {
      const result = await rateLimiter.checkIPRateLimit('', 'login')
      
      expect(result.allowed).toBe(true)
      expect(result.locked).toBe(false)
    })
  })

  describe('clearAttempts', () => {
    it('should clear attempts without throwing error', async () => {
      await rateLimiter.recordAttempt('test@example.com', 'login', false)
      await rateLimiter.clearAttempts('test@example.com', 'login')
      
      // This should not throw an error
      expect(true).toBe(true)
    })
  })
})