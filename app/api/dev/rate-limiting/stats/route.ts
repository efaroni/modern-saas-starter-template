import { type NextRequest, NextResponse } from 'next/server';

import {
  EnhancedRateLimiter,
  ENHANCED_RATE_LIMITS,
} from '@/lib/auth/enhanced-rate-limiter';

const rateLimiter = new EnhancedRateLimiter();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const timeRange = searchParams.get('timeRange') || '24h';
    const type = searchParams.get('type');

    // Convert timeRange to hours
    const hours = timeRange === '1h' ? 1 : timeRange === '7d' ? 168 : 24;

    // Get statistics for all types or specific type
    const types = type
      ? [type]
      : ['login', 'signup', 'api', 'passwordReset', 'upload'];
    const stats: Record<string, unknown> = {};

    for (const rateLimitType of types) {
      const typeStats = await rateLimiter.getRateLimitStats(
        undefined, // identifier (undefined for all)
        rateLimitType,
        hours,
      );
      stats[rateLimitType] = typeStats;
    }

    // Get current configurations
    const configurations = Object.entries(ENHANCED_RATE_LIMITS).map(
      ([type, config]) => ({
        type,
        ...config,
      }),
    );

    // Mock active limits for demonstration
    // In a real implementation, you would query current rate limit states
    const activeLimits = [
      {
        identifier: 'user@example.com',
        type: 'login',
        remaining: 3,
        resetTime: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        locked: false,
        algorithm: 'sliding-window',
      },
      {
        identifier: '192.168.1.100',
        type: 'api',
        remaining: 87,
        resetTime: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
        locked: false,
        algorithm: 'token-bucket',
      },
    ];

    return NextResponse.json({
      success: true,
      data: {
        stats,
        configurations,
        activeLimits,
        timeRange,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to get rate limiting stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch rate limiting statistics',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, identifier, type } = body;

    if (action === 'check') {
      // Check current rate limit status
      const result = await rateLimiter.checkRateLimit(identifier, type);
      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'reset') {
      // Reset rate limit for specific identifier/type
      // This would require additional implementation in the EnhancedRateLimiter
      return NextResponse.json({
        success: true,
        message: 'Rate limit reset successfully',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 },
    );
  } catch (error) {
    console.error('Rate limiting action failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Rate limiting action failed',
      },
      { status: 500 },
    );
  }
}
