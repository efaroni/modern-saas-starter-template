import { eq } from 'drizzle-orm';

import { authLogger } from '@/lib/auth/logger';
import { users, userApiKeys } from '@/lib/db/schema';
import { db } from '@/lib/db/server';

import { redisCache } from './redis';

export interface CachedUserProfile {
  id: string
  email: string
  name?: string
  image?: string
  emailVerified?: Date
  createdAt: Date
  updatedAt: Date
  apiKeys?: {
    provider: string
    hasKey: boolean
    publicKey?: string
  }[]
  preferences?: {
    theme?: 'light' | 'dark' | 'system'
    notifications?: boolean
    language?: string
  }
  stats?: {
    lastLogin?: Date
    loginCount?: number
    sessionCount?: number
  }
}

export interface UserProfileCacheConfig {
  profileTTL: number        // Profile cache TTL in seconds
  includeApiKeys: boolean   // Whether to include API keys info
  includePreferences: boolean // Whether to include user preferences
  includeStats: boolean     // Whether to include user statistics
  keyPrefix: string         // Cache key prefix
}

export const DEFAULT_USER_PROFILE_CACHE_CONFIG: UserProfileCacheConfig = {
  profileTTL: 900,          // 15 minutes
  includeApiKeys: false,    // Don't include API keys by default (security)
  includePreferences: true,
  includeStats: true,
  keyPrefix: 'profile:',
};

export class UserProfileCache {
  private cache = redisCache;
  private config: UserProfileCacheConfig;

  constructor(config?: Partial<UserProfileCacheConfig>) {
    this.config = { ...DEFAULT_USER_PROFILE_CACHE_CONFIG, ...config };
  }

  // Get user profile from cache or database
  async getUserProfile(userId: string): Promise<CachedUserProfile | null> {
    const startTime = Date.now();

    try {
      const cacheKey = `${this.config.keyPrefix}${userId}`;

      // Try cache first
      const cached = await this.cache.get<CachedUserProfile>(cacheKey);
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
        .select()
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

        return null;
      }

      // Build cached profile
      const cachedProfile: CachedUserProfile = {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        image: user.image || undefined,
        emailVerified: user.emailVerified || undefined,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      // Add API keys info if enabled
      if (this.config.includeApiKeys) {
        const apiKeys = await db
          .select({
            provider: userApiKeys.provider,
            publicKey: userApiKeys.publicKey,
          })
          .from(userApiKeys)
          .where(eq(userApiKeys.userId, userId));

        cachedProfile.apiKeys = apiKeys.map(key => ({
          provider: key.provider,
          hasKey: true,
          publicKey: key.publicKey || undefined,
        }));
      }

      // Add preferences if enabled
      if (this.config.includePreferences) {
        // In a real app, you might have a preferences table
        // For now, we'll use a simple default
        cachedProfile.preferences = {
          theme: 'system',
          notifications: true,
          language: 'en',
        };
      }

      // Add stats if enabled
      if (this.config.includeStats) {
        // In a real app, you might calculate these from session/auth tables
        cachedProfile.stats = {
          lastLogin: new Date(),
          loginCount: 0,
          sessionCount: 0,
        };
      }

      // Cache the profile
      await this.cache.set(cacheKey, cachedProfile, this.config.profileTTL);

      authLogger.logPerformanceMetric({
        operation: 'user_profile_cache_miss',
        duration: Date.now() - startTime,
        success: true,
        metadata: { cached: true },
        timestamp: new Date(),
      });

      return cachedProfile;
    } catch (error) {
      authLogger.logPerformanceMetric({
        operation: 'user_profile_cache_error',
        duration: Date.now() - startTime,
        success: false,
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date(),
      });

      console.error('User profile cache error:', error);
      return null;
    }
  }

  // Get multiple user profiles
  async getUserProfiles(userIds: string[]): Promise<Map<string, CachedUserProfile>> {
    const startTime = Date.now();
    const profiles = new Map<string, CachedUserProfile>();

    try {
      // Get all profiles in parallel
      const profilePromises = userIds.map(async (userId) => {
        const profile = await this.getUserProfile(userId);
        if (profile) {
          profiles.set(userId, profile);
        }
      });

      await Promise.all(profilePromises);

      authLogger.logPerformanceMetric({
        operation: 'batch_user_profiles',
        duration: Date.now() - startTime,
        success: true,
        metadata: {
          requested: userIds.length,
          found: profiles.size,
        },
        timestamp: new Date(),
      });

      return profiles;
    } catch (error) {
      authLogger.logPerformanceMetric({
        operation: 'batch_user_profiles_error',
        duration: Date.now() - startTime,
        success: false,
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date(),
      });

      console.error('Batch user profiles error:', error);
      return profiles;
    }
  }

