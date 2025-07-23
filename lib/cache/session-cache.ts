import { eq, and, gte } from 'drizzle-orm';

import { authLogger } from '@/lib/auth/logger';
import { userSessions, users } from '@/lib/db/schema';
import { db } from '@/lib/db/server';

import { redisCache } from './redis';

export interface CachedSession {
  id: string;
  userId: string;
  sessionToken: string;
  ipAddress?: string;
  userAgent?: string;
  isActive: boolean;
  lastActivity: Date;
  expiresAt: Date;
  createdAt: Date;
  user?: {
    id: string;
    email: string;
    name?: string;
    emailVerified?: Date;
  };
}

export interface SessionCacheConfig {
  sessionTTL: number; // Session cache TTL in seconds
  userProfileTTL: number; // User profile cache TTL in seconds
  enableUserCaching: boolean; // Whether to cache user profiles
  keyPrefix: string; // Cache key prefix
}

export const DEFAULT_SESSION_CACHE_CONFIG: SessionCacheConfig = {
  sessionTTL: 300, // 5 minutes
  userProfileTTL: 900, // 15 minutes
  enableUserCaching: true,
  keyPrefix: 'session:',
};

export class SessionCache {
  private cache = redisCache;
  private config: SessionCacheConfig;

  constructor(config?: Partial<SessionCacheConfig>) {
    this.config = { ...DEFAULT_SESSION_CACHE_CONFIG, ...config };
  }

  // Get session from cache or database
  async getSession(sessionToken: string): Promise<CachedSession | null> {
    const startTime = Date.now();

    try {
      const cacheKey = `${this.config.keyPrefix}token:${sessionToken}`;

      // Try cache first
      const cached = await this.cache.get<CachedSession>(cacheKey);
      if (cached) {
        authLogger.logPerformanceMetric({
          operation: 'session_cache_hit',
          duration: Date.now() - startTime,
          success: true,
          timestamp: new Date(),
        });

        return cached;
      }

      // Cache miss - fetch from database
      const [session] = await db
        .select()
        .from(userSessions)
        .where(
          and(
            eq(userSessions.sessionToken, sessionToken),
            eq(userSessions.isActive, true),
            gte(userSessions.expiresAt, new Date()),
          ),
        )
        .limit(1);

      if (!session) {
        authLogger.logPerformanceMetric({
          operation: 'session_cache_miss',
          duration: Date.now() - startTime,
          success: false,
          metadata: { reason: 'session_not_found' },
          timestamp: new Date(),
        });

        return null;
      }

      // Get user profile if enabled
      let userProfile;
      if (this.config.enableUserCaching) {
        userProfile = await this.getUserProfile(session.userId);
      }

      const cachedSession: CachedSession = {
        id: session.id,
        userId: session.userId,
        sessionToken: session.sessionToken,
        ipAddress: session.ipAddress || undefined,
        userAgent: session.userAgent || undefined,
        isActive: session.isActive,
        lastActivity: session.lastActivity,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
        user: userProfile,
      };

      // Cache the session
      await this.cache.set(cacheKey, cachedSession, this.config.sessionTTL);

      authLogger.logPerformanceMetric({
        operation: 'session_cache_miss',
        duration: Date.now() - startTime,
        success: true,
        metadata: { cached: true },
        timestamp: new Date(),
      });

      return cachedSession;
    } catch (error) {
      authLogger.logPerformanceMetric({
        operation: 'session_cache_error',
        duration: Date.now() - startTime,
        success: false,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date(),
      });

      console.error('Session cache error:', error);
      return null;
    }
  }

