import { eq, and } from 'drizzle-orm';

import { authLogger } from '@/lib/auth/logger';
import { accounts } from '@/lib/db/schema';
import { db } from '@/lib/db/server';

import { redisCache } from './redis';

export interface CachedOAuthToken {
  userId: string;
  provider: string;
  providerAccountId: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
  scope?: string;
  idToken?: string;
  sessionState?: string;
  isExpired: boolean;
  expiresIn?: number; // seconds until expiration
}

export interface OAuthTokenCacheConfig {
  tokenTTL: number; // Token cache TTL in seconds
  refreshTokenTTL: number; // Refresh token cache TTL in seconds
  includeIdToken: boolean; // Whether to cache ID tokens
  includeRefreshToken: boolean; // Whether to cache refresh tokens
  keyPrefix: string; // Cache key prefix
  encryptTokens: boolean; // Whether to encrypt tokens in cache
}

export const DEFAULT_OAUTH_TOKEN_CACHE_CONFIG: OAuthTokenCacheConfig = {
  tokenTTL: 300, // 5 minutes
  refreshTokenTTL: 3600, // 1 hour
  includeIdToken: false, // Don't cache ID tokens by default (security)
  includeRefreshToken: true, // Cache refresh tokens for token refresh
  keyPrefix: 'oauth:',
  encryptTokens: true, // Encrypt tokens in cache
};

export class OAuthTokenCache {
  private cache = redisCache;
  private config: OAuthTokenCacheConfig;

  constructor(config?: Partial<OAuthTokenCacheConfig>) {
    this.config = { ...DEFAULT_OAUTH_TOKEN_CACHE_CONFIG, ...config };
  }

