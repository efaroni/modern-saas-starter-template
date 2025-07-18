// Export Redis cache
export { RedisCache, createRedisCache, redisCache } from './redis'
export type { CacheConfig, CacheItem, CacheStats } from './redis'

// Export session cache
export { SessionCache, sessionCache, sessionCacheUtils } from './session-cache'
export type { CachedSession, SessionCacheConfig } from './session-cache'

// Export user profile cache
export { UserProfileCache, userProfileCache, userProfileCacheUtils } from './user-profile-cache'
export type { CachedUserProfile, UserProfileCacheConfig } from './user-profile-cache'

// Export OAuth token cache
export { OAuthTokenCache, oauthTokenCache, oauthTokenCacheUtils } from './oauth-token-cache'
export type { CachedOAuthToken, OAuthTokenCacheConfig } from './oauth-token-cache'

// Export cache invalidation utilities
export { CacheInvalidator, cacheInvalidator, cacheInvalidationUtils } from './cache-invalidator'
export type { InvalidationRule, CacheInvalidationConfig } from './cache-invalidator'

// Export comprehensive cache utilities
export const cacheUtils = {
  // Session cache
  session: sessionCacheUtils,
  
  // User profile cache
  profile: userProfileCacheUtils,
  
  // OAuth token cache
  oauth: oauthTokenCacheUtils,
  
  // Cache invalidation
  invalidation: cacheInvalidationUtils
}