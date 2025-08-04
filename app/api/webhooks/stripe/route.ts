import { headers } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

import { eq } from 'drizzle-orm';

import { billingService } from '@/lib/billing/service';
import { db } from '@/lib/db';
import { users, webhookEvents } from '@/lib/db/schema';
import { emailService } from '@/lib/email/service';

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
    const data = event.data as Record<string, unknown>;

    console.warn('Stripe webhook event received:', {
      type: event.type,
      id: data.id,
      customer: data.customer,
    });

    // Check for idempotency
    const existingEvent = await db.query.webhookEvents.findFirst({
      where: eq(webhookEvents.id, data.id),
    });

    if (existingEvent) {
      console.warn('Webhook already processed, skipping:', data.id);
      return NextResponse.json({ received: true });
    }

    // Store event for idempotency
    await db.insert(webhookEvents).values({
      id: data.id,
      provider: 'stripe',
      eventType: event.type,
    });

    // Handle only the critical events (lean approach)
    switch (event.type) {
      case 'checkout.completed':
        console.warn('Processing checkout completion:', data.id);

        // Store billing customer ID if this is the first checkout
        if (data.customer && data.metadata?.userId) {
          await db
            .update(users)
            .set({
              billingCustomerId: data.customer,
            })
            .where(eq(users.id, data.metadata.userId));

          console.warn(
            'Updated user billing customer ID:',
            data.metadata.userId,
            '->',
            data.customer,
          );
        }

        // Send confirmation emails
        if (data.mode === 'subscription' && data.customer_email) {
          await emailService.sendSubscriptionChangeEmail(data.customer_email, {
            user: { email: data.customer_email, name: null },
            previousPlan: 'Free',
            newPlan: 'Pro', // TODO: Get from price metadata
            effectiveDate: new Date(),
          });
        } else if (data.mode === 'payment' && data.customer_email) {
          await emailService.sendPaymentSuccessEmail(data.customer_email, {
            user: { email: data.customer_email, name: null },
            amount: data.amount_total || 0,
            currency: data.currency || 'usd',
            invoiceUrl: data.invoice?.hosted_invoice_url,
          });
        }
        break;

      case 'subscription.deleted':
        console.warn('Processing subscription deletion:', data.id);
        // Just log for audit - we query Stripe directly for access control
        console.warn('Subscription ended for customer:', data.customer);
        break;

      case 'payment_intent.payment_failed':
        console.warn('Processing payment failure:', data.id);
        // Send payment failed email
        if (data.receipt_email) {
          await emailService.sendPaymentFailedEmail(data.receipt_email, {
            user: { email: data.receipt_email, name: null },
            amount: data.amount || 0,
            currency: data.currency || 'usd',
            retryUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
          });
        }
        break;

      default:
        console.warn('Ignoring webhook event type:', event.type);
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
