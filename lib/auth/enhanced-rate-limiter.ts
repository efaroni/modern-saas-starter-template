import { eq, and, gte, lte, sql } from 'drizzle-orm';

import { authAttempts } from '@/lib/db/schema';
import { db } from '@/lib/db/server';
import { addMinutes, getDaysAgo } from '@/lib/utils/date-time';

export interface RateLimitConfig {
  maxAttempts: number;
  windowMinutes: number;
  lockoutMinutes: number;
  algorithm: 'fixed-window' | 'sliding-window' | 'token-bucket';
  burstLimit?: number; // For token bucket
  refillRate?: number; // For token bucket (tokens per minute)
  adaptiveScaling?: boolean; // Enable adaptive rate limiting
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  locked: boolean;
  lockoutEndTime?: Date;
  algorithm: string;
  retryAfter?: number; // Seconds until next allowed request
}

export interface TokenBucketState {
  tokens: number;
  lastRefill: Date;
  capacity: number;
  refillRate: number;
}

export const ENHANCED_RATE_LIMITS: Record<string, RateLimitConfig> = {
  login: {
    maxAttempts: 5,
    windowMinutes: 15,
    lockoutMinutes: 15,
    algorithm: 'sliding-window',
    adaptiveScaling: true,
  },
  signup: {
    maxAttempts: 3,
    windowMinutes: 60,
    lockoutMinutes: 60,
    algorithm: 'fixed-window',
    adaptiveScaling: false,
  },
  passwordReset: {
    maxAttempts: 3,
    windowMinutes: 60,
    lockoutMinutes: 60,
    algorithm: 'fixed-window',
    adaptiveScaling: false,
  },
  api: {
    maxAttempts: 100,
    windowMinutes: 60,
    lockoutMinutes: 5,
    algorithm: 'token-bucket',
    burstLimit: 20,
    refillRate: 100, // 100 tokens per minute
    adaptiveScaling: true,
  },
  upload: {
    maxAttempts: 10,
    windowMinutes: 60,
    lockoutMinutes: 10,
    algorithm: 'sliding-window',
    adaptiveScaling: true,
  },
};

export class EnhancedRateLimiter {
  private config: Record<string, RateLimitConfig>;
  private readonly database: typeof db;
  private tokenBuckets: Map<string, TokenBucketState> = new Map();
  private adaptiveFactors: Map<string, number> = new Map();

  constructor(
    database: typeof db = db,
    config: Record<string, RateLimitConfig> = ENHANCED_RATE_LIMITS,
  ) {
    this.database = database;
    this.config = config;
  }

  /**
   * Check rate limit using the configured algorithm
   */
  async checkRateLimit(
    identifier: string,
    type: string,
    ipAddress?: string,
  ): Promise<RateLimitResult> {
    const config = this.config[type];
    if (!config) {
      return this.defaultAllowedResult(type);
    }

    try {
      // Apply adaptive scaling if enabled
      const effectiveConfig = this.applyAdaptiveScaling(
        config,
        identifier,
        type,
      );

      switch (effectiveConfig.algorithm) {
        case 'token-bucket':
          return await this.checkTokenBucket(identifier, type, effectiveConfig);
        case 'sliding-window':
          return await this.checkSlidingWindow(
            identifier,
            type,
            effectiveConfig,
          );
        case 'fixed-window':
        default:
          return await this.checkFixedWindow(identifier, type, effectiveConfig);
      }
    } catch (error) {
      console.error('Enhanced rate limit check failed:', error);
      return this.defaultAllowedResult(type);
    }
  }

