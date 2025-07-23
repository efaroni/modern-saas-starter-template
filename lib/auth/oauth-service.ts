import { eq, and } from 'drizzle-orm';

import { signIn as nextAuthSignIn } from '@/lib/auth/auth';
import { users, accounts } from '@/lib/db/schema';
import { db } from '@/lib/db/server';

import { type AuthUser, type OAuthResult } from './types';

export class OAuthService {
  /**
   * Initiate OAuth sign-in flow
   */
  async signIn(provider: string, redirectTo?: string): Promise<OAuthResult> {
    try {
      const result = await nextAuthSignIn(provider, {
        redirectTo: redirectTo || '/auth',
      });

      return {
        success: true,
        redirectUrl: result as string,
      };
    } catch (error) {
      console.error('OAuth sign-in error:', error);
      return {
        success: false,
        error: 'OAuth sign-in failed',
      };
    }
  }

  /**
   * Get user from OAuth callback
   */
  async getUserFromOAuth(userId: string): Promise<AuthUser | null> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: user.emailVerified,
      };
    } catch (error) {
      console.error('Failed to get OAuth user:', error);
      return null;
    }
  }

  /**
   * Link OAuth account to existing user
   */
  async linkAccount(
    userId: string,
    provider: string,
    providerAccountId: string,
    accessToken?: string,
    refreshToken?: string,
  ): Promise<boolean> {
    try {
      // Check if account is already linked
      const [existingAccount] = await db
        .select()
        .from(accounts)
        .where(eq(accounts.providerAccountId, providerAccountId))
        .limit(1);

      if (existingAccount) {
        return false; // Account already linked
      }

      // Link the account
      await db.insert(accounts).values({
        userId,
        type: 'oauth',
        provider,
        providerAccountId,
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      return true;
    } catch (error) {
      console.error('Failed to link OAuth account:', error);
      return false;
    }
  }

  /**
   * Unlink OAuth account
   */
  async unlinkAccount(userId: string, provider: string): Promise<boolean> {
    try {
      await db
        .delete(accounts)
        .where(
          and(eq(accounts.userId, userId), eq(accounts.provider, provider)),
        );

      return true;
    } catch (error) {
      console.error('Failed to unlink OAuth account:', error);
      return false;
    }
  }

  /**
   * Get linked accounts for a user
   */
  async getLinkedAccounts(
    userId: string,
  ): Promise<(typeof accounts.$inferSelect)[]> {
    try {
      return await db
        .select()
        .from(accounts)
        .where(eq(accounts.userId, userId));
    } catch (error) {
      console.error('Failed to get linked accounts:', error);
      return [];
    }
  }

  /**
   * Check if user has OAuth account linked
   */
  async hasOAuthAccount(userId: string, provider?: string): Promise<boolean> {
    try {
      const whereConditions = provider
        ? and(eq(accounts.userId, userId), eq(accounts.provider, provider))
        : eq(accounts.userId, userId);

      const results = await db
        .select()
        .from(accounts)
        .where(whereConditions)
        .limit(1);
      return results.length > 0;
    } catch (error) {
      console.error('Failed to check OAuth account:', error);
      return false;
    }
  }

  /**
   * Handle OAuth account conflicts (same email, different providers)
   */
  async handleAccountConflict(
    email: string,
    provider: string,
    providerAccountId: string,
  ): Promise<{
    conflictResolved: boolean;
    existingUserId?: string;
    action: 'link' | 'create' | 'error';
  }> {
    try {
      // Check if user with this email already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!existingUser) {
        return {
          conflictResolved: true,
          action: 'create',
        };
      }

      // Check if this OAuth account is already linked
      const [existingAccount] = await db
        .select()
        .from(accounts)
        .where(
          and(
            eq(accounts.userId, existingUser.id),
            eq(accounts.provider, provider),
          ),
        )
        .limit(1);

      if (existingAccount) {
        return {
          conflictResolved: true,
          existingUserId: existingUser.id,
          action: 'link',
        };
      }

      // Auto-link accounts with same email (if allowDangerousEmailAccountLinking is enabled)
      const linked = await this.linkAccount(
        existingUser.id,
        provider,
        providerAccountId,
      );

      if (linked) {
        return {
          conflictResolved: true,
          existingUserId: existingUser.id,
          action: 'link',
        };
      }

      return {
        conflictResolved: false,
        action: 'error',
      };
    } catch (error) {
      console.error('Failed to handle OAuth account conflict:', error);
      return {
        conflictResolved: false,
        action: 'error',
      };
    }
  }

  /**
   * Get available OAuth providers
   */
  getAvailableProviders(): Array<{
    id: string;
    name: string;
    configured: boolean;
  }> {
    return [
      {
        id: 'google',
        name: 'Google',
        configured: !!(
          process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
        ),
      },
      {
        id: 'github',
        name: 'GitHub',
        configured: !!(process.env.GITHUB_ID && process.env.GITHUB_SECRET),
      },
    ];
  }
}
