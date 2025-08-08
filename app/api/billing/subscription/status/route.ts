import { NextResponse, type NextRequest } from 'next/server';

import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

import {
  hasActiveSubscription,
  getSubscriptionDetails,
} from '@/lib/billing/access-control';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

export async function GET(_request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
      columns: {
        id: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 },
      );
    }

    // Query Stripe for subscription status
    const [hasAccess, subscriptionDetails] = await Promise.all([
      hasActiveSubscription(user.id),
      getSubscriptionDetails(user.id),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        hasAccess,
        subscription: subscriptionDetails,
      },
    });
  } catch (error) {
    console.error('Subscription status error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get subscription status' },
      { status: 500 },
    );
  }
}
