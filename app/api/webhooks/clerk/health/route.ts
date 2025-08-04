import { NextResponse } from 'next/server';

import { desc, count, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { users, webhookEvents } from '@/lib/db/schema';

export async function GET() {
  try {
    // Test database connectivity
    const userCount = await db.select({ count: count() }).from(users);
    const recentWebhooks = await db
      .select()
      .from(webhookEvents)
      .where(eq(webhookEvents.provider, 'clerk'))
      .orderBy(desc(webhookEvents.processedAt))
      .limit(5);

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        userCount: userCount[0]?.count || 0,
      },
      webhooks: {
        recentEvents: recentWebhooks.length,
        lastProcessed: recentWebhooks[0]?.processedAt || null,
      },
      environment: {
        hasWebhookSecret: !!process.env.CLERK_WEBHOOK_SECRET,
        nodeEnv: process.env.NODE_ENV,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// Simple POST endpoint to test webhook endpoint availability
export function POST() {
  return NextResponse.json({
    message: 'Webhook endpoint is reachable',
    timestamp: new Date().toISOString(),
    endpoint: '/api/webhooks/clerk',
  });
}
