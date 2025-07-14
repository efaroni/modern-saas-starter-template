import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { AuthService } from '@/lib/auth/service'
import { MockAuthProvider } from '@/lib/auth/providers/mock'

describe('AuthService', () => {
  let authService: AuthService
  let mockProvider: MockAuthProvider

  beforeEach(() => {
    mockProvider = new MockAuthProvider()
    authService = new AuthService(mockProvider)
  })

  describe('signIn', () => {
    it('should return user when credentials are valid', async () => {
      const result = await authService.signIn({
        email: 'test@example.com',
        password: 'password'
      })

      expect(result.success).toBe(true)
      expect(result.user?.email).toBe('test@example.com')
      expect(result.user?.id).toBeDefined()
    })

    it('should return error when credentials are invalid', async () => {
      const result = await authService.signIn({
        email: 'invalid@example.com',
        password: 'wrongpassword'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid credentials')
    })

    it('should return error when email is missing', async () => {
      const result = await authService.signIn({
        email: '',
        password: 'password'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Email is required')
    })

    it('should return error when password is missing', async () => {
      const result = await authService.signIn({
        email: 'test@example.com',
        password: ''
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Password is required')
    })
  })

  describe('signUp', () => {
    it('should create new user with valid data', async () => {
      const result = await authService.signUp({
        email: 'new@example.com',
        password: 'password123',
        name: 'New User'
      })

      expect(result.success).toBe(true)
      expect(result.user?.email).toBe('new@example.com')
      expect(result.user?.name).toBe('New User')
      expect(result.user?.id).toBeDefined()
    })

    it('should return error when email already exists', async () => {
      const result = await authService.signUp({
        email: 'test@example.com', // This email already exists in mock
        password: 'password123',
        name: 'Test User'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Email already exists')
    })

    it('should return error when password is too short', async () => {
      const result = await authService.signUp({
        email: 'new@example.com',
        password: '123',
        name: 'New User'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Password must be at least 8 characters')
    })

    it('should return error when email is invalid', async () => {
      const result = await authService.signUp({
        email: 'invalid-email',
        password: 'password123',
        name: 'New User'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid email format')
    })
  })

  describe('signOut', () => {
    it('should successfully sign out user', async () => {
      const result = await authService.signOut()

      expect(result.success).toBe(true)
    })
  })

  describe('getUser', () => {
    it('should return user when session exists', async () => {
      // First sign in to create a session
      await authService.signIn({
        email: 'test@example.com',
        password: 'password'
      })

      const result = await authService.getUser()

      expect(result.success).toBe(true)
      expect(result.user?.email).toBe('test@example.com')
    })

    it('should return null when no session exists', async () => {
      const result = await authService.getUser()

      expect(result.success).toBe(true)
      expect(result.user).toBeNull()
    })
  })

  describe('isConfigured', () => {
    it('should return true for mock provider', () => {
      expect(authService.isConfigured()).toBe(true)
    })

    it('should return configuration status', () => {
      const config = authService.getConfiguration()
      
      expect(config.provider).toBe('mock')
      expect(config.oauthProviders).toEqual(['google', 'github'])
    })
  })
})