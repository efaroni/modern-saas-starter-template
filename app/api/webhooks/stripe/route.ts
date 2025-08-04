import { headers } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

import { billingService } from '@/lib/billing/service';
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
      case 'checkout.session.completed':
        console.warn('Processing checkout completion:', data);

        if (data.mode === 'subscription') {
          // TODO: Update user subscription status when schema is ready
          // For now, send subscription confirmation email if customer email is available
          if (data.customer_email) {
            await emailService.sendSubscriptionChangeEmail(
              data.customer_email,
              {
                user: { email: data.customer_email, name: null },
                previousPlan: 'Free',
                newPlan: 'Pro', // TODO: Get from price metadata
                effectiveDate: new Date(),
              },
            );
          }
        } else if (data.mode === 'payment') {
          // Send payment success email
          if (data.customer_email) {
            await emailService.sendPaymentSuccessEmail(data.customer_email, {
              user: { email: data.customer_email, name: null },
              amount: data.amount_total || 0,
              currency: data.currency || 'usd',
              invoiceUrl: data.invoice?.hosted_invoice_url,
            });
          }
        }
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

      case 'payment_intent.succeeded':
        console.warn('Processing payment success:', data);
        // Payment success email is handled in checkout.session.completed
        break;

      case 'payment_intent.payment_failed':
        console.warn('Processing payment failure:', data);
        // Send payment failed email
        if (data.receipt_email) {
          await emailService.sendPaymentFailedEmail(data.receipt_email, {
            user: { email: data.receipt_email, name: null },
            amount: data.amount || 0,
            currency: data.currency || 'usd',
            retryUrl: `${process.env.NEXTAUTH_URL}/dashboard/billing`,
          });
        }
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
