import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { auth } from '@/lib/auth/auth';
import { paymentService } from '@/lib/payments/factory';

const createCheckoutSchema = z.object({
  priceId: z.string().min(1, 'Price ID is required'),
  successUrl: z.string().url('Valid success URL is required'),
  cancelUrl: z.string().url('Valid cancel URL is required'),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const validated = createCheckoutSchema.parse(body);

    const result = await paymentService.createCheckoutSession({
      userId: session.user.id,
      priceId: validated.priceId,
      successUrl: validated.successUrl,
      cancelUrl: validated.cancelUrl,
    });

    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        sessionId: result.sessionId,
        url: result.url,
      },
    });
  } catch (error) {
    console.error('Checkout API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