  // Get session by user ID
  async getSessionsByUserId(userId: string): Promise<CachedSession[]> {
    const startTime = Date.now();

    try {
      const cacheKey = `${this.config.keyPrefix}user:${userId}`;

      // Try cache first
      const cached = await this.cache.get<CachedSession[]>(cacheKey);
      if (cached) {
        authLogger.logPerformanceMetric({
          operation: 'user_sessions_cache_hit',
          duration: Date.now() - startTime,
          success: true,
          timestamp: new Date(),
        });

        return cached;
      }

      // Cache miss - fetch from database
      const sessions = await db
        .select()
        .from(userSessions)
        .where(
          and(
            eq(userSessions.userId, userId),
            eq(userSessions.isActive, true),
            gte(userSessions.expiresAt, new Date()),
          ),
        )
        .orderBy(userSessions.lastActivity);

      // Get user profile if enabled
      let userProfile: CachedSession['user'] | undefined;
      if (this.config.enableUserCaching && sessions.length > 0) {
        userProfile = await this.getUserProfile(userId);
      }

      const cachedSessions: CachedSession[] = sessions.map(session => ({
        id: session.id,
        userId: session.userId,
        sessionToken: session.sessionToken,
        ipAddress: session.ipAddress || undefined,
        userAgent: session.userAgent || undefined,
        isActive: session.isActive,
        lastActivity: session.lastActivity,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
        user: userProfile,
      }));

      // Cache the sessions
      await this.cache.set(cacheKey, cachedSessions, this.config.sessionTTL);

      authLogger.logPerformanceMetric({
        operation: 'user_sessions_cache_miss',
        duration: Date.now() - startTime,
        success: true,
        metadata: { cached: true, sessionCount: cachedSessions.length },
        timestamp: new Date(),
      });

      return cachedSessions;
    } catch (error) {
      authLogger.logPerformanceMetric({
        operation: 'user_sessions_cache_error',
        duration: Date.now() - startTime,
        success: false,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date(),
      });

      console.error('User sessions cache error:', error);
      return [];
    }
  }

