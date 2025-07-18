import { db, getDatabasePool } from './connection-pool'
import { users, authAttempts, passwordHistory, userSessions } from './schema'
import { eq, and, gte, desc, lte, count, sql } from 'drizzle-orm'

export interface QueryOptimizationConfig {
  // Cache settings
  enableQueryCache: boolean
  cacheTimeout: number // in milliseconds
  
  // Pagination settings
  defaultPageSize: number
  maxPageSize: number
  
  // Performance settings
  enableQueryLogging: boolean
  slowQueryThreshold: number // in milliseconds
  
  // Batch processing
  defaultBatchSize: number
  maxBatchSize: number
}

export const DEFAULT_QUERY_CONFIG: QueryOptimizationConfig = {
  enableQueryCache: process.env.NODE_ENV === 'production',
  cacheTimeout: 5 * 60 * 1000, // 5 minutes
  defaultPageSize: 20,
  maxPageSize: 100,
  enableQueryLogging: process.env.NODE_ENV === 'development',
  slowQueryThreshold: 1000, // 1 second
  defaultBatchSize: 100,
  maxBatchSize: 1000,
}

// Query cache for frequently accessed data
class QueryCache {
  private cache = new Map<string, { data: unknown; timestamp: number }>()
  private config: QueryOptimizationConfig

  constructor(config: QueryOptimizationConfig) {
    this.config = config
  }

  set(key: string, data: unknown): void {
    if (!this.config.enableQueryCache) return
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  get(key: string): unknown | null {
    if (!this.config.enableQueryCache) return null
    
    const cached = this.cache.get(key)
    if (!cached) return null
    
    const age = Date.now() - cached.timestamp
    if (age > this.config.cacheTimeout) {
      this.cache.delete(key)
      return null
    }
    
    return cached.data
  }

  clear(): void {
    this.cache.clear()
  }

  // Cleanup expired entries
  cleanup(): void {
    const now = Date.now()
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.config.cacheTimeout) {
        this.cache.delete(key)
      }
    }
  }
}

export class QueryOptimizer {
  private cache: QueryCache
  private config: QueryOptimizationConfig
  private queryMetrics: Map<string, { count: number; totalTime: number; avgTime: number }>

  constructor(config?: Partial<QueryOptimizationConfig>) {
    this.config = { ...DEFAULT_QUERY_CONFIG, ...config }
    this.cache = new QueryCache(this.config)
    this.queryMetrics = new Map()
    
    // Setup periodic cache cleanup
    if (this.config.enableQueryCache) {
      setInterval(() => {
        this.cache.cleanup()
      }, this.config.cacheTimeout)
    }
  }

  // Execute query with performance monitoring
  async executeQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>,
    cacheKey?: string
  ): Promise<T> {
    // Check cache first
    if (cacheKey) {
      const cached = this.cache.get(cacheKey)
      if (cached) {
        return cached as T
      }
    }

    const startTime = Date.now()
    
    try {
      const result = await queryFn()
      const queryTime = Date.now() - startTime
      
      // Update metrics
      this.updateMetrics(queryName, queryTime)
      
      // Log slow queries
      if (this.config.enableQueryLogging && queryTime > this.config.slowQueryThreshold) {
        console.warn(`Slow query detected: ${queryName} took ${queryTime}ms`)
      }
      
      // Cache result if requested
      if (cacheKey) {
        this.cache.set(cacheKey, result)
      }
      
      return result
    } catch (error) {
      const queryTime = Date.now() - startTime
      this.updateMetrics(queryName, queryTime, true)
      
      if (this.config.enableQueryLogging) {
        console.error(`Query failed: ${queryName} after ${queryTime}ms`, error)
      }
      
      throw error
    }
  }

  private updateMetrics(queryName: string, queryTime: number, _failed: boolean = false): void {
    const existing = this.queryMetrics.get(queryName) || { count: 0, totalTime: 0, avgTime: 0 }
    
    existing.count++
    existing.totalTime += queryTime
    existing.avgTime = existing.totalTime / existing.count
    
    this.queryMetrics.set(queryName, existing)
  }

  // Optimized user queries
  async findUserByEmail(email: string, useCache = true): Promise<typeof users.$inferSelect | null> {
    const cacheKey = useCache ? `user:email:${email}` : undefined
    
    return this.executeQuery(
      'findUserByEmail',
      async () => {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1)
        
        return user || null
      },
      cacheKey
    )
  }

  async findUserById(id: string, useCache = true): Promise<typeof users.$inferSelect | null> {
    const cacheKey = useCache ? `user:id:${id}` : undefined
    
    return this.executeQuery(
      'findUserById',
      async () => {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, id))
          .limit(1)
        
        return user || null
      },
      cacheKey
    )
  }

  // Optimized auth attempt queries with proper indexing
  async getRecentAuthAttempts(
    identifier: string,
    type: string,
    timeWindowMinutes: number = 15,
    limit: number = 100
  ): Promise<typeof authAttempts.$inferSelect[]> {
    const cacheKey = `auth_attempts:${identifier}:${type}:${timeWindowMinutes}`
    
    return this.executeQuery(
      'getRecentAuthAttempts',
      async () => {
        const timeWindow = new Date(Date.now() - timeWindowMinutes * 60 * 1000)
        
        return await db
          .select()
          .from(authAttempts)
          .where(
            and(
              eq(authAttempts.identifier, identifier),
              eq(authAttempts.type, type),
              gte(authAttempts.createdAt, timeWindow)
            )
          )
          .orderBy(desc(authAttempts.createdAt))
          .limit(limit)
      },
      cacheKey
    )
  }

  // Optimized password history queries
  async getRecentPasswordHistory(
    userId: string,
    limit: number = 5
  ): Promise<typeof passwordHistory.$inferSelect[]> {
    return this.executeQuery(
      'getRecentPasswordHistory',
      async () => {
        return await db
          .select()
          .from(passwordHistory)
          .where(eq(passwordHistory.userId, userId))
          .orderBy(desc(passwordHistory.createdAt))
          .limit(limit)
      }
    )
  }

  // Batch operations for better performance
  async batchCreateAuthAttempts(
    attempts: (typeof authAttempts.$inferInsert)[]
  ): Promise<void> {
    const batchSize = Math.min(attempts.length, this.config.maxBatchSize)
    
    return this.executeQuery(
      'batchCreateAuthAttempts',
      async () => {
        // Process in batches to avoid overwhelming the database
        for (let i = 0; i < attempts.length; i += batchSize) {
          const batch = attempts.slice(i, i + batchSize)
          await db.insert(authAttempts).values(batch)
        }
      }
    )
  }

  // Optimized session queries
  async getActiveSessions(
    userId: string,
    useCache = true
  ): Promise<typeof userSessions.$inferSelect[]> {
    const cacheKey = useCache ? `active_sessions:${userId}` : undefined
    
    return this.executeQuery(
      'getActiveSessions',
      async () => {
        const now = new Date()
        
        return await db
          .select()
          .from(userSessions)
          .where(
            and(
              eq(userSessions.userId, userId),
              eq(userSessions.isActive, true),
              gte(userSessions.expiresAt, now)
            )
          )
          .orderBy(desc(userSessions.lastActivity))
      },
      cacheKey
    )
  }

  // Aggregated queries for analytics
  async getAuthAttemptStats(
    timeWindowHours: number = 24
  ): Promise<{
    totalAttempts: number
    successfulAttempts: number
    failedAttempts: number
    uniqueUsers: number
    topFailedEmails: Array<{ email: string; count: number }>
  }> {
    const cacheKey = `auth_stats:${timeWindowHours}h`
    
    return this.executeQuery(
      'getAuthAttemptStats',
      async () => {
        const timeWindow = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000)
        
        // Get basic stats
        const [stats] = await db
          .select({
            totalAttempts: count(),
            successfulAttempts: count(sql`CASE WHEN success = true THEN 1 END`),
            failedAttempts: count(sql`CASE WHEN success = false THEN 1 END`),
            uniqueUsers: sql<number>`COUNT(DISTINCT identifier)`
          })
          .from(authAttempts)
          .where(gte(authAttempts.createdAt, timeWindow))
        
        // Get top failed emails
        const topFailedEmails = await db
          .select({
            email: authAttempts.identifier,
            count: count()
          })
          .from(authAttempts)
          .where(
            and(
              eq(authAttempts.success, false),
              gte(authAttempts.createdAt, timeWindow)
            )
          )
          .groupBy(authAttempts.identifier)
          .orderBy(desc(count()))
          .limit(10)
        
        return {
          totalAttempts: stats.totalAttempts,
          successfulAttempts: stats.successfulAttempts,
          failedAttempts: stats.failedAttempts,
          uniqueUsers: Number(stats.uniqueUsers),
          topFailedEmails: topFailedEmails.map(item => ({
            email: item.email,
            count: item.count
          }))
        }
      },
      cacheKey
    )
  }

  // Cleanup operations
  async cleanupExpiredTokens(): Promise<number> {
    return this.executeQuery(
      'cleanupExpiredTokens',
      async () => {
        const now = new Date()
        const result = await db
          .delete(authAttempts)
          .where(lte(authAttempts.createdAt, new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000))) // 90 days ago
        
        return result.rowCount || 0
      }
    )
  }

  async cleanupExpiredSessions(): Promise<number> {
    return this.executeQuery(
      'cleanupExpiredSessions',
      async () => {
        const now = new Date()
        const result = await db
          .delete(userSessions)
          .where(lte(userSessions.expiresAt, now))
        
        return result.rowCount || 0
      }
    )
  }

  // Performance monitoring
  getQueryMetrics(): Array<{
    queryName: string
    count: number
    totalTime: number
    avgTime: number
  }> {
    return Array.from(this.queryMetrics.entries()).map(([queryName, metrics]) => ({
      queryName,
      ...metrics
    }))
  }

  // Cache management
  invalidateCache(pattern?: string): void {
    if (pattern) {
      // If pattern is provided, remove matching cache entries
      for (const key of this.cache['cache'].keys()) {
        if (key.includes(pattern)) {
          this.cache['cache'].delete(key)
        }
      }
    } else {
      // Clear all cache
      this.cache.clear()
    }
  }

  // Get database connection health
  async getDatabaseHealth() {
    const dbPool = getDatabasePool()
    return await dbPool.getHealth()
  }
}

// Export singleton instance
export const queryOptimizer = new QueryOptimizer()

// Export optimized query functions
export const optimizedQueries = {
  findUserByEmail: (email: string, useCache = true) => queryOptimizer.findUserByEmail(email, useCache),
  findUserById: (id: string, useCache = true) => queryOptimizer.findUserById(id, useCache),
  getRecentAuthAttempts: (identifier: string, type: string, timeWindowMinutes = 15, limit = 100) =>
    queryOptimizer.getRecentAuthAttempts(identifier, type, timeWindowMinutes, limit),
  getRecentPasswordHistory: (userId: string, limit = 5) => queryOptimizer.getRecentPasswordHistory(userId, limit),
  getActiveSessions: (userId: string, useCache = true) => queryOptimizer.getActiveSessions(userId, useCache),
  getAuthAttemptStats: (timeWindowHours = 24) => queryOptimizer.getAuthAttemptStats(timeWindowHours),
  cleanupExpiredTokens: () => queryOptimizer.cleanupExpiredTokens(),
  cleanupExpiredSessions: () => queryOptimizer.cleanupExpiredSessions(),
}