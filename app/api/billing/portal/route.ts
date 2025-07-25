import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { auth } from '@/lib/auth/auth';
import { paymentService } from '@/lib/payments/factory';

const createPortalSchema = z.object({
  returnUrl: z.string().url('Valid return URL is required'),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const validated = createPortalSchema.parse(body);

    // Get or create customer
    const customerId = await paymentService.getOrCreateCustomer(
      session.user.id,
      session.user.email,
    );

    const result = await paymentService.createPortalSession(
      customerId,
      validated.returnUrl,
    );

    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        url: result.url,
      },
    });
  } catch (error) {
    console.error('Portal API error:', error);

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