  // Get user profile from cache or database
  async getUserProfile(
    userId: string,
  ): Promise<CachedSession['user'] | undefined> {
    if (!this.config.enableUserCaching) {
      return undefined;
    }

    const startTime = Date.now();

    try {
      const cacheKey = `${this.config.keyPrefix}profile:${userId}`;

      // Try cache first
      const cached = await this.cache.get<CachedSession['user']>(cacheKey);
      if (cached) {
        authLogger.logPerformanceMetric({
          operation: 'user_profile_cache_hit',
          duration: Date.now() - startTime,
          success: true,
          timestamp: new Date(),
        });

        return cached;
      }

      // Cache miss - fetch from database
      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          emailVerified: users.emailVerified,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        authLogger.logPerformanceMetric({
          operation: 'user_profile_cache_miss',
          duration: Date.now() - startTime,
          success: false,
          metadata: { reason: 'user_not_found' },
          timestamp: new Date(),
        });

        return undefined;
      }

      const userProfile: CachedSession['user'] = {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        emailVerified: user.emailVerified || undefined,
      };

      // Cache the user profile
      await this.cache.set(cacheKey, userProfile, this.config.userProfileTTL);

      authLogger.logPerformanceMetric({
        operation: 'user_profile_cache_miss',
        duration: Date.now() - startTime,
        success: true,
        metadata: { cached: true },
        timestamp: new Date(),
      });

      return userProfile;
    } catch (error) {
      authLogger.logPerformanceMetric({
        operation: 'user_profile_cache_error',
        duration: Date.now() - startTime,
        success: false,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date(),
      });

      console.error('User profile cache error:', error);
      return undefined;
    }
  }

  // Invalidate session cache
  async invalidateSession(sessionToken: string): Promise<void> {
    try {
      const cacheKey = `${this.config.keyPrefix}token:${sessionToken}`;
      await this.cache.delete(cacheKey);

      authLogger.log('debug', 'Session cache invalidated', {
        sessionToken: sessionToken.substring(0, 10) + '...',
        cacheKey,
      });
    } catch (error) {
      console.error('Error invalidating session cache:', error);
    }
  }

  // Invalidate user sessions cache
  async invalidateUserSessions(userId: string): Promise<void> {
    try {
      const cacheKey = `${this.config.keyPrefix}user:${userId}`;
      await this.cache.delete(cacheKey);

      authLogger.log('debug', 'User sessions cache invalidated', {
        userId,
        cacheKey,
      });
    } catch (error) {
      console.error('Error invalidating user sessions cache:', error);
    }
  }

  // Invalidate user profile cache
  async invalidateUserProfile(userId: string): Promise<void> {
    try {
      const cacheKey = `${this.config.keyPrefix}profile:${userId}`;
      await this.cache.delete(cacheKey);

      authLogger.log('debug', 'User profile cache invalidated', {
        userId,
        cacheKey,
      });
    } catch (error) {
      console.error('Error invalidating user profile cache:', error);
    }
  }

  // Invalidate all session-related cache for a user
  async invalidateAllUserCache(userId: string): Promise<void> {
    try {
      await Promise.all([
        this.invalidateUserSessions(userId),
        this.invalidateUserProfile(userId),
      ]);

      // Also invalidate individual session tokens for this user
      const pattern = `${this.config.keyPrefix}token:*`;
      await this.cache.deletePattern(pattern);

      authLogger.log('debug', 'All user cache invalidated', { userId });
    } catch (error) {
      console.error('Error invalidating all user cache:', error);
    }
  }

  // Update session in cache
  async updateSessionCache(
    sessionToken: string,
    updates: Partial<CachedSession>,
  ): Promise<void> {
    try {
      const cacheKey = `${this.config.keyPrefix}token:${sessionToken}`;

      // Get current cached session
      const current = await this.cache.get<CachedSession>(cacheKey);
      if (current) {
        // Update the cached session
        const updated = { ...current, ...updates };
        await this.cache.set(cacheKey, updated, this.config.sessionTTL);

        authLogger.log('debug', 'Session cache updated', {
          sessionToken: sessionToken.substring(0, 10) + '...',
          updates: Object.keys(updates),
        });
      }
    } catch (error) {
      console.error('Error updating session cache:', error);
    }
  }

  // Warm up cache for active sessions
  async warmUpCache(limit: number = 100): Promise<void> {
    try {
      const startTime = Date.now();

      // Get recently active sessions
      const recentSessions = await db
        .select()
        .from(userSessions)
        .where(
          and(
            eq(userSessions.isActive, true),
            gte(userSessions.expiresAt, new Date()),
          ),
        )
        .orderBy(userSessions.lastActivity)
        .limit(limit);

      // Cache each session
      const cachePromises = recentSessions.map(async session => {
        const cacheKey = `${this.config.keyPrefix}token:${session.sessionToken}`;

        // Get user profile if enabled
        let userProfile;
        if (this.config.enableUserCaching) {
          userProfile = await this.getUserProfile(session.userId);
        }

        const cachedSession: CachedSession = {
          id: session.id,
          userId: session.userId,
          sessionToken: session.sessionToken,
          ipAddress: session.ipAddress || undefined,
          userAgent: session.userAgent || undefined,
          isActive: session.isActive,
          lastActivity: session.lastActivity,
          expiresAt: session.expiresAt,
          createdAt: session.createdAt,
          user: userProfile,
        };

        await this.cache.set(cacheKey, cachedSession, this.config.sessionTTL);
      });

      await Promise.all(cachePromises);

      authLogger.log('info', 'Session cache warmed up', {
        sessionCount: recentSessions.length,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      console.error('Error warming up session cache:', error);
    }
  }

  // Get cache statistics
  async getCacheStats() {
    try {
      const cacheStats = this.cache.getStats();
      const isHealthy = await this.cache.isHealthy();
      const info = await this.cache.getInfo();

      return {
        healthy: isHealthy,
        stats: cacheStats,
        redis: info,
        config: this.config,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Clear all session cache
  async clearAllCache(): Promise<void> {
    try {
      const pattern = `${this.config.keyPrefix}*`;
      await this.cache.deletePattern(pattern);

      authLogger.log('info', 'All session cache cleared');
    } catch (error) {
      console.error('Error clearing session cache:', error);
    }
  }
}

// Create and export session cache instance
export const sessionCache = new SessionCache();

// Export session cache utilities
export const sessionCacheUtils = {
  getSession: (sessionToken: string) => sessionCache.getSession(sessionToken),
  getSessionsByUserId: (userId: string) =>
    sessionCache.getSessionsByUserId(userId),
  getUserProfile: (userId: string) => sessionCache.getUserProfile(userId),
  invalidateSession: (sessionToken: string) =>
    sessionCache.invalidateSession(sessionToken),
  invalidateUserSessions: (userId: string) =>
    sessionCache.invalidateUserSessions(userId),
  invalidateUserProfile: (userId: string) =>
    sessionCache.invalidateUserProfile(userId),
  invalidateAllUserCache: (userId: string) =>
    sessionCache.invalidateAllUserCache(userId),
  updateSessionCache: (sessionToken: string, updates: Partial<CachedSession>) =>
    sessionCache.updateSessionCache(sessionToken, updates),
  warmUpCache: (limit?: number) => sessionCache.warmUpCache(limit),
  getCacheStats: () => sessionCache.getCacheStats(),
  clearAllCache: () => sessionCache.clearAllCache(),
};
