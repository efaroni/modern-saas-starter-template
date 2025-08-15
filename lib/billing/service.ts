import { MockBillingService } from './mock';
import { StripeBillingService } from './stripe';
import { type BillingService } from './types';

function createBillingService(): BillingService {
  // Use mock service in test environment or during build
  if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === undefined) {
    return new MockBillingService();
  }

  // Check if billing is enabled
  const billingEnabled = process.env.NEXT_PUBLIC_BILLING_ENABLED === 'true';
  if (!billingEnabled) {
    console.warn(
      'Billing disabled via NEXT_PUBLIC_BILLING_ENABLED, using mock service',
    );
    return new MockBillingService();
  }

  // Check for required environment variables
  const apiKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!apiKey || !webhookSecret) {
    console.warn('Stripe configuration missing, using mock billing service');
    return new MockBillingService();
  }

  return new StripeBillingService(apiKey, webhookSecret);
}

export const billingService = createBillingService();
