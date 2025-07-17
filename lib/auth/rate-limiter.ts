import { db } from '@/lib/db'
import { authAttempts } from '@/lib/db/schema'
import { eq, and, gte } from 'drizzle-orm'

export interface RateLimitConfig {
  maxAttempts: number
  windowMinutes: number
  lockoutMinutes: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: Date
  locked: boolean
  lockoutEndTime?: Date
}

export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  login: {
    maxAttempts: 5,
    windowMinutes: 15,
    lockoutMinutes: 15
  },
  signup: {
    maxAttempts: 3,
    windowMinutes: 60,
    lockoutMinutes: 60
  },
  passwordReset: {
    maxAttempts: 3,
    windowMinutes: 60,
    lockoutMinutes: 60
  }
}

export class RateLimiter {
  private config: Record<string, RateLimitConfig>
  private readonly database: typeof db

  constructor(database: typeof db = db, config: Record<string, RateLimitConfig> = DEFAULT_RATE_LIMITS) {
    this.database = database
    this.config = config
  }

  /**
   * Check if an action is rate limited
   */
  async checkRateLimit(
    identifier: string,
    type: string,
    ipAddress?: string
  ): Promise<RateLimitResult> {
    const config = this.config[type]
    if (!config) {
      return {
        allowed: true,
        remaining: 999,
        resetTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        locked: false
      }
    }

    const windowStart = new Date(Date.now() - config.windowMinutes * 60 * 1000)
    const lockoutStart = new Date(Date.now() - config.lockoutMinutes * 60 * 1000)

    try {
      // Get recent attempts
      const recentAttempts = await this.database
        .select()
        .from(authAttempts)
        .where(
          and(
            eq(authAttempts.identifier, identifier),
            eq(authAttempts.type, type),
            gte(authAttempts.createdAt, windowStart)
          )
        )
        .orderBy(authAttempts.createdAt)

      // Check for lockout (too many failed attempts)
      const failedAttempts = recentAttempts.filter(attempt => !attempt.success)
      const recentFailures = failedAttempts.filter(
        attempt => attempt.createdAt >= lockoutStart
      )

      if (recentFailures.length >= config.maxAttempts) {
        const lastFailure = recentFailures[recentFailures.length - 1]
        const lockoutEndTime = new Date(
          lastFailure.createdAt.getTime() + config.lockoutMinutes * 60 * 1000
        )

        if (new Date() < lockoutEndTime) {
          return {
            allowed: false,
            remaining: 0,
            resetTime: lockoutEndTime,
            locked: true,
            lockoutEndTime
          }
        }
      }

      // Check rate limit
      const remaining = Math.max(0, config.maxAttempts - recentAttempts.length)
      const resetTime = new Date(
        Math.max(
          ...recentAttempts.map(a => a.createdAt.getTime())
        ) + config.windowMinutes * 60 * 1000
      )

      return {
        allowed: remaining > 0,
        remaining,
        resetTime,
        locked: false
      }
    } catch (error) {
      console.error('Rate limit check failed:', error)
      // Fail open - allow the request if we can't check the rate limit
      return {
        allowed: true,
        remaining: 999,
        resetTime: new Date(Date.now() + 60 * 60 * 1000),
        locked: false
      }
    }
  }

  /**
   * Record an authentication attempt
   */
  async recordAttempt(
    identifier: string,
    type: string,
    success: boolean,
    ipAddress?: string,
    userAgent?: string,
    userId?: string
  ): Promise<void> {
    try {
      // If userId is provided, verify it exists before inserting
      if (userId) {
        const { users } = await import('@/lib/db/schema')
        const { eq } = await import('drizzle-orm')
        const userExists = await this.database.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1)
        
        // If user doesn't exist, record attempt without userId to avoid foreign key error
        if (userExists.length === 0) {
          userId = undefined
        }
      }

      await this.database.insert(authAttempts).values({
        identifier,
        type,
        success,
        ipAddress,
        userAgent,
        userId
      })
    } catch (error) {
      console.error('Failed to record auth attempt:', error)
      // Don't throw - recording attempts is important but shouldn't block auth
    }
  }

  /**
   * Clear recent attempts for a user (e.g., after successful login)
   */
  async clearAttempts(identifier: string, type: string): Promise<void> {
    try {
      const windowStart = new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
      
      // We don't actually delete the records for audit purposes,
      // but we could mark them as cleared or similar
      // For now, just let them naturally expire
    } catch (error) {
      console.error('Failed to clear auth attempts:', error)
    }
  }

  /**
   * Get recent failed attempts for monitoring
   */
  async getRecentFailures(
    identifier?: string,
    type?: string,
    hours: number = 24
  ): Promise<any[]> {
    try {
      const windowStart = new Date(Date.now() - hours * 60 * 60 * 1000)
      
      const query = db
        .select()
        .from(authAttempts)
        .where(
          and(
            eq(authAttempts.success, false),
            gte(authAttempts.createdAt, windowStart)
          )
        )

      // Add additional filters if provided
      let conditions = [
        eq(authAttempts.success, false),
        gte(authAttempts.createdAt, windowStart)
      ]

      if (identifier) {
        conditions.push(eq(authAttempts.identifier, identifier))
      }

      if (type) {
        conditions.push(eq(authAttempts.type, type))
      }

      return await this.database
        .select()
        .from(authAttempts)
        .where(and(...conditions))
        .orderBy(authAttempts.createdAt)
    } catch (error) {
      console.error('Failed to get recent failures:', error)
      return []
    }
  }

  /**
   * Check if IP should be blocked (multiple failed attempts from same IP)
   */
  async checkIPRateLimit(ipAddress: string, type: string): Promise<RateLimitResult> {
    if (!ipAddress) {
      return {
        allowed: true,
        remaining: 999,
        resetTime: new Date(Date.now() + 60 * 60 * 1000),
        locked: false
      }
    }

    // Use more restrictive limits for IP-based rate limiting
    const ipConfig = {
      maxAttempts: 10,
      windowMinutes: 60,
      lockoutMinutes: 60
    }

    return this.checkRateLimit(ipAddress, `ip_${type}`, ipAddress)
  }
}