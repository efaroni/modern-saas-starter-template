import Stripe from 'stripe';

import type { BillingService, BillingEvent } from './types';

export class StripeBillingService implements BillingService {
  private stripe: Stripe;
  private webhookSecret: string;

  constructor(apiKey: string, webhookSecret: string) {
    this.stripe = new Stripe(apiKey, {
      apiVersion: '2025-06-30.basil',
      typescript: true,
    });
    this.webhookSecret = webhookSecret;
  }

  async createCustomer(email: string) {
    const customer = await this.stripe.customers.create({ email });
    return { customerId: customer.id };
  }

  async createCheckoutSession(params: {
    customerId: string;
    priceId: string;
    mode: 'subscription' | 'payment';
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }) {
    const session = await this.stripe.checkout.sessions.create({
      customer: params.customerId,
      client_reference_id: params.metadata?.userId, // For webhook processing
      mode: params.mode,
      line_items: [
        {
          price: params.priceId,
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata,
      payment_method_types: ['card'],
    });

    if (!session.url) {
      throw new Error('Stripe checkout session creation failed');
    }
    return { url: session.url };
  }

  async createPortalSession(customerId: string, returnUrl: string) {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return { url: session.url };
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret,
      );
      return true;
    } catch {
      return false;
    }
  }

  parseWebhookEvent(payload: string): BillingEvent {
    const stripeEvent = JSON.parse(payload);

    // Map Stripe events to generic events
    const eventMap: Record<string, BillingEvent['type']> = {
      'checkout.session.completed': 'checkout.completed',
      'customer.subscription.updated': 'subscription.updated',
      'customer.subscription.deleted': 'subscription.deleted',
      'payment_intent.succeeded': 'payment.succeeded',
    };

    return {
      type: eventMap[stripeEvent.type] || stripeEvent.type,
      data: stripeEvent.data.object,
    };
  }
}
