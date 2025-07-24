import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { subscriptions, plans } from '@/lib/db/schema';

import type {
  PaymentService,
  PaymentProvider,
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
  CreatePortalSessionResponse,
  Subscription,
  Plan,
} from './types';

export class PaymentServiceImpl implements PaymentService {
  constructor(private provider: PaymentProvider) {}

  async createCheckoutSession(
    params: CreateCheckoutSessionRequest,
  ): Promise<CreateCheckoutSessionResponse> {
    return this.provider.createCheckoutSession(params);
  }

  async createPortalSession(
    customerId: string,
    returnUrl: string,
  ): Promise<CreatePortalSessionResponse> {
    return this.provider.createPortalSession({
      customerId,
      returnUrl,
    });
  }

  async getOrCreateCustomer(userId: string, email: string): Promise<string> {
    return this.provider.getOrCreateCustomer(userId, email);
  }

  async getUserSubscription(userId: string): Promise<Subscription | null> {
    try {
      const subscription = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, userId),
      });

      return subscription || null;
    } catch (error) {
      console.error('Error getting user subscription:', error);
      return null;
    }
  }

  async syncSubscriptionStatus(subscriptionId: string): Promise<void> {
    try {
      const status = await this.provider.getSubscriptionStatus(subscriptionId);
      if (!status) {
        console.error(`Subscription ${subscriptionId} not found`);
        return;
      }

      await db
        .update(subscriptions)
        .set({
          status: status.status,
          currentPeriodEnd: status.currentPeriodEnd,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));

      console.warn(
        `Synced subscription ${subscriptionId} status: ${status.status}`,
      );
    } catch (error) {
      console.error('Error syncing subscription status:', error);
      throw error;
    }
  }

  async getAvailablePlans(): Promise<Plan[]> {
    try {
      const allPlans = await db.query.plans.findMany({
        orderBy: (plans, { asc }) => [asc(plans.name)],
      });

      return allPlans;
    } catch (error) {
      console.error('Error getting available plans:', error);
      return [];
    }
  }

  async getPlanFeatures(planId: string): Promise<Record<string, boolean>> {
    try {
      const plan = await db.query.plans.findFirst({
        where: eq(plans.id, planId),
      });

      return plan?.features || {};
    } catch (error) {
      console.error('Error getting plan features:', error);
      return {};
    }
  }

  async handleWebhook(payload: string, signature: string): Promise<void> {
    try {
      const event = await this.provider.constructWebhookEvent(
        payload,
        signature,
      );
      await this.provider.handleWebhookEvent(event);
    } catch (error) {
      console.error('Error handling webhook:', error);
      throw error;
    }
  }

  // Utility methods for feature access control
  async hasFeature(userId: string, _featureName: string): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription(userId);
      if (!subscription || subscription.status !== 'active') {
        return false;
      }

      // Get the subscription's plan features (this would need plan lookup in real implementation)
      // For now, return true for active subscriptions
      return true;
    } catch (error) {
      console.error('Error checking feature access:', error);
      return false;
    }
  }

  async isSubscriptionActive(userId: string): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription(userId);
      return (
        subscription?.status === 'active' &&
        subscription.currentPeriodEnd > new Date()
      );
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  }
}
