import { type NextRequest, NextResponse } from 'next/server';

import { paymentService } from '@/lib/payments/factory';

export async function GET(_request: NextRequest) {
  try {
    const plans = await paymentService.getAvailablePlans();

    return NextResponse.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    console.error('Get plans API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
