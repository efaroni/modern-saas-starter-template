import { NextResponse, type NextRequest } from 'next/server';

import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

import { billingService } from '@/lib/billing/service';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

export async function POST(_request: NextRequest) {
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

    // Check if user has billing customer ID
    if (!user.billingCustomerId) {
      return NextResponse.json(
        { success: false, error: 'User billing not set up' },
        { status: 400 },
      );
    }

    const { url } = await billingService.createPortalSession(
      user.billingCustomerId,
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`,
    );

    return NextResponse.json({
      success: true,
      data: { portalUrl: url },
    });
  } catch (error) {
    console.error('Portal session error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create portal session' },
      { status: 500 },
    );
  }
}