  /**
   * Fixed window rate limiting (original algorithm)
   */
  private async checkFixedWindow(
    identifier: string,
    type: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const windowStart = addMinutes(-config.windowMinutes);
    const lockoutStart = addMinutes(-config.lockoutMinutes);

    const recentAttempts = await this.database
      .select()
      .from(authAttempts)
      .where(
        and(
          eq(authAttempts.identifier, identifier),
          eq(authAttempts.type, type),
          gte(authAttempts.createdAt, windowStart),
        ),
      )
      .orderBy(authAttempts.createdAt);

    // Check for lockout
    const failedAttempts = recentAttempts.filter(attempt => !attempt.success);
    const recentFailures = failedAttempts.filter(
      attempt => attempt.createdAt >= lockoutStart,
    );

    if (recentFailures.length >= config.maxAttempts) {
      const lastFailure = recentFailures[recentFailures.length - 1];
      const lockoutEndTime = addMinutes(
        config.lockoutMinutes,
        lastFailure.createdAt,
      );

      if (new Date() < lockoutEndTime) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: lockoutEndTime,
          locked: true,
          lockoutEndTime,
          algorithm: 'fixed-window',
          retryAfter: Math.ceil((lockoutEndTime.getTime() - Date.now()) / 1000),
        };
      }
    }

    const remaining = Math.max(0, config.maxAttempts - recentAttempts.length);
    const resetTime = new Date(
      Math.max(...recentAttempts.map(a => a.createdAt.getTime())) +
        config.windowMinutes * 60 * 1000,
    );

    return {
      allowed: remaining > 0,
      remaining,
      resetTime,
      locked: false,
      algorithm: 'fixed-window',
    };
  }

  /**
   * Sliding window rate limiting for more accurate rate limiting
   */
  private async checkSlidingWindow(
    identifier: string,
    type: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const windowStart = addMinutes(-config.windowMinutes);
    const now = new Date();

    // Get attempts in the sliding window
    const attempts = await this.database
      .select()
      .from(authAttempts)
      .where(
        and(
          eq(authAttempts.identifier, identifier),
          eq(authAttempts.type, type),
          gte(authAttempts.createdAt, windowStart),
        ),
      )
      .orderBy(authAttempts.createdAt);

    // Calculate weighted count based on how recent the attempts are
    const windowDuration = config.windowMinutes * 60 * 1000;
    let weightedCount = 0;

    for (const attempt of attempts) {
      const age = now.getTime() - attempt.createdAt.getTime();
      const weight = Math.max(0, (windowDuration - age) / windowDuration);
      weightedCount += weight;
    }

    // Check for consecutive failures (adaptive lockout)
    const recentFailures = attempts.filter(a => !a.success);
    const consecutiveFailures = this.getConsecutiveFailures(recentFailures);

    if (consecutiveFailures >= config.maxAttempts) {
      const lockoutMinutes =
        config.lockoutMinutes *
        Math.min(consecutiveFailures / config.maxAttempts, 3);
      const lockoutEndTime = addMinutes(lockoutMinutes);

      return {
        allowed: false,
        remaining: 0,
        resetTime: lockoutEndTime,
        locked: true,
        lockoutEndTime,
        algorithm: 'sliding-window',
        retryAfter: Math.ceil(lockoutMinutes * 60),
      };
    }

    const remaining = Math.max(
      0,
      config.maxAttempts - Math.ceil(weightedCount),
    );
    const resetTime = new Date(
      now.getTime() + config.windowMinutes * 60 * 1000,
    );

    return {
      allowed: remaining > 0,
      remaining,
      resetTime,
      locked: false,
      algorithm: 'sliding-window',
    };
  }

  /**
   * Token bucket rate limiting for smooth traffic handling
   */
  private async checkTokenBucket(
    identifier: string,
    type: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const bucketKey = `${identifier}:${type}`;
    const now = new Date();

    // Get or create token bucket state
    let bucket = this.tokenBuckets.get(bucketKey);
    if (!bucket) {
      bucket = {
        tokens: config.burstLimit || config.maxAttempts,
        lastRefill: now,
        capacity: config.burstLimit || config.maxAttempts,
        refillRate: config.refillRate || config.maxAttempts,
      };
      this.tokenBuckets.set(bucketKey, bucket);
    }

    // Refill tokens based on time elapsed
    const timeSinceLastRefill =
      (now.getTime() - bucket.lastRefill.getTime()) / 1000 / 60; // minutes
    const tokensToAdd = Math.floor(timeSinceLastRefill * bucket.refillRate);

    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }

    // Check if we have tokens available
    const allowed = bucket.tokens >= 1;
    const remaining = Math.floor(bucket.tokens);

    // Calculate when next token will be available
    const secondsUntilNextToken =
      bucket.tokens < 1
        ? Math.ceil(((1 - bucket.tokens) * 60) / bucket.refillRate)
        : 0;

    const resetTime = new Date(now.getTime() + secondsUntilNextToken * 1000);

    return {
      allowed,
      remaining,
      resetTime,
      locked: false,
      algorithm: 'token-bucket',
      retryAfter: secondsUntilNextToken,
    };
  }

  /**
   * Apply adaptive scaling based on user behavior
   */
  private applyAdaptiveScaling(
    config: RateLimitConfig,
    identifier: string,
    type: string,
  ): RateLimitConfig {
    if (!config.adaptiveScaling) {
      return config;
    }

    const adaptiveKey = `${identifier}:${type}`;
    const currentFactor = this.adaptiveFactors.get(adaptiveKey) || 1.0;

    // Create a copy of config with adaptive scaling applied
    return {
      ...config,
      maxAttempts: Math.max(1, Math.floor(config.maxAttempts * currentFactor)),
      lockoutMinutes: Math.max(
        1,
        Math.floor(config.lockoutMinutes / currentFactor),
      ),
    };
  }

  /**
   * Update adaptive factors based on user behavior
   */
  async updateAdaptiveFactors(
    identifier: string,
    type: string,
    success: boolean,
  ): Promise<void> {
    const config = this.config[type];
    if (!config?.adaptiveScaling) {
      return;
    }

    const adaptiveKey = `${identifier}:${type}`;
    let factor = this.adaptiveFactors.get(adaptiveKey) || 1.0;

    if (success) {
      // Gradually increase limits for successful users
      factor = Math.min(2.0, factor * 1.1);
    } else {
      // Decrease limits for users with failures
      factor = Math.max(0.5, factor * 0.9);
    }

    this.adaptiveFactors.set(adaptiveKey, factor);
  }

  /**
   * Record an attempt with enhanced tracking
   */
  async recordAttempt(
    identifier: string,
    type: string,
    success: boolean,
    ipAddress?: string,
    userAgent?: string,
    userId?: string,
  ): Promise<void> {
    try {
      // Update adaptive factors
      await this.updateAdaptiveFactors(identifier, type, success);

      // Consume token for token bucket algorithms
      const config = this.config[type];
      if (config?.algorithm === 'token-bucket') {
        const bucketKey = `${identifier}:${type}`;
        const bucket = this.tokenBuckets.get(bucketKey);
        if (bucket && bucket.tokens >= 1) {
          bucket.tokens -= 1;
        }
      }

      // Record in database (same as original)
      if (userId) {
        const { users } = await import('@/lib/db/schema');
        const userExists = await this.database
          .select({ id: users.id })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);
        if (userExists.length === 0) {
          userId = undefined;
        }
      }

      await this.database.insert(authAttempts).values({
        identifier,
        type,
        success,
        ipAddress,
        userAgent,
        userId,
      });
    } catch (error) {
      console.error('Failed to record enhanced auth attempt:', error);
    }
  }

  /**
   * Get rate limit statistics for monitoring
   */
  async getRateLimitStats(
    identifier?: string,
    type?: string,
    hours: number = 24,
  ): Promise<{
    totalAttempts: number;
    successfulAttempts: number;
    failedAttempts: number;
    uniqueIPs: number;
    topFailureReasons: Array<{ reason: string; count: number }>;
  }> {
    try {
      const windowStart = new Date(Date.now() - hours * 60 * 60 * 1000);

      const conditions = [gte(authAttempts.createdAt, windowStart)];

      if (identifier) {
        conditions.push(eq(authAttempts.identifier, identifier));
      }

      if (type) {
        conditions.push(eq(authAttempts.type, type));
      }

      const attempts = await this.database
        .select()
        .from(authAttempts)
        .where(and(...conditions));

      const totalAttempts = attempts.length;
      const successfulAttempts = attempts.filter(a => a.success).length;
      const failedAttempts = totalAttempts - successfulAttempts;
      const uniqueIPs = new Set(attempts.map(a => a.ipAddress).filter(Boolean))
        .size;

      return {
        totalAttempts,
        successfulAttempts,
        failedAttempts,
        uniqueIPs,
        topFailureReasons: [], // Would need more detailed failure tracking
      };
    } catch (error) {
      console.error('Failed to get rate limit stats:', error);
      return {
        totalAttempts: 0,
        successfulAttempts: 0,
        failedAttempts: 0,
        uniqueIPs: 0,
        topFailureReasons: [],
      };
    }
  }

  /**
   * Clean up expired token buckets and adaptive factors
   */
  cleanupExpiredStates(): void {
    const now = new Date();
    const expiredTime = 24 * 60 * 60 * 1000; // 24 hours

    // Clean up token buckets
    for (const [key, bucket] of this.tokenBuckets.entries()) {
      if (now.getTime() - bucket.lastRefill.getTime() > expiredTime) {
        this.tokenBuckets.delete(key);
      }
    }

    // Clean up adaptive factors (could be more sophisticated)
    if (this.adaptiveFactors.size > 10000) {
      // Prevent memory leaks
      this.adaptiveFactors.clear();
    }
  }

  /**
   * Helper methods
   */
  private getConsecutiveFailures(failures: any[]): number {
    if (failures.length === 0) return 0;

    let consecutive = 0;
    for (let i = failures.length - 1; i >= 0; i--) {
      if (!failures[i].success) {
        consecutive++;
      } else {
        break;
      }
    }
    return consecutive;
  }

  private defaultAllowedResult(type: string): RateLimitResult {
    return {
      allowed: true,
      remaining: 999,
      resetTime: new Date(Date.now() + 60 * 60 * 1000),
      locked: false,
      algorithm: 'default',
    };
  }
}
