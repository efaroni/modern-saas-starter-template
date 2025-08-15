import type {
  BillingService,
  BillingEvent,
  SubscriptionDetails,
  CustomerInfo,
} from './types';

export class MockBillingService implements BillingService {
  private mockResults: {
    createCustomer?: { customerId: string };
    createCheckoutSession?: { url: string };
    createPortalSession?: { url: string };
    verifyWebhookSignature?: boolean;
    parseWebhookEvent?: BillingEvent;
    hasActiveSubscription?: boolean;
    hasAnySubscription?: boolean;
    getSubscriptionDetails?: SubscriptionDetails | null;
    verifyCustomer?: CustomerInfo | null;
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

  hasActiveSubscription(_userId: string): Promise<boolean> {
    return Promise.resolve(this.mockResults.hasActiveSubscription ?? false);
  }

  hasAnySubscription(_userId: string): Promise<boolean> {
    return Promise.resolve(this.mockResults.hasAnySubscription ?? false);
  }

  getSubscriptionDetails(_userId: string): Promise<SubscriptionDetails | null> {
    if (this.mockResults.getSubscriptionDetails !== undefined) {
      return Promise.resolve(this.mockResults.getSubscriptionDetails);
    }

    // Default mock subscription details for testing
    return Promise.resolve({
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      cancelAtPeriodEnd: false,
    });
  }

  verifyCustomer(customerId: string): Promise<CustomerInfo | null> {
    if (this.mockResults.verifyCustomer !== undefined) {
      return Promise.resolve(this.mockResults.verifyCustomer);
    }

    // Default mock customer info for testing
    return Promise.resolve({
      id: customerId,
      email: 'test@example.com',
      deleted: false,
    });
  }
}
