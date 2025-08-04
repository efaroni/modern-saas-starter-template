/**
 * Billing access control functions
 * Queries Stripe directly for subscription status (lean approach)
 */

import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

// Initialize Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-06-30.basil',
  typescript: true,
});

/**
 * Check if user has an active subscription
 * Queries Stripe directly as the source of truth
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
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
    const subscriptions = await stripe.subscriptions.list({
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

/**
 * Check if user has any subscription (active, trialing, past_due)
 * Useful for features that work during grace periods
 */
export async function hasAnySubscription(userId: string): Promise<boolean> {
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
    const subscriptions = await stripe.subscriptions.list({
      customer: user.billingCustomerId,
      limit: 1,
    });

    return subscriptions.data.length > 0;
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return false;
  }
}

/**
 * Get subscription details from Stripe
 * Returns null if no subscription found
 */
export async function getSubscriptionDetails(userId: string): Promise<{
  status: string;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
} | null> {
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
    const subscriptions = await stripe.subscriptions.list({
      customer: user.billingCustomerId,
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return null;
    }

    const subscription = subscriptions.data[0];

    return {
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    };
  } catch (error) {
    console.error('Error getting subscription details:', error);
    return null;
  }
}
