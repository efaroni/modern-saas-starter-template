export interface BillingService {
  createCustomer(email: string): Promise<{ customerId: string }>;

  createCheckoutSession(params: {
    email: string;
    userId: string;
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
}

export interface BillingEvent {
  type:
    | 'checkout.completed'
    | 'subscription.updated'
    | 'subscription.deleted'
    | 'payment.succeeded';
  data: unknown; // Provider-specific data
}

export interface BillingResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
