import { type NextRequest, NextResponse } from 'next/server';

import { rateLimitPresets } from '@/lib/middleware/rate-limit';

interface PerformanceMetricsPayload {
  metrics: {
    lcp?: number;
    fid?: number;
    cls?: number;
    fcp?: number;
    ttfb?: number;
    fmp?: number;
    renderTime?: number;
    componentMountTime?: number;
    apiResponseTime?: number;
    memoryUsage?: {
      usedJSHeapSize?: number;
      totalJSHeapSize?: number;
      jsHeapSizeLimit?: number;
    };
    connectionType?: string;
    userInteractions?: number;
    scrollDepth?: number;
    timeOnPage?: number;
    errorRate?: number;
    errorCount?: number;
    customMetrics?: Record<string, number>;
  };
  timestamp: number;
  url: string;
  userAgent: string;
  sessionId?: string;
}

async function handler(request: NextRequest) {
  // Apply rate limiting to prevent abuse
  const rateLimitResult = rateLimitPresets.moderate(request);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retryAfter: rateLimitResult.retryAfter },
      { status: 429 },
    );
  }

  try {
    const body: PerformanceMetricsPayload = await request.json();

    // Validate payload
    if (!body.metrics || !body.timestamp || !body.url) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    // Get client information
    const clientIP =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';

    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Create performance record
    const performanceRecord = {
      ...body,
      clientIP,
      userAgent,
      receivedAt: new Date().toISOString(),

      // Calculate performance scores
      scores: calculatePerformanceScores(body.metrics),

      // Add device/browser detection
      deviceInfo: parseUserAgent(userAgent),

      // Add page categorization
      pageCategory: categorizeUrl(body.url),
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('Performance metrics received:', {
        url: body.url,
        coreWebVitals: {
          lcp: body.metrics.lcp,
          fid: body.metrics.fid,
          cls: body.metrics.cls,
        },
        customMetrics: body.metrics.customMetrics,
        scores: performanceRecord.scores,
      });
    }

    // In production, you would store this in a database or send to analytics service
    // Examples:
    // await storePerformanceMetrics(performanceRecord)
    // await sendToAnalyticsService(performanceRecord)

    // For now, we'll just acknowledge receipt
    return NextResponse.json({
      success: true,
      message: 'Performance metrics received',
      scores: performanceRecord.scores,
    });
  } catch (error) {
    console.error('Failed to process performance metrics:', error);
    return NextResponse.json(
      { error: 'Failed to process performance metrics' },
      { status: 500 },
    );
  }
}

// Calculate performance scores based on Core Web Vitals
function calculatePerformanceScores(
  metrics: PerformanceMetricsPayload['metrics'],
) {
  const scores: Record<string, 'good' | 'needs-improvement' | 'poor'> = {};

  // LCP (Largest Contentful Paint)
  if (metrics.lcp !== undefined) {
    if (metrics.lcp <= 2500) scores.lcp = 'good';
    else if (metrics.lcp <= 4000) scores.lcp = 'needs-improvement';
    else scores.lcp = 'poor';
  }

  // FID (First Input Delay)
  if (metrics.fid !== undefined) {
    if (metrics.fid <= 100) scores.fid = 'good';
    else if (metrics.fid <= 300) scores.fid = 'needs-improvement';
    else scores.fid = 'poor';
  }

  // CLS (Cumulative Layout Shift)
  if (metrics.cls !== undefined) {
    if (metrics.cls <= 0.1) scores.cls = 'good';
    else if (metrics.cls <= 0.25) scores.cls = 'needs-improvement';
    else scores.cls = 'poor';
  }

  // FCP (First Contentful Paint)
  if (metrics.fcp !== undefined) {
    if (metrics.fcp <= 1800) scores.fcp = 'good';
    else if (metrics.fcp <= 3000) scores.fcp = 'needs-improvement';
    else scores.fcp = 'poor';
  }

  // TTFB (Time to First Byte)
  if (metrics.ttfb !== undefined) {
    if (metrics.ttfb <= 800) scores.ttfb = 'good';
    else if (metrics.ttfb <= 1800) scores.ttfb = 'needs-improvement';
    else scores.ttfb = 'poor';
  }

  return scores;
}