  // Update user profile in cache
  async updateUserProfile(userId: string, updates: Partial<CachedUserProfile>): Promise<void> {
    try {
      const cacheKey = `${this.config.keyPrefix}${userId}`;

      // Get current cached profile
      const current = await this.cache.get<CachedUserProfile>(cacheKey);
      if (current) {
        // Update the cached profile
        const updated = { ...current, ...updates, updatedAt: new Date() };
        await this.cache.set(cacheKey, updated, this.config.profileTTL);

        authLogger.log('debug', 'User profile cache updated', {
          userId,
          updates: Object.keys(updates),
        });
      }
    } catch (error) {
      console.error('Error updating user profile cache:', error);
    }
  }

  // Invalidate user profile cache
  async invalidateUserProfile(userId: string): Promise<void> {
    try {
      const cacheKey = `${this.config.keyPrefix}${userId}`;
      await this.cache.delete(cacheKey);

      authLogger.log('debug', 'User profile cache invalidated', { userId });
    } catch (error) {
      console.error('Error invalidating user profile cache:', error);
    }
  }

  // Invalidate multiple user profiles
  async invalidateUserProfiles(userIds: string[]): Promise<void> {
    try {
      const deletePromises = userIds.map(userId => this.invalidateUserProfile(userId));
      await Promise.all(deletePromises);

      authLogger.log('debug', 'Multiple user profile caches invalidated', {
        count: userIds.length,
      });
    } catch (error) {
      console.error('Error invalidating multiple user profiles:', error);
    }
  }

  // Warm up cache for active users
  async warmUpCache(limit: number = 100): Promise<void> {
    try {
      const startTime = Date.now();

      // Get recently active users (you might want to adjust this query)
      const recentUsers = await db
        .select({ id: users.id })
        .from(users)
        .orderBy(users.updatedAt)
        .limit(limit);

      // Cache each user profile
      const cachePromises = recentUsers.map(user => this.getUserProfile(user.id));
      await Promise.all(cachePromises);

      authLogger.log('info', 'User profile cache warmed up', {
        userCount: recentUsers.length,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      console.error('Error warming up user profile cache:', error);
    }
  }

  // Get user profile by email (with caching)
  async getUserProfileByEmail(email: string): Promise<CachedUserProfile | null> {
    const startTime = Date.now();

    try {
      const cacheKey = `${this.config.keyPrefix}email:${email}`;

      // Try cache first
      const cached = await this.cache.get<CachedUserProfile>(cacheKey);
      if (cached) {
        authLogger.logPerformanceMetric({
          operation: 'user_profile_by_email_cache_hit',
          duration: Date.now() - startTime,
          success: true,
          timestamp: new Date(),
        });

        return cached;
      }

      // Cache miss - fetch from database
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user) {
        authLogger.logPerformanceMetric({
          operation: 'user_profile_by_email_cache_miss',
          duration: Date.now() - startTime,
          success: false,
          metadata: { reason: 'user_not_found' },
          timestamp: new Date(),
        });

        return null;
      }

      // Get the full profile
      const profile = await this.getUserProfile(user.id);

      // Cache by email as well (shorter TTL for security)
      if (profile) {
        await this.cache.set(cacheKey, profile, Math.min(this.config.profileTTL, 300));
      }

      authLogger.logPerformanceMetric({
        operation: 'user_profile_by_email_cache_miss',
        duration: Date.now() - startTime,
        success: true,
        metadata: { cached: true },
        timestamp: new Date(),
      });

      return profile;
    } catch (error) {
      authLogger.logPerformanceMetric({
        operation: 'user_profile_by_email_cache_error',
        duration: Date.now() - startTime,
        success: false,
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date(),
      });

      console.error('User profile by email cache error:', error);
      return null;
    }
  }

  // Clear all user profile cache
  async clearAllCache(): Promise<void> {
    try {
      const pattern = `${this.config.keyPrefix}*`;
      await this.cache.deletePattern(pattern);

      authLogger.log('info', 'All user profile cache cleared');
    } catch (error) {
      console.error('Error clearing user profile cache:', error);
    }
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
      console.error('Error getting user profile cache stats:', error);
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Create and export user profile cache instance
export const userProfileCache = new UserProfileCache();

// Export user profile cache utilities
export const userProfileCacheUtils = {
  getUserProfile: (userId: string) => userProfileCache.getUserProfile(userId),
  getUserProfiles: (userIds: string[]) => userProfileCache.getUserProfiles(userIds),
  getUserProfileByEmail: (email: string) => userProfileCache.getUserProfileByEmail(email),
  updateUserProfile: (userId: string, updates: Partial<CachedUserProfile>) =>
    userProfileCache.updateUserProfile(userId, updates),
  invalidateUserProfile: (userId: string) => userProfileCache.invalidateUserProfile(userId),
  invalidateUserProfiles: (userIds: string[]) => userProfileCache.invalidateUserProfiles(userIds),
  warmUpCache: (limit?: number) => userProfileCache.warmUpCache(limit),
  getCacheStats: () => userProfileCache.getCacheStats(),
  clearAllCache: () => userProfileCache.clearAllCache(),
};