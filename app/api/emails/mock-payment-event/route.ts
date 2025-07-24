import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import {
  mockPaymentEventHandler,
  type MockPaymentEvent,
} from '@/lib/email/mock-payment-events';

const mockPaymentEventSchema = z.object({
  type: z.enum([
    'checkout.completed',
    'subscription.updated',
    'subscription.deleted',
  ]),
  userId: z.string(),
  userEmail: z.string().email(),
  userName: z.string().optional(),
  subscriptionId: z.string().optional(),
  planName: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        {
          success: false,
          error: 'Mock payment events only available in development',
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const event = mockPaymentEventSchema.parse(body);

    const result = await mockPaymentEventHandler.handleEvent(
      event as MockPaymentEvent,
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to handle mock payment event:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to handle mock payment event' },
      { status: 500 },
    );
  }
}
