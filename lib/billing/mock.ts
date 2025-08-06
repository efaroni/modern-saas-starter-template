import type { BillingService, BillingEvent } from './types';

export class MockBillingService implements BillingService {
  private mockResults: {
    createCustomer?: { customerId: string };
    createCheckoutSession?: { url: string };
    createPortalSession?: { url: string };
    verifyWebhookSignature?: boolean;
    parseWebhookEvent?: BillingEvent;
  } = {};

  // Method to configure mock responses for testing
  setMockResults(results: typeof this.mockResults) {
    this.mockResults = { ...this.mockResults, ...results };
  }

  createCustomer(_email: string) {
    return Promise.resolve(
      this.mockResults.createCustomer || {
        customerId: `cus_mock_${Date.now()}`,
      },
    );
  }

  createCheckoutSession(params: {
    customerId: string;
    priceId: string;
    mode: 'subscription' | 'payment';
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }) {
    return Promise.resolve(
      this.mockResults.createCheckoutSession || {
        url: `https://checkout.stripe.com/mock/${Date.now()}?customer=${params.customerId}`,
      },
    );
  }

  createPortalSession(_customerId: string, _returnUrl: string) {
    return Promise.resolve(
      this.mockResults.createPortalSession || {
        url: `https://billing.stripe.com/mock/${Date.now()}`,
      },
    );
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    return this.mockResults.verifyWebhookSignature !== undefined
      ? this.mockResults.verifyWebhookSignature
      : signature === 'mock_valid_signature';
  }

  parseWebhookEvent(payload: string): BillingEvent {
    if (this.mockResults.parseWebhookEvent) {
      return this.mockResults.parseWebhookEvent;
    }

    const data = JSON.parse(payload);
    return {
      type: data.type || 'checkout.completed',
      data: data.data || { id: 'mock_event', customer: 'cus_mock' },
    };
  }
}
