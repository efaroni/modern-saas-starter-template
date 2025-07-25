import { type NextRequest, NextResponse } from 'next/server';

import { paymentService } from '@/lib/payments/factory';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('No stripe-signature header found');
      return NextResponse.json(
        { error: 'No signature header' },
        { status: 400 },
      );
    }

    // Handle the webhook with proper signature verification
    await paymentService.handleWebhook(body, signature);

    // Always return 200 OK for successful webhook processing
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);

    // Return 400 for signature verification errors
    if (error instanceof Error && error.message.includes('signature')) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Return 500 for processing errors but log them
    // Stripe will retry webhooks that don't return 2xx
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 },
    );
  }
}
