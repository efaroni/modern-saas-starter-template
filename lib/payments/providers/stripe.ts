import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

import { db } from '@/lib/db';
import { users, subscriptions } from '@/lib/db/schema';

import type {
  PaymentProvider,
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
  CreatePortalSessionRequest,
  CreatePortalSessionResponse,
  SubscriptionStatus,
  WebhookEvent,
} from '../types';

export class StripePaymentProvider implements PaymentProvider {
  private stripe: Stripe;

  constructor(
    secretKey: string,
    private webhookSecret: string,
  ) {
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-06-30.basil',
    });
  }

  async createCustomer(email: string, userId: string): Promise<string> {
    try {
      const customer = await this.stripe.customers.create({
        email,
        metadata: { userId },
      });

      // Update user record with Stripe customer ID
      await db
        .update(users)
        .set({ stripeCustomerId: customer.id })
        .where(eq(users.id, userId));

      return customer.id;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw new Error('Failed to create customer');
    }
  }

  async getOrCreateCustomer(userId: string, email: string): Promise<string> {
    try {
      // Check if user already has a customer ID
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (user?.stripeCustomerId) {
        return user.stripeCustomerId;
      }

      // Create new customer
      return await this.createCustomer(email, userId);
    } catch (error) {
      console.error('Error getting or creating customer:', error);
      throw new Error('Failed to get or create customer');
    }
  }

  async createCheckoutSession(
    params: CreateCheckoutSessionRequest,
  ): Promise<CreateCheckoutSessionResponse> {
    try {
      const customerId = await this.getOrCreateCustomer(params.userId, '');

      const session = await this.stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: params.priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: {
          userId: params.userId,
        },
      });

      return {
        sessionId: session.id,
        url: session.url || undefined,
      };
    } catch (error) {
      console.error('Error creating checkout session:', error);
      return {
        error: 'Failed to create checkout session',
      };
    }
  }

  async createPortalSession(
    params: CreatePortalSessionRequest,
  ): Promise<CreatePortalSessionResponse> {
    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: params.customerId,
        return_url: params.returnUrl,
      });

      return {
        url: session.url,
      };
    } catch (error) {
      console.error('Error creating portal session:', error);
      return {
        error: 'Failed to create portal session',
      };
    }
  }

  async getSubscriptionStatus(
    subscriptionId: string,
  ): Promise<SubscriptionStatus | null> {
    try {
      const subscription =
        await this.stripe.subscriptions.retrieve(subscriptionId);

      return {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      };
    } catch (error) {
      console.error('Error getting subscription status:', error);
      return null;
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    try {
      await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
      return true;
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      return false;
    }
  }

  async constructWebhookEvent(
    payload: string,
    signature: string,
  ): Promise<WebhookEvent> {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret,
      );

      return {
        id: event.id,
        type: event.type,
        data: event.data,
        created: event.created,
      };
    } catch (error) {
      console.error('Error constructing webhook event:', error);
      throw new Error('Invalid webhook signature');
    }
  }

  async handleWebhookEvent(event: WebhookEvent): Promise<void> {
    console.log(`Processing Stripe webhook: ${event.type} (${event.id})`);

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event);
          break;
        default:
          console.log(`Unhandled webhook event type: ${event.type}`);
      }
    } catch (error) {
      console.error(`Error handling webhook event ${event.type}:`, error);
      throw error;
    }
  }

  private async handleCheckoutCompleted(event: WebhookEvent): Promise<void> {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;

    if (!userId) {
      console.error('No userId found in checkout session metadata');
      return;
    }

    if (session.mode === 'subscription' && session.subscription) {
      const subscriptionId =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription.id;

      // Get subscription details from Stripe
      const subscription =
        await this.stripe.subscriptions.retrieve(subscriptionId);

      // Create or update subscription record
      await db
        .insert(subscriptions)
        .values({
          userId,
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        })
        .onConflictDoUpdate({
          target: subscriptions.stripeSubscriptionId,
          set: {
            status: subscription.status,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            updatedAt: new Date(),
          },
        });

      console.log(`Created/updated subscription for user ${userId}`);
    }
  }

  private async handleSubscriptionUpdated(event: WebhookEvent): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;

    await db
      .update(subscriptions)
      .set({
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

    console.log(`Updated subscription ${subscription.id}`);
  }

  private async handleSubscriptionDeleted(event: WebhookEvent): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;

    await db
      .update(subscriptions)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

    console.log(`Marked subscription ${subscription.id} as cancelled`);
  }
}