// Parse user agent for device/browser info
function parseUserAgent(userAgent: string) {
  const info = {
    browser: 'unknown',
    os: 'unknown',
    device: 'unknown',
    mobile: false,
  };

  try {
    // Simple user agent parsing (in production, use a library like ua-parser-js)
    if (userAgent.includes('Chrome')) info.browser = 'Chrome';
    else if (userAgent.includes('Firefox')) info.browser = 'Firefox';
    else if (userAgent.includes('Safari')) info.browser = 'Safari';
    else if (userAgent.includes('Edge')) info.browser = 'Edge';

    if (userAgent.includes('Windows')) info.os = 'Windows';
    else if (userAgent.includes('Mac')) info.os = 'macOS';
    else if (userAgent.includes('Linux')) info.os = 'Linux';
    else if (userAgent.includes('Android')) info.os = 'Android';
    else if (userAgent.includes('iOS')) info.os = 'iOS';

    info.mobile = /Mobile|Android|iPhone|iPad/.test(userAgent);

    if (info.mobile) {
      info.device = 'mobile';
    } else if (userAgent.includes('Tablet')) {
      info.device = 'tablet';
    } else {
      info.device = 'desktop';
    }
  } catch (error) {
    console.warn('Failed to parse user agent:', error);
  }

  return info;
}

// Categorize URLs for better analytics
function categorizeUrl(url: string) {
  try {
    const pathname = new URL(url).pathname;

    if (pathname === '/') return 'home';
    if (pathname.startsWith('/auth/')) return 'auth';
    if (pathname.startsWith('/dashboard/')) return 'dashboard';
    if (pathname.startsWith('/api/')) return 'api';
    if (
      pathname.startsWith('/configuration/') ||
      pathname.startsWith('/generators/') ||
      pathname.startsWith('/performance/') ||
      pathname.startsWith('/rate-limiting/')
    )
      return 'dev';

    return 'other';
  } catch {
    return 'unknown';
  }
}

// Export handlers
export const POST = handler;

// GET endpoint for retrieving aggregated performance data
export function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const timeRange = searchParams.get('timeRange') || '24h';
    const category = searchParams.get('category');

    // In production, you would query your database here
    // For now, return mock aggregated data
    const mockData = {
      summary: {
        totalSessions: 1247,
        avgLCP: 2150,
        avgFID: 85,
        avgCLS: 0.08,
        avgFCP: 1650,
        avgTTFB: 420,
        scoreDistribution: {
          good: 67,
          needsImprovement: 25,
          poor: 8,
        },
      },
      trends: {
        lcp: [2100, 2200, 2150, 2080, 2150],
        fid: [90, 85, 88, 82, 85],
        cls: [0.09, 0.08, 0.07, 0.08, 0.08],
      },
      topPages: [
        { url: '/', sessions: 456, avgLCP: 1980, score: 'good' },
        {
          url: '/dashboard',
          sessions: 234,
          avgLCP: 2340,
          score: 'needs-improvement',
        },
        { url: '/auth/login', sessions: 123, avgLCP: 1850, score: 'good' },
      ],
      deviceBreakdown: {
        desktop: { sessions: 623, avgLCP: 2050 },
        mobile: { sessions: 456, avgLCP: 2280 },
        tablet: { sessions: 168, avgLCP: 2190 },
      },
    };

    return NextResponse.json({
      success: true,
      data: mockData,
      timeRange,
      category,
    });
  } catch (error) {
    console.error('Failed to retrieve performance data:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve performance data' },
      { status: 500 },
    );
  }
}
