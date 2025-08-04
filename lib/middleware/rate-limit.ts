/**
 * Rate limiting middleware for API routes
 * Provides configurable rate limiting with Redis backing
 */

import { type NextRequest } from 'next/server';

export type RateLimitResult =
  | {
      allowed: true;
      remaining: number;
      resetTime: number;
    }
  | {
      allowed: false;
      retryAfter: number;
    };

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (request: NextRequest) => string;
}

// Default configuration
const defaultConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  keyGenerator: request => {
    // Use IP address as default key
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown';
    return `rate_limit:${ip}`;
  },
};

// In-memory store for development/testing (production should use Redis)
const memoryStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Apply rate limiting to a request
 */
export async function applyRateLimit(
  request: NextRequest,
  config: Partial<RateLimitConfig> = {},
): Promise<RateLimitResult> {
  const finalConfig = { ...defaultConfig, ...config };
  const key = finalConfig.keyGenerator!(request);
  const now = Date.now();
  const windowStart = now - finalConfig.windowMs;

  // Clean up expired entries
  for (const [storeKey, data] of memoryStore.entries()) {
    if (data.resetTime < now) {
      memoryStore.delete(storeKey);
    }
  }

  const current = memoryStore.get(key);

  if (!current || current.resetTime < now) {
    // First request in window or window has expired
    const resetTime = now + finalConfig.windowMs;
    memoryStore.set(key, { count: 1, resetTime });

    return {
      allowed: true,
      remaining: finalConfig.maxRequests - 1,
      resetTime,
    };
  }

  if (current.count >= finalConfig.maxRequests) {
    // Rate limit exceeded
    return {
      allowed: false,
      retryAfter: Math.ceil((current.resetTime - now) / 1000),
    };
  }

  // Increment counter
  current.count += 1;
  memoryStore.set(key, current);

  return {
    allowed: true,
    remaining: finalConfig.maxRequests - current.count,
    resetTime: current.resetTime,
  };
}

/**
 * Create a rate limiter with specific configuration
 */
export function createRateLimiter(config: Partial<RateLimitConfig> = {}) {
  return (request: NextRequest) => applyRateLimit(request, config);
}

// Pre-configured rate limiters for common use cases
export const strictRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
});

export const moderateRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
});

export const lenientRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 1000,
});
