import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { MockAuthProvider } from '@/lib/auth/providers/mock'
import { AuthService } from '@/lib/auth/service'

describe('OAuth Integration', () => {
  let authProvider: MockAuthProvider
  let authService: AuthService

  beforeEach(() => {
    authProvider = new MockAuthProvider()
    authService = new AuthService(authProvider)
  })

  describe('OAuth Provider Configuration', () => {
    it('should return available OAuth providers', () => {
      const providers = authService.getAvailableOAuthProviders()
      
      expect(providers).toHaveLength(2)
      expect(providers).toEqual([
        {
          id: 'google',
          name: 'Google',
          iconUrl: 'https://developers.google.com/identity/images/g-logo.png'
        },
        {
          id: 'github',
          name: 'GitHub',
          iconUrl: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'
        }
      ])
    })

    it('should include OAuth providers in configuration', () => {
      const config = authService.getConfiguration()
      
      expect(config.oauthProviders).toEqual(['google', 'github'])
    })
  })

  describe('OAuth Authentication Flow', () => {
    it('should successfully sign in with Google OAuth', async () => {
      const result = await authService.signInWithOAuth('google')
      
      expect(result.success).toBe(true)
      expect(result.user).toEqual({
        id: 'google-user-id',
        email: 'user@gmail.com',
        name: 'Google User',
        image: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
        emailVerified: expect.any(Date)
      })
    })

    it('should successfully sign in with GitHub OAuth', async () => {
      const result = await authService.signInWithOAuth('github')
      
      expect(result.success).toBe(true)
      expect(result.user).toEqual({
        id: 'github-user-id',
        email: 'user@github.com',
        name: 'GitHub User',
        image: 'https://avatars.githubusercontent.com/u/123456?v=4',
        emailVerified: expect.any(Date)
      })
    })

    it('should fail with unsupported OAuth provider', async () => {
      const result = await authService.signInWithOAuth('facebook')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('OAuth provider "facebook" not supported')
    })

    it('should create a session after successful OAuth sign in', async () => {
      await authService.signInWithOAuth('google')
      
      const userResult = await authService.getUser()
      expect(userResult.success).toBe(true)
      expect(userResult.user).toEqual({
        id: 'google-user-id',
        email: 'user@gmail.com',
        name: 'Google User',
        image: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
        emailVerified: expect.any(Date)
      })
    })

    it('should handle OAuth provider timeout simulation', async () => {
      // Test the async nature of OAuth flow
      const startTime = Date.now()
      await authService.signInWithOAuth('timeout-test')
      const endTime = Date.now()
      
      // Should take at least 1 second due to mock delay
      expect(endTime - startTime).toBeGreaterThanOrEqual(1000)
    })
  })

  describe('OAuth User Management', () => {
    it('should add OAuth user to mock store', async () => {
      await authService.signInWithOAuth('google')
      
      // User should be retrievable by ID
      const userResult = await authProvider.getUserById('google-user-id')
      expect(userResult.success).toBe(true)
      expect(userResult.user?.email).toBe('user@gmail.com')
    })

    it('should not duplicate OAuth users on subsequent logins', async () => {
      // Sign in twice with the same provider
      await authService.signInWithOAuth('google')
      await authService.signInWithOAuth('google')
      
      // Should still have the same user
      const userResult = await authProvider.getUserById('google-user-id')
      expect(userResult.success).toBe(true)
      expect(userResult.user?.email).toBe('user@gmail.com')
    })

    it('should handle different OAuth providers independently', async () => {
      await authService.signInWithOAuth('google')
      await authService.signInWithOAuth('github')
      
      // Both users should exist
      const googleUser = await authProvider.getUserById('google-user-id')
      const githubUser = await authProvider.getUserById('github-user-id')
      
      expect(googleUser.success).toBe(true)
      expect(githubUser.success).toBe(true)
      expect(googleUser.user?.email).toBe('user@gmail.com')
      expect(githubUser.user?.email).toBe('user@github.com')
    })
  })

  describe('OAuth Session Management', () => {
    it('should maintain session after OAuth sign in', async () => {
      await authService.signInWithOAuth('google')
      
      const sessionResult = await authService.getUser()
      expect(sessionResult.success).toBe(true)
      expect(sessionResult.user?.id).toBe('google-user-id')
    })

    it('should clear session on sign out after OAuth', async () => {
      await authService.signInWithOAuth('google')
      await authService.signOut()
      
      const sessionResult = await authService.getUser()
      expect(sessionResult.success).toBe(true)
      expect(sessionResult.user).toBeNull()
    })

    it('should switch sessions when signing in with different OAuth providers', async () => {
      await authService.signInWithOAuth('google')
      let sessionResult = await authService.getUser()
      expect(sessionResult.user?.id).toBe('google-user-id')
      
      await authService.signInWithOAuth('github')
      sessionResult = await authService.getUser()
      expect(sessionResult.user?.id).toBe('github-user-id')
    })
  })
})