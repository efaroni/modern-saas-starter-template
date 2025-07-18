import { sessionCache } from './session-cache'
import { userProfileCache } from './user-profile-cache'
import { oauthTokenCache } from './oauth-token-cache'
import { authLogger } from '@/lib/auth/logger'

export interface InvalidationRule {
  event: string
  caches: ('session' | 'profile' | 'oauth')[]
  pattern?: string
  userIds?: string[]
  delay?: number // milliseconds
}

export interface CacheInvalidationConfig {
  enableAutoInvalidation: boolean
  rules: InvalidationRule[]
  batchSize: number
  maxRetries: number
  retryDelay: number
}

export const DEFAULT_CACHE_INVALIDATION_CONFIG: CacheInvalidationConfig = {
  enableAutoInvalidation: true,
  rules: [
    // User profile changes
    {
      event: 'user.profile.updated',
      caches: ['profile', 'session']
    },
    {
      event: 'user.email.verified',
      caches: ['profile', 'session']
    },
    {
      event: 'user.password.changed',
      caches: ['session', 'profile']
    },
    {
      event: 'user.deleted',
      caches: ['session', 'profile', 'oauth']
    },
    
    // Session changes
    {
      event: 'session.created',
      caches: ['session']
    },
    {
      event: 'session.terminated',
      caches: ['session']
    },
    {
      event: 'session.expired',
      caches: ['session']
    },
    
    // OAuth changes
    {
      event: 'oauth.token.refreshed',
      caches: ['oauth']
    },
    {
      event: 'oauth.account.linked',
      caches: ['oauth', 'profile']
    },
    {
      event: 'oauth.account.unlinked',
      caches: ['oauth', 'profile']
    },
    
    // Security events
    {
      event: 'security.password.reset',
      caches: ['session', 'profile']
    },
    {
      event: 'security.account.locked',
      caches: ['session', 'profile']
    },
    {
      event: 'security.suspicious.activity',
      caches: ['session']
    }
  ],
  batchSize: 50,
  maxRetries: 3,
  retryDelay: 1000
}

export class CacheInvalidator {
  private config: CacheInvalidationConfig
  private invalidationQueue: Array<{
    event: string
    userIds: string[]
    caches: ('session' | 'profile' | 'oauth')[]
    timestamp: Date
    retries: number
  }> = []
  
  private processing = false

  constructor(config?: Partial<CacheInvalidationConfig>) {
    this.config = { ...DEFAULT_CACHE_INVALIDATION_CONFIG, ...config }
    
    // Start processing queue
    this.startQueueProcessor()
  }

  // Trigger cache invalidation for an event
  async invalidateForEvent(
    event: string, 
    userIds: string | string[], 
    options?: {
      immediate?: boolean
      caches?: ('session' | 'profile' | 'oauth')[]
    }
  ): Promise<void> {
    const startTime = Date.now()
    
    try {
      if (!this.config.enableAutoInvalidation) {
        return
      }
      
      const userIdArray = Array.isArray(userIds) ? userIds : [userIds]
      
      // Find matching rules
      const matchingRules = this.config.rules.filter(rule => rule.event === event)
      if (matchingRules.length === 0) {
        authLogger.log('debug', 'No invalidation rules found for event', { event })
        return
      }
      
      // Determine which caches to invalidate
      const cachesToInvalidate = options?.caches || 
        Array.from(new Set(matchingRules.flatMap(rule => rule.caches)))
      
      if (options?.immediate) {
        // Immediate invalidation
        await this.performInvalidation(userIdArray, cachesToInvalidate)
      } else {
        // Queue for batch processing
        this.invalidationQueue.push({
          event,
          userIds: userIdArray,
          caches: cachesToInvalidate,
          timestamp: new Date(),
          retries: 0
        })
      }
      
      authLogger.logPerformanceMetric({
        operation: 'cache_invalidation_queued',
        duration: Date.now() - startTime,
        success: true,
        metadata: { 
          event,
          userCount: userIdArray.length,
          caches: cachesToInvalidate,
          immediate: options?.immediate || false
        },
        timestamp: new Date()
      })
      
    } catch (error) {
      authLogger.logPerformanceMetric({
        operation: 'cache_invalidation_error',
        duration: Date.now() - startTime,
        success: false,
        metadata: { 
          event,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      })
      
      console.error('Cache invalidation error:', error)
    }
  }

  // Perform the actual cache invalidation
  private async performInvalidation(
    userIds: string[], 
    caches: ('session' | 'profile' | 'oauth')[]
  ): Promise<void> {
    const startTime = Date.now()
    
    try {
      // Process in batches to avoid overwhelming the cache
      for (let i = 0; i < userIds.length; i += this.config.batchSize) {
        const batch = userIds.slice(i, i + this.config.batchSize)
        
        const invalidationPromises = []
        
        // Invalidate session cache
        if (caches.includes('session')) {
          invalidationPromises.push(
            ...batch.map(userId => sessionCache.invalidateAllUserCache(userId))
          )
        }
        
        // Invalidate profile cache
        if (caches.includes('profile')) {
          invalidationPromises.push(
            userProfileCache.invalidateUserProfiles(batch)
          )
        }
        
        // Invalidate OAuth cache
        if (caches.includes('oauth')) {
          invalidationPromises.push(
            ...batch.map(userId => oauthTokenCache.invalidateUserOAuthTokens(userId))
          )
        }
        
        await Promise.all(invalidationPromises)
        
        // Small delay between batches
        if (i + this.config.batchSize < userIds.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
      
      authLogger.logPerformanceMetric({
        operation: 'cache_invalidation_completed',
        duration: Date.now() - startTime,
        success: true,
        metadata: { 
          userCount: userIds.length,
          caches,
          batches: Math.ceil(userIds.length / this.config.batchSize)
        },
        timestamp: new Date()
      })
      
    } catch (error) {
      authLogger.logPerformanceMetric({
        operation: 'cache_invalidation_failed',
        duration: Date.now() - startTime,
        success: false,
        metadata: { 
          userCount: userIds.length,
          caches,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      })
      
      throw error
    }
  }

  // Start the queue processor
  private startQueueProcessor(): void {
    setInterval(async () => {
      if (this.processing || this.invalidationQueue.length === 0) {
        return
      }
      
      this.processing = true
      
      try {
        // Process all queued invalidations
        const queuedItems = [...this.invalidationQueue]
        this.invalidationQueue = []
        
        // Group by cache types for efficient processing
        const groupedByCache = new Map<string, string[]>()
        
        for (const item of queuedItems) {
          const cacheKey = item.caches.sort().join(',')
          const existingUsers = groupedByCache.get(cacheKey) || []
          groupedByCache.set(cacheKey, [...existingUsers, ...item.userIds])
        }
        
        // Process each group
        for (const [cacheTypesStr, userIds] of groupedByCache) {
          const cacheTypes = cacheTypesStr.split(',') as ('session' | 'profile' | 'oauth')[]
          const uniqueUserIds = Array.from(new Set(userIds))
          
          try {
            await this.performInvalidation(uniqueUserIds, cacheTypes)
          } catch (error) {
            console.error('Error processing invalidation queue:', error)
            
            // Retry logic
            const failedItems = queuedItems.filter(item => 
              item.caches.sort().join(',') === cacheTypesStr
            )
            
            for (const item of failedItems) {
              if (item.retries < this.config.maxRetries) {
                item.retries++
                this.invalidationQueue.push(item)
                
                // Add delay before retry
                await new Promise(resolve => 
                  setTimeout(resolve, this.config.retryDelay * item.retries)
                )
              } else {
                authLogger.log('error', 'Cache invalidation failed after max retries', {
                  event: item.event,
                  userIds: item.userIds,
                  caches: item.caches,
                  retries: item.retries
                })
              }
            }
          }
        }
        
      } catch (error) {
        console.error('Queue processor error:', error)
      } finally {
        this.processing = false
      }
    }, 5000) // Process every 5 seconds
  }

  // Immediate cache invalidation for critical events
  async invalidateImmediately(
    userIds: string | string[], 
    caches: ('session' | 'profile' | 'oauth')[]
  ): Promise<void> {
    const userIdArray = Array.isArray(userIds) ? userIds : [userIds]
    await this.performInvalidation(userIdArray, caches)
  }

  // Clear all caches
  async clearAllCaches(): Promise<void> {
    const startTime = Date.now()
    
    try {
      await Promise.all([
        sessionCache.clearAllCache(),
        userProfileCache.clearAllCache(),
        oauthTokenCache.clearAllCache()
      ])
      
      authLogger.logPerformanceMetric({
        operation: 'clear_all_caches',
        duration: Date.now() - startTime,
        success: true,
        timestamp: new Date()
      })
      
      authLogger.log('info', 'All caches cleared')
    } catch (error) {
      authLogger.logPerformanceMetric({
        operation: 'clear_all_caches_error',
        duration: Date.now() - startTime,
        success: false,
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date()
      })
      
      console.error('Error clearing all caches:', error)
    }
  }

  // Get invalidation queue status
  getQueueStatus(): {
    queueLength: number
    processing: boolean
    config: CacheInvalidationConfig
  } {
    return {
      queueLength: this.invalidationQueue.length,
      processing: this.processing,
      config: this.config
    }
  }

  // Update configuration
  updateConfig(config: Partial<CacheInvalidationConfig>): void {
    this.config = { ...this.config, ...config }
    authLogger.log('info', 'Cache invalidation config updated', { config })
  }
}

// Create and export cache invalidator instance
export const cacheInvalidator = new CacheInvalidator()

// Export utility functions
export const cacheInvalidationUtils = {
  invalidateForEvent: (event: string, userIds: string | string[], options?: any) => 
    cacheInvalidator.invalidateForEvent(event, userIds, options),
  invalidateImmediately: (userIds: string | string[], caches: ('session' | 'profile' | 'oauth')[]) => 
    cacheInvalidator.invalidateImmediately(userIds, caches),
  clearAllCaches: () => cacheInvalidator.clearAllCaches(),
  getQueueStatus: () => cacheInvalidator.getQueueStatus()
}