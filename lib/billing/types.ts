export interface BillingService {
  createCustomer(email: string): Promise<{ customerId: string }>;

  createCheckoutSession(params: {
    customerId: string;
    priceId: string;
    mode: 'subscription' | 'payment';
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }): Promise<{ url: string }>;

  createPortalSession(
    customerId: string,
    returnUrl: string,
  ): Promise<{ url: string }>;

  verifyWebhookSignature(payload: string, signature: string): boolean;
  parseWebhookEvent(payload: string): BillingEvent;

  // Access control methods
  hasActiveSubscription(userId: string): Promise<boolean>;
  hasAnySubscription(userId: string): Promise<boolean>;
  getSubscriptionDetails(userId: string): Promise<SubscriptionDetails | null>;
  verifyCustomer(customerId: string): Promise<CustomerInfo | null>;
}

export interface BillingEvent {
  type:
    | 'checkout.completed'
    | 'customer.created'
    | 'subscription.updated'
    | 'subscription.deleted'
    | 'payment.succeeded'
    | 'payment_intent.payment_failed';
  data: unknown; // Provider-specific data
}

export interface BillingResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SubscriptionDetails {
  status: string;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

export interface CustomerInfo {
  id: string;
  email: string | null;
  deleted: boolean;
}