  // Get OAuth token from cache or database
  async getOAuthToken(
    userId: string,
    provider: string,
  ): Promise<CachedOAuthToken | null> {
    const startTime = Date.now();

    try {
      const cacheKey = `${this.config.keyPrefix}${userId}:${provider}`;

      // Try cache first
      const cached = await this.cache.get<CachedOAuthToken>(cacheKey);
      if (cached) {
        authLogger.logPerformanceMetric({
          operation: 'oauth_token_cache_hit',
          duration: Date.now() - startTime,
          success: true,
          metadata: { provider },
          timestamp: new Date(),
        });

        return cached;
      }

      // Cache miss - fetch from database
      const [account] = await db
        .select()
        .from(accounts)
        .where(
          and(eq(accounts.userId, userId), eq(accounts.provider, provider)),
        )
        .limit(1);

      if (!account) {
        authLogger.logPerformanceMetric({
          operation: 'oauth_token_cache_miss',
          duration: Date.now() - startTime,
          success: false,
          metadata: { reason: 'account_not_found', provider },
          timestamp: new Date(),
        });

        return null;
      }

      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      const isExpired = account.expires_at ? account.expires_at < now : false;
      const expiresIn = account.expires_at
        ? account.expires_at - now
        : undefined;

      // Build cached token
      const cachedToken: CachedOAuthToken = {
        userId: account.userId,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        accessToken: this.config.encryptTokens
          ? this.encryptToken(account.access_token)
          : account.access_token,
        tokenType: account.token_type || undefined,
        scope: account.scope || undefined,
        expiresAt: account.expires_at || undefined,
        sessionState: account.session_state || undefined,
        isExpired,
        expiresIn,
      };

      // Include refresh token if enabled
      if (this.config.includeRefreshToken && account.refresh_token) {
        cachedToken.refreshToken = this.config.encryptTokens
          ? this.encryptToken(account.refresh_token)
          : account.refresh_token;
      }

      // Include ID token if enabled
      if (this.config.includeIdToken && account.id_token) {
        cachedToken.idToken = this.config.encryptTokens
          ? this.encryptToken(account.id_token)
          : account.id_token;
      }

      // Determine cache TTL based on token expiration
      let ttl: number;
      if (isExpired) {
        ttl = 60; // Cache expired tokens for 1 minute
      } else if (expiresIn) {
        ttl = Math.min(expiresIn, this.config.tokenTTL);
      } else {
        ttl = this.config.tokenTTL;
      }

      // Cache the token
      await this.cache.set(cacheKey, cachedToken, ttl);

      authLogger.logPerformanceMetric({
        operation: 'oauth_token_cache_miss',
        duration: Date.now() - startTime,
        success: true,
        metadata: { cached: true, provider, ttl },
        timestamp: new Date(),
      });

      return cachedToken;
    } catch (error) {
      authLogger.logPerformanceMetric({
        operation: 'oauth_token_cache_error',
        duration: Date.now() - startTime,
        success: false,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          provider,
        },
        timestamp: new Date(),
      });

      console.error('OAuth token cache error:', error);
      return null;
    }
  }

  // Get all OAuth tokens for a user
  async getUserOAuthTokens(userId: string): Promise<CachedOAuthToken[]> {
    const startTime = Date.now();

    try {
      const cacheKey = `${this.config.keyPrefix}user:${userId}`;

      // Try cache first
      const cached = await this.cache.get<CachedOAuthToken[]>(cacheKey);
      if (cached) {
        authLogger.logPerformanceMetric({
          operation: 'user_oauth_tokens_cache_hit',
          duration: Date.now() - startTime,
          success: true,
          timestamp: new Date(),
        });

        return cached;
      }

      // Cache miss - fetch from database
      const userAccounts = await db
        .select()
        .from(accounts)
        .where(eq(accounts.userId, userId));

      const cachedTokens: CachedOAuthToken[] = [];

      for (const account of userAccounts) {
        // Check if token is expired
        const now = Math.floor(Date.now() / 1000);
        const isExpired = account.expires_at ? account.expires_at < now : false;
        const expiresIn = account.expires_at
          ? account.expires_at - now
          : undefined;

        // Build cached token
        const cachedToken: CachedOAuthToken = {
          userId: account.userId,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          accessToken: this.config.encryptTokens
            ? this.encryptToken(account.access_token)
            : account.access_token,
          tokenType: account.token_type || undefined,
          scope: account.scope || undefined,
          expiresAt: account.expires_at || undefined,
          sessionState: account.session_state || undefined,
          isExpired,
          expiresIn,
        };

        // Include refresh token if enabled
        if (this.config.includeRefreshToken && account.refresh_token) {
          cachedToken.refreshToken = this.config.encryptTokens
            ? this.encryptToken(account.refresh_token)
            : account.refresh_token;
        }

        // Include ID token if enabled
        if (this.config.includeIdToken && account.id_token) {
          cachedToken.idToken = this.config.encryptTokens
            ? this.encryptToken(account.id_token)
            : account.id_token;
        }

        cachedTokens.push(cachedToken);
      }

      // Cache the tokens
      await this.cache.set(cacheKey, cachedTokens, this.config.tokenTTL);

      authLogger.logPerformanceMetric({
        operation: 'user_oauth_tokens_cache_miss',
        duration: Date.now() - startTime,
        success: true,
        metadata: { cached: true, tokenCount: cachedTokens.length },
        timestamp: new Date(),
      });

      return cachedTokens;
    } catch (error) {
      authLogger.logPerformanceMetric({
        operation: 'user_oauth_tokens_cache_error',
        duration: Date.now() - startTime,
        success: false,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date(),
      });

      console.error('User OAuth tokens cache error:', error);
      return [];
    }
  }

  // Update OAuth token in cache
  async updateOAuthToken(
    userId: string,
    provider: string,
    updates: Partial<CachedOAuthToken>,
  ): Promise<void> {
    try {
      const cacheKey = `${this.config.keyPrefix}${userId}:${provider}`;

      // Get current cached token
      const current = await this.cache.get<CachedOAuthToken>(cacheKey);
      if (current) {
        // Update the cached token
        const updated = { ...current, ...updates };

        // Recalculate expiration info
        if (updated.expiresAt) {
          const now = Math.floor(Date.now() / 1000);
          updated.isExpired = updated.expiresAt < now;
          updated.expiresIn = updated.expiresAt - now;
        }

        // Determine new TTL
        let ttl: number;
        if (updated.isExpired) {
          ttl = 60; // Cache expired tokens for 1 minute
        } else if (updated.expiresIn) {
          ttl = Math.min(updated.expiresIn, this.config.tokenTTL);
        } else {
          ttl = this.config.tokenTTL;
        }

        await this.cache.set(cacheKey, updated, ttl);

        // Also invalidate user tokens cache
        await this.invalidateUserOAuthTokens(userId);

        authLogger.log('debug', 'OAuth token cache updated', {
          userId,
          provider,
          updates: Object.keys(updates),
        });
      }
    } catch (error) {
      console.error('Error updating OAuth token cache:', error);
    }
  }

  // Invalidate OAuth token cache
  async invalidateOAuthToken(userId: string, provider: string): Promise<void> {
    try {
      const cacheKey = `${this.config.keyPrefix}${userId}:${provider}`;
      await this.cache.delete(cacheKey);

      // Also invalidate user tokens cache
      await this.invalidateUserOAuthTokens(userId);

      authLogger.log('debug', 'OAuth token cache invalidated', {
        userId,
        provider,
      });
    } catch (error) {
      console.error('Error invalidating OAuth token cache:', error);
    }
  }

  // Invalidate all OAuth tokens for a user
  async invalidateUserOAuthTokens(userId: string): Promise<void> {
    try {
      const userCacheKey = `${this.config.keyPrefix}user:${userId}`;
      await this.cache.delete(userCacheKey);

      // Also invalidate individual token caches
      const pattern = `${this.config.keyPrefix}${userId}:*`;
      await this.cache.deletePattern(pattern);

      authLogger.log('debug', 'User OAuth tokens cache invalidated', {
        userId,
      });
    } catch (error) {
      console.error('Error invalidating user OAuth tokens cache:', error);
    }
  }

  // Refresh OAuth token
  async refreshOAuthToken(
    userId: string,
    provider: string,
    newTokenData: {
      accessToken: string;
      refreshToken?: string;
      expiresAt?: number;
      tokenType?: string;
      scope?: string;
    },
  ): Promise<void> {
    try {
      // Update the database first
      await db
        .update(accounts)
        .set({
          access_token: newTokenData.accessToken,
          refresh_token: newTokenData.refreshToken,
          expires_at: newTokenData.expiresAt,
          token_type: newTokenData.tokenType,
          scope: newTokenData.scope,
        })
        .where(
          and(eq(accounts.userId, userId), eq(accounts.provider, provider)),
        );

      // Update cache
      await this.updateOAuthToken(userId, provider, {
        accessToken: this.config.encryptTokens
          ? this.encryptToken(newTokenData.accessToken)
          : newTokenData.accessToken,
        refreshToken: (() => {
          if (!newTokenData.refreshToken || !this.config.includeRefreshToken) {
            return undefined;
          }
          if (this.config.encryptTokens) {
            return this.encryptToken(newTokenData.refreshToken);
          }
          return newTokenData.refreshToken;
        })(),
        expiresAt: newTokenData.expiresAt,
        tokenType: newTokenData.tokenType,
        scope: newTokenData.scope,
      });

      authLogger.log('info', 'OAuth token refreshed', { userId, provider });
    } catch (error) {
      console.error('Error refreshing OAuth token:', error);
      throw error;
    }
  }

  // Get decrypted token (for use in API calls)
  async getDecryptedToken(
    userId: string,
    provider: string,
  ): Promise<string | null> {
    try {
      const cachedToken = await this.getOAuthToken(userId, provider);
      if (!cachedToken || !cachedToken.accessToken) {
        return null;
      }

      if (cachedToken.isExpired) {
        authLogger.log('warn', 'Attempted to use expired OAuth token', {
          userId,
          provider,
        });
        return null;
      }

      return this.config.encryptTokens
        ? this.decryptToken(cachedToken.accessToken)
        : cachedToken.accessToken;
    } catch (error) {
      console.error('Error getting decrypted token:', error);
      return null;
    }
  }

  // Clear all OAuth token cache
  async clearAllCache(): Promise<void> {
    try {
      const pattern = `${this.config.keyPrefix}*`;
      await this.cache.deletePattern(pattern);

      authLogger.log('info', 'All OAuth token cache cleared');
    } catch (error) {
      console.error('Error clearing OAuth token cache:', error);
    }
  }

  // Private helper methods for encryption/decryption
  private encryptToken(token: string | null): string | undefined {
    if (!token) return undefined;

    // In a real implementation, you would use proper encryption
    // For now, we'll use a simple base64 encoding as a placeholder
    return Buffer.from(token).toString('base64');
  }

  private decryptToken(encryptedToken: string): string {
    // In a real implementation, you would use proper decryption
    // For now, we'll use base64 decoding as a placeholder
    return Buffer.from(encryptedToken, 'base64').toString();
  }

  // Get cache statistics
  async getCacheStats() {
    try {
      const cacheStats = this.cache.getStats();
      const isHealthy = await this.cache.isHealthy();

      return {
        healthy: isHealthy,
        stats: cacheStats,
        config: this.config,
      };
    } catch (error) {
      console.error('Error getting OAuth token cache stats:', error);
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Create and export OAuth token cache instance
export const oauthTokenCache = new OAuthTokenCache();

// Export OAuth token cache utilities
export const oauthTokenCacheUtils = {
  getOAuthToken: (userId: string, provider: string) =>
    oauthTokenCache.getOAuthToken(userId, provider),
  getUserOAuthTokens: (userId: string) =>
    oauthTokenCache.getUserOAuthTokens(userId),
  updateOAuthToken: (
    userId: string,
    provider: string,
    updates: Partial<CachedOAuthToken>,
  ) => oauthTokenCache.updateOAuthToken(userId, provider, updates),
  invalidateOAuthToken: (userId: string, provider: string) =>
    oauthTokenCache.invalidateOAuthToken(userId, provider),
  invalidateUserOAuthTokens: (userId: string) =>
    oauthTokenCache.invalidateUserOAuthTokens(userId),
  refreshOAuthToken: (userId: string, provider: string, newTokenData: { access_token: string; refresh_token?: string; expires_in?: number }) =>
    oauthTokenCache.refreshOAuthToken(userId, provider, newTokenData),
  getDecryptedToken: (userId: string, provider: string) =>
    oauthTokenCache.getDecryptedToken(userId, provider),
  getCacheStats: () => oauthTokenCache.getCacheStats(),
  clearAllCache: () => oauthTokenCache.clearAllCache(),
};
