import { auth } from '@/lib/auth/auth'
import { OAuthService } from './oauth-service'
import { authService } from './factory'
import { AuthUser } from './types'

const oauthService = new OAuthService()

/**
 * Integration layer between NextAuth.js and our custom auth system
 */
export class OAuthIntegration {
  /**
   * Get current OAuth session
   */
  async getCurrentSession(): Promise<AuthUser | null> {
    try {
      const session = await auth()
      
      if (!session?.user?.id) {
        return null
      }

      // Get user data from our database
      const user = await oauthService.getUserFromOAuth(session.user.id)
      return user
    } catch (error) {
      console.error('Failed to get OAuth session:', error)
      return null
    }
  }

  /**
   * Sync OAuth user with our auth system
   */
  async syncOAuthUser(oauthUser: any): Promise<AuthUser | null> {
    try {
      // Check if user exists in our system
      const service = await authService
      const existingUser = await service.getUserByEmail(oauthUser.email)
      
      if (existingUser.success && existingUser.user) {
        // User exists, return existing user
        return existingUser.user
      }

      // User doesn't exist, create new user
      const newUser = await service.createUser({
        email: oauthUser.email,
        name: oauthUser.name,
        password: '', // OAuth users don't have passwords
      })

      if (newUser.success && newUser.user) {
        return newUser.user
      }

      return null
    } catch (error) {
      console.error('Failed to sync OAuth user:', error)
      return null
    }
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(
    provider: string,
    oauthUser: any,
    account: any
  ): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    try {
      // Handle account conflicts
      const conflictResult = await oauthService.handleAccountConflict(
        oauthUser.email,
        provider,
        account.providerAccountId
      )

      if (!conflictResult.conflictResolved) {
        return {
          success: false,
          error: 'Account conflict could not be resolved'
        }
      }

      // Get or create user
      let user: AuthUser | null = null
      
      if (conflictResult.existingUserId) {
        // User exists, get user data
        const service = await authService
        const existingUser = await service.getUserById(conflictResult.existingUserId)
        if (existingUser.success && existingUser.user) {
          user = existingUser.user
        }
      } else {
        // Create new user
        user = await this.syncOAuthUser(oauthUser)
      }

      if (!user) {
        return {
          success: false,
          error: 'Failed to create or retrieve user'
        }
      }

      return {
        success: true,
        user
      }
    } catch (error) {
      console.error('OAuth callback error:', error)
      return {
        success: false,
        error: 'OAuth callback failed'
      }
    }
  }

  /**
   * Get linked accounts for a user
   */
  async getLinkedAccounts(userId: string): Promise<any[]> {
    return await oauthService.getLinkedAccounts(userId)
  }

  /**
   * Link OAuth account to existing user
   */
  async linkAccount(
    userId: string,
    provider: string,
    providerAccountId: string,
    accessToken?: string,
    refreshToken?: string
  ): Promise<boolean> {
    return await oauthService.linkAccount(
      userId,
      provider,
      providerAccountId,
      accessToken,
      refreshToken
    )
  }

  /**
   * Unlink OAuth account
   */
  async unlinkAccount(userId: string, provider: string): Promise<boolean> {
    return await oauthService.unlinkAccount(userId, provider)
  }

  /**
   * Check if user has OAuth account linked
   */
  async hasOAuthAccount(userId: string, provider?: string): Promise<boolean> {
    return await oauthService.hasOAuthAccount(userId, provider)
  }

  /**
   * Get available OAuth providers
   */
  getAvailableProviders(): Array<{ id: string; name: string; configured: boolean }> {
    return oauthService.getAvailableProviders()
  }
}

export const oauthIntegration = new OAuthIntegration()