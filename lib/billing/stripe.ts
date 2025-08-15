import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

import type {
  BillingService,
  BillingEvent,
  SubscriptionDetails,
  CustomerInfo,
} from './types';

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

  async hasActiveSubscription(userId: string): Promise<boolean> {
    try {
      // Get user with billing customer ID
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          billingCustomerId: true,
        },
      });

      if (!user?.billingCustomerId) {
        return false;
      }

      // Query Stripe for active subscriptions
      const subscriptions = await this.stripe.subscriptions.list({
        customer: user.billingCustomerId,
        status: 'active',
        limit: 1,
      });

      return subscriptions.data.length > 0;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  }

  async hasAnySubscription(userId: string): Promise<boolean> {
    try {
      // Get user with billing customer ID
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          billingCustomerId: true,
        },
      });

      if (!user?.billingCustomerId) {
        return false;
      }

      // Query Stripe for any subscriptions (not just active)
      const subscriptions = await this.stripe.subscriptions.list({
        customer: user.billingCustomerId,
        limit: 1,
      });

      return subscriptions.data.length > 0;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  }

  async getSubscriptionDetails(
    userId: string,
  ): Promise<SubscriptionDetails | null> {
    try {
      // Get user with billing customer ID
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          billingCustomerId: true,
        },
      });

      if (!user?.billingCustomerId) {
        return null;
      }

      // Query Stripe for subscriptions
      const subscriptions = await this.stripe.subscriptions.list({
        customer: user.billingCustomerId,
        limit: 1,
      });

      if (subscriptions.data.length === 0) {
        return null;
      }

      const subscription = subscriptions.data[0];

      return {
        status: subscription.status,
        currentPeriodEnd: new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000),
        cancelAtPeriodEnd: (subscription as unknown as { cancel_at_period_end: boolean }).cancel_at_period_end,
      };
    } catch (error) {
      console.error('Error getting subscription details:', error);
      return null;
    }
  }

  async verifyCustomer(customerId: string): Promise<CustomerInfo | null> {
    try {
      console.warn('Verifying Stripe customer exists:', customerId);

      const customer = await this.stripe.customers.retrieve(customerId);

      // Check if customer is deleted
      if ('deleted' in customer && customer.deleted) {
        console.warn('Stripe customer is deleted:', customerId);
        return {
          id: customerId,
          email: null,
          deleted: true,
        };
      }

      const customerData = customer as Stripe.Customer;
      console.warn('Stripe customer verified successfully:', {
        id: customerData.id,
        email: customerData.email,
        created: new Date(customerData.created * 1000).toISOString(),
      });

      return {
        id: customerData.id,
        email: customerData.email,
        deleted: false,
      };
    } catch (error) {
      console.error('Error verifying Stripe customer:', error);

      if (error instanceof Stripe.errors.StripeError) {
        console.error('Stripe customer verification error:', {
          type: error.type,
          code: error.code,
          message: error.message,
          customerId,
        });

        // Customer not found is a common case
        if (error.code === 'resource_missing') {
          console.warn('Stripe customer not found:', customerId);
          return null;
        }
      }

      return null;
    }
  }
}
