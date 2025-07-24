import { type NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth/auth';
import { paymentService } from '@/lib/payments/factory';

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const subscription = await paymentService.getUserSubscription(
      session.user.id,
    );

    return NextResponse.json({
      success: true,
      data: {
        subscription,
        isActive:
          subscription?.status === 'active' &&
          subscription.currentPeriodEnd > new Date(),
      },
    });
  } catch (error) {
    console.error('Get subscription API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
