import { NextResponse, type NextRequest } from 'next/server';

import { eq } from 'drizzle-orm';

import { auth } from '@/lib/auth/auth';
import { billingService } from '@/lib/billing/service';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

export async function POST(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 },
      );
    }

    // For now, we'll create a customer since we don't have billingCustomerId field yet
    // In the future, check if user.billingCustomerId exists
    // if (!user.billingCustomerId) {
    //   return NextResponse.json(
    //     { success: false, error: 'No billing account found' },
    //     { status: 400 },
    //   );
    // }

    // Temporary: create customer for portal access
    const { customerId } = await billingService.createCustomer(user.email);

    const { url } = await billingService.createPortalSession(
      customerId,
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
