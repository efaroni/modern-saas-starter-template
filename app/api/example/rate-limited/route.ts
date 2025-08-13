import { type NextRequest, NextResponse } from 'next/server';

import { rateLimitPresets } from '@/lib/middleware/rate-limit';

// eslint-disable-next-line require-await
async function handler(req: NextRequest): Promise<NextResponse> {
  // Apply rate limiting to this API route
  const rateLimitResult = rateLimitPresets.strict(req);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retryAfter: rateLimitResult.retryAfter },
      { status: 429 },
    );
  }

  // Your API logic here
  return NextResponse.json({
    message: 'This endpoint is rate limited',
    timestamp: new Date().toISOString(),
    method: req.method,
  });
}

// Export handlers
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
