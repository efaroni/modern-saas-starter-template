import { describe, it, expect, beforeEach } from '@jest/globals'
import { MockAuthProvider } from '@/lib/auth/providers/mock'

describe('MockAuthProvider', () => {
  let provider: MockAuthProvider

  beforeEach(() => {
    provider = new MockAuthProvider()
  })

  describe('authenticateUser', () => {
    it('should authenticate test user with correct credentials', async () => {
      const result = await provider.authenticateUser('test@example.com', 'password')

      expect(result.success).toBe(true)
      expect(result.user?.email).toBe('test@example.com')
      expect(result.user?.name).toBe('Test User')
      expect(result.user?.id).toBeDefined()
    })

    it('should reject invalid credentials', async () => {
      const result = await provider.authenticateUser('test@example.com', 'wrongpassword')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid credentials')
    })

    it('should reject unknown users', async () => {
      const result = await provider.authenticateUser('unknown@example.com', 'password')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid credentials')
    })
  })

  describe('createUser', () => {
    it('should create new user with valid data', async () => {
      const result = await provider.createUser({
        email: 'new@example.com',
        password: 'password123',
        name: 'New User'
      })

      expect(result.success).toBe(true)
      expect(result.user?.email).toBe('new@example.com')
      expect(result.user?.name).toBe('New User')
      expect(result.user?.id).toBeDefined()
    })

    it('should reject duplicate email', async () => {
      const result = await provider.createUser({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Email already exists')
    })

    it('should validate password length', async () => {
      const result = await provider.createUser({
        email: 'new@example.com',
        password: '123',
        name: 'New User'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Password must be at least 8 characters')
    })

    it('should validate email format', async () => {
      const result = await provider.createUser({
        email: 'invalid-email',
        password: 'password123',
        name: 'New User'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid email format')
    })
  })

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const result = await provider.getUserById('test-user-id')

      expect(result.success).toBe(true)
      expect(result.user?.email).toBe('test@example.com')
    })

    it('should return null when user not found', async () => {
      const result = await provider.getUserById('nonexistent-id')

      expect(result.success).toBe(true)
      expect(result.user).toBeNull()
    })
  })

  describe('isConfigured', () => {
    it('should always return true for mock provider', () => {
      expect(provider.isConfigured()).toBe(true)
    })
  })

  describe('getConfiguration', () => {
    it('should return mock configuration', () => {
      const config = provider.getConfiguration()
      
      expect(config.provider).toBe('mock')
      expect(config.oauthProviders).toEqual(['google', 'github'])
    })
  })
})