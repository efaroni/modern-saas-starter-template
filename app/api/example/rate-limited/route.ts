import { type NextRequest, NextResponse } from 'next/server';

import { rateLimitPresets } from '@/lib/middleware/rate-limit';

// Apply rate limiting to this API route
const withRateLimit = rateLimitPresets.api('api');

function handler(req: NextRequest) {
  // Your API logic here
  return NextResponse.json({
    message: 'This endpoint is rate limited',
    timestamp: new Date().toISOString(),
    method: req.method,
  });
}

// Export rate-limited handlers
export const GET = withRateLimit(handler);
export const POST = withRateLimit(handler);
export const PUT = withRateLimit(handler);
export const DELETE = withRateLimit(handler);
