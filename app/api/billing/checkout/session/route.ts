import { NextResponse, type NextRequest } from 'next/server';

import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { billingService } from '@/lib/billing/service';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

const createCheckoutSessionSchema = z.object({
  priceId: z.string().min(1),
  mode: z.enum(['subscription', 'payment']),
  metadata: z.record(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const validation = createCheckoutSessionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input',
          details: validation.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { priceId, mode, metadata } = validation.data;

    // Get user info with billing customer ID
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

    // Create Stripe customer if user doesn't have one
    let customerId = user.billingCustomerId;
    if (!customerId) {
      const { customerId: newCustomerId } = await billingService.createCustomer(
        user.email,
      );
      customerId = newCustomerId;

      // Store the customer ID in database
      await db
        .update(users)
        .set({ billingCustomerId: customerId })
        .where(eq(users.id, user.id));
    }

    const { url } = await billingService.createCheckoutSession({
      customerId,
      priceId,
      mode,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/billing-test?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/billing-test?cancelled=true`,
      metadata: {
        userId: user.id,
        ...metadata,
      },
    });

    return NextResponse.json({
      success: true,
      data: { checkoutUrl: url },
    });
  } catch (error) {
    console.error('Checkout session error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create checkout session' },
      { status: 500 },
    );
  }
}
