import { headers } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

import { billingService } from '@/lib/billing/service';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const sig = headersList.get('stripe-signature');

  if (!sig) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 },
    );
  }

  // Verify signature
  if (!billingService.verifyWebhookSignature(body, sig)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    // Parse event
    const event = billingService.parseWebhookEvent(body);
    const data = event.data;

    // For now, just log events since we don't have the full database schema
    console.warn('Stripe webhook event received:', {
      type: event.type,
      data: data,
    });

    // TODO: Implement full webhook processing when database schema is ready
    // Check for idempotency
    // const existingEvent = await db.query.webhookEvents.findFirst({
    //   where: eq(webhookEvents.id, data.id),
    // });

    // if (existingEvent) {
    //   return NextResponse.json({ received: true });
    // }

    // Store event for idempotency
    // await db.insert(webhookEvents).values({
    //   id: data.id,
    //   provider: 'stripe',
    // });

    // Handle only the critical events
    switch (event.type) {
      case 'checkout.completed':
        console.warn('Processing checkout completion:', data);

        // TODO: Update user subscription/purchase status when schema is ready
        // if (data.mode === 'subscription') {
        //   await db
        //     .update(users)
        //     .set({
        //       subscriptionId: data.subscription,
        //       subscriptionStatus: 'active',
        //     })
        //     .where(eq(users.billingCustomerId, data.customer));
        // } else if (data.mode === 'payment') {
        //   await db
        //     .update(purchases)
        //     .set({
        //       status: 'completed',
        //       billingSessionId: data.id,
        //       amount: data.amount_total,
        //     })
        //     .where(eq(purchases.billingSessionId, data.id));
        // }
        break;

      case 'subscription.updated':
      case 'subscription.deleted':
        console.warn('Processing subscription change:', data);

        // TODO: Update user subscription status when schema is ready
        // await db
        //   .update(users)
        //   .set({
        //     subscriptionStatus: data.status,
        //     subscriptionCurrentPeriodEnd: new Date(
        //       data.current_period_end * 1000,
        //     ),
        //   })
        //   .where(eq(users.subscriptionId, data.id));
        break;

      case 'payment.succeeded':
        console.warn('Processing payment success:', data);
        break;

      default:
        console.warn('Unhandled webhook event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 },
    );
  }
}
