import { NextResponse } from 'next/server';

import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

import { billingService } from '@/lib/billing/service';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    // Get user info
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
      columns: {
        id: true,
        email: true,
        billingCustomerId: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 },
      );
    }

    // Check subscription status
    const hasSubscription = await billingService.hasActiveSubscription(user.id);

    return NextResponse.json({
      success: true,
      data: {
        email: user.email,
        customerId: user.billingCustomerId,
        hasSubscription,
      },
    });
  } catch (error) {
    console.error('Error checking billing status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check billing status' },
      { status: 500 },
    );
  }
}
