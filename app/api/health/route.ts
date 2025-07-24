import { NextResponse } from 'next/server';

// Simple health check endpoint that doesn't require database
// This is used by E2E tests to check if the server is ready
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || 'unknown',
  });
}
