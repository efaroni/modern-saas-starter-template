import { auth } from '@/lib/auth/auth';

import { authService } from './factory';
import { OAuthService } from './oauth-service';
import { type AuthUser } from './types';

interface OAuthUser {
  id: string;
  email: string;
  name: string;
  image?: string;
}

interface OAuthAccount {
  provider: string;
  providerAccountId: string;
  type: string;
  access_token?: string;
  refresh_token?: string;
}

const oauthService = new OAuthService();

/**
 * Integration layer between NextAuth.js and our custom auth system
 */
export class OAuthIntegration {
  /**
   * Get current OAuth session
   */
  async getCurrentSession(): Promise<AuthUser | null> {
    try {
      const session = await auth();

      if (!session?.user?.id) {
        return null;
      }

      // Get user data from our database
      const user = await oauthService.getUserFromOAuth(session.user.id);
      return user;
    } catch (error) {
      console.error('Failed to get OAuth session:', error);
      return null;
    }
  }

  /**
   * Sync OAuth user with our auth system
   */
  async syncOAuthUser(oauthUser: OAuthUser): Promise<AuthUser | null> {
    try {
      // Check if user exists in our system
      const service = await authService;
      const existingUser = await service.getUserByEmail(oauthUser.email);

      if (existingUser.success && existingUser.user) {
        // User exists, return existing user
        return existingUser.user;
      }

      // User doesn't exist, create new user
      const newUser = await service.createUser({
        email: oauthUser.email,
        name: oauthUser.name,
        password: '', // OAuth users don't have passwords
      });

      if (newUser.success && newUser.user) {
        return newUser.user;
      }

      return null;
    } catch (error) {
      console.error('Failed to sync OAuth user:', error);
      return null;
    }
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(
    provider: string,
    oauthUser: OAuthUser,
    account: OAuthAccount,
  ): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    try {
      // Handle account conflicts
      const conflictResult = await oauthService.handleAccountConflict(
        oauthUser.email,
        provider,
        account.providerAccountId,
      );

      if (!conflictResult.conflictResolved) {
        return {
          success: false,
          error: 'Account conflict could not be resolved',
        };
      }

      // Get or create user
      let user: AuthUser | null = null;

      if (conflictResult.existingUserId) {
        // User exists, get user data
        const service = await authService;
        const existingUser = await service.getUserById(
          conflictResult.existingUserId,
        );
        if (existingUser.success && existingUser.user) {
          user = existingUser.user;
        }
      } else {
        // Create new user
        user = await this.syncOAuthUser(oauthUser);
      }

      if (!user) {
        return {
          success: false,
          error: 'Failed to create or retrieve user',
        };
      }

      return {
        success: true,
        user,
      };
    } catch (error) {
      console.error('OAuth callback error:', error);
      return {
        success: false,
        error: 'OAuth callback failed',
      };
    }
  }

  /**
   * Get linked accounts for a user
   */
  async getLinkedAccounts(userId: string): Promise<OAuthAccount[]> {
    const accounts = await oauthService.getLinkedAccounts(userId);

    // Transform null values to undefined to match TypeScript interface
    return accounts.map(account => ({
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      type: account.type,
      access_token: account.access_token ?? undefined,
      refresh_token: account.refresh_token ?? undefined,
    }));
  }

  /**
   * Link OAuth account to existing user
   */
  linkAccount(
    userId: string,
    provider: string,
    providerAccountId: string,
    accessToken?: string,
    refreshToken?: string,
  ): Promise<boolean> {
    return oauthService.linkAccount(
      userId,
      provider,
      providerAccountId,
      accessToken,
      refreshToken,
    );
  }

  /**
   * Unlink OAuth account
   */
  unlinkAccount(userId: string, provider: string): Promise<boolean> {
    return oauthService.unlinkAccount(userId, provider);
  }

  /**
   * Check if user has OAuth account linked
   */
  hasOAuthAccount(userId: string, provider?: string): Promise<boolean> {
    return oauthService.hasOAuthAccount(userId, provider);
  }

  /**
   * Get available OAuth providers
   */
  getAvailableProviders(): Array<{
    id: string;
    name: string;
    configured: boolean;
  }> {
    return oauthService.getAvailableProviders();
  }
}

export const oauthIntegration = new OAuthIntegration();
