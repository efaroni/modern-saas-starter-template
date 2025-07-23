import { type NextRequest, NextResponse } from 'next/server';

import { EnhancedRateLimiter } from '@/lib/auth/enhanced-rate-limiter';

export interface RateLimitMiddlewareOptions {
  type: string;
  keyGenerator?: (req: NextRequest) => string;
  skipIf?: (req: NextRequest) => boolean;
  onRateLimited?: (req: NextRequest, result: { allowed: boolean; remainingAttempts: number; resetTime: Date; locked: boolean }) => NextResponse;
}

const globalRateLimiter = new EnhancedRateLimiter();

/**
 * Rate limiting middleware for API routes
 */
export function withRateLimit(options: RateLimitMiddlewareOptions) {
  return function rateLimitMiddleware(
    handler: (req: NextRequest) => Promise<NextResponse>,
  ) {
    return async function (req: NextRequest): Promise<NextResponse> {
      // Skip rate limiting if condition is met
      if (options.skipIf && options.skipIf(req)) {
        return handler(req);
      }

      // Generate identifier for rate limiting
      const identifier = options.keyGenerator
        ? options.keyGenerator(req)
        : getClientIP(req) || 'anonymous';

      // Check rate limit
      const result = await globalRateLimiter.checkRateLimit(
        identifier,
        options.type,
        getClientIP(req),
      );

      // Add rate limit headers
      let response: Response;
      if (result.allowed) {
        response = await handler(req);
      } else if (options.onRateLimited) {
        response = options.onRateLimited(req, result);
      } else {
        response = createRateLimitResponse(result);
      }

      // Add standard rate limit headers
      response.headers.set('X-RateLimit-Limit', result.remaining.toString());
      response.headers.set(
        'X-RateLimit-Remaining',
        result.remaining.toString(),
      );
      response.headers.set('X-RateLimit-Reset', result.resetTime.toISOString());
      response.headers.set('X-RateLimit-Algorithm', result.algorithm);

      if (result.retryAfter) {
        response.headers.set('Retry-After', result.retryAfter.toString());
      }

      // Record the attempt
      await globalRateLimiter.recordAttempt(
        identifier,
        options.type,
        result.allowed,
        getClientIP(req),
        req.headers.get('user-agent') || undefined,
      );

      return response;
    };
  };
}

/**
 * Create a rate limit exceeded response
 */
function createRateLimitResponse(result: { allowed: boolean; remainingAttempts: number; resetTime: Date; locked: boolean }): NextResponse {
  const message = result.locked
    ? 'Account temporarily locked due to too many failed attempts'
    : 'Rate limit exceeded';

  return NextResponse.json(
    {
      error: message,
      type: 'RATE_LIMIT_EXCEEDED',
      retryAfter: result.retryAfter,
      resetTime: result.resetTime,
    },
    { status: 429 },
  );
}

/**
 * Get client IP address from request
 */
function getClientIP(req: NextRequest): string | null {
  const xForwardedFor = req.headers.get('x-forwarded-for');
  const xRealIP = req.headers.get('x-real-ip');
  const cfConnectingIP = req.headers.get('cf-connecting-ip');

  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  if (xRealIP) {
    return xRealIP;
  }

  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }

  return null;
}

/**
 * Higher-order function to create rate limit middleware with preset configurations
 */
export const rateLimitPresets = {
  /**
   * Authentication endpoints (login, signup, etc.)
   */
  auth: (type: 'login' | 'signup' | 'passwordReset') =>
    withRateLimit({
      type,
      keyGenerator: req => {
        // Try to get email from request body, fallback to IP
        const body = req.body ? JSON.parse(req.body.toString()) : {};
        return body.email || getClientIP(req) || 'anonymous';
      },
    }),

  /**
   * API endpoints
   */
  api: (type: 'api' = 'api') =>
    withRateLimit({
      type,
      keyGenerator: req => {
        // Use API key if available, otherwise IP
        const apiKey =
          req.headers.get('x-api-key') || req.headers.get('authorization');
        return apiKey || getClientIP(req) || 'anonymous';
      },
    }),

  /**
   * Upload endpoints
   */
  upload: () =>
    withRateLimit({
      type: 'upload',
      keyGenerator: req => getClientIP(req) || 'anonymous',
    }),

  /**
   * Public endpoints with light rate limiting
   */
  public: (type: string = 'public') =>
    withRateLimit({
      type,
      keyGenerator: req => getClientIP(req) || 'anonymous',
      skipIf: req => {
        // Skip for local development
        const ip = getClientIP(req);
        return ip === '127.0.0.1' || ip === '::1';
      },
    }),
};

/**
 * Express-style middleware for easy integration
 */
export async function applyRateLimit(
  req: NextRequest,
  type: string,
  identifier?: string,
): Promise<{ allowed: boolean; response?: NextResponse }> {
  const key = identifier || getClientIP(req) || 'anonymous';
  const result = await globalRateLimiter.checkRateLimit(
    key,
    type,
    getClientIP(req),
  );

  if (!result.allowed) {
    return {
      allowed: false,
      response: createRateLimitResponse(result),
    };
  }

  // Record successful check
  await globalRateLimiter.recordAttempt(
    key,
    type,
    true,
    getClientIP(req),
    req.headers.get('user-agent') || undefined,
  );

  return { allowed: true };
}
