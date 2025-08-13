import { headers } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

import { eq } from 'drizzle-orm';

import { billingService } from '@/lib/billing/service';
import { db } from '@/lib/db';
import { users, webhookEvents } from '@/lib/db/schema';

// Simple retry wrapper for database operations
async function retryDbOperation<T>(
  operation: () => Promise<T>,
  retries = 3,
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, i)));
    }
  }
  throw new Error('Retry operation failed');
}

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
    // Parse raw event first to handle all Stripe event types
    const stripeEvent = JSON.parse(body);
    const data = stripeEvent.data?.object as Record<string, unknown>;

    if (!data) {
      console.warn('Invalid webhook event format: missing data.object');
      return NextResponse.json(
        { error: 'Invalid event format' },
        { status: 400 },
      );
    }

    console.warn('Stripe webhook event received:', {
      type: stripeEvent.type,
      id: data.id,
      customer: data.customer,
    });

    // Check for idempotency
    const existingEvent = await db.query.webhookEvents.findFirst({
      where: eq(webhookEvents.id, data.id as string),
    });

    if (existingEvent) {
      console.warn('Webhook already processed, skipping:', data.id);
      return NextResponse.json({ received: true });
    }

    // Store event for idempotency with retry
    await retryDbOperation(() =>
      db.insert(webhookEvents).values({
        id: data.id as string,
        provider: 'stripe',
        eventType: stripeEvent.type,
      }),
    );

    // Handle only the critical events (lean approach)
    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        console.warn('Processing checkout completion:', data.id);

        // Store billing customer ID using client_reference_id from checkout
        if (data.customer && data.client_reference_id) {
          await retryDbOperation(() =>
            db
              .update(users)
              .set({
                billingCustomerId: data.customer as string,
              })
              .where(eq(users.id, data.client_reference_id as string)),
          );

          console.warn(
            'Updated user billing customer ID:',
            data.client_reference_id,
            '->',
            data.customer,
          );
        }

        break;

      case 'customer.created':
        console.warn('Processing customer creation:', data.id);

        // Update user with billing customer ID using email
        if (data.email && typeof data.email === 'string') {
          await retryDbOperation(() =>
            db
              .update(users)
              .set({
                billingCustomerId: data.id as string,
              })
              .where(eq(users.email, data.email as string)),
          );

          console.warn(
            'Updated user billing customer ID:',
            data.email,
            '->',
            data.id,
          );
        } else {
          console.warn(
            'Customer created without email, skipping user update:',
            data.id,
          );
        }
        break;

      case 'customer.subscription.deleted':
        console.warn('Processing subscription deletion:', data.id);
        // Just log for audit - we query Stripe directly for access control
        console.warn('Subscription ended for customer:', data.customer);
        break;

      case 'payment_intent.payment_failed':
        console.warn('Processing payment failure:', data.id);
        // Payment failed emails are handled by Stripe
        console.warn('Payment failed for customer:', data.receipt_email);
        break;

      default:
        console.warn('Ignoring webhook event type:', stripeEvent.type);
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
