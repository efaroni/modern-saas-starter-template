import { MockBillingService } from './mock';
import { StripeBillingService } from './stripe';
import { type BillingService } from './types';

function createBillingService(): BillingService {
  // Use mock service in test environment
  if (process.env.NODE_ENV === 'test') {
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
