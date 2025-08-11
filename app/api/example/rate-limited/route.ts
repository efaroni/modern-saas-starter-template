import { type NextRequest, NextResponse } from 'next/server';

import { moderateRateLimit, withRateLimit } from '@/lib/middleware/rate-limit';

// Apply rate limiting to this API route

// eslint-disable-next-line require-await
async function handler(req: NextRequest): Promise<NextResponse> {
  // Your API logic here
  return NextResponse.json({
    message: 'This endpoint is rate limited',
    timestamp: new Date().toISOString(),
    method: req.method,
  });
}

// Export rate-limited handlers
export const GET = withRateLimit(moderateRateLimit, handler);
export const POST = withRateLimit(moderateRateLimit, handler);
export const PUT = withRateLimit(moderateRateLimit, handler);
export const DELETE = withRateLimit(moderateRateLimit, handler);
