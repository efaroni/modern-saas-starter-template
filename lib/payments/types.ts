import type { Plan, Subscription } from '@/lib/db/schema';

export interface CreateCheckoutSessionRequest {
  userId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CreateCheckoutSessionResponse {
  sessionId?: string;
  url?: string;
  error?: string;
}

export interface CreatePortalSessionRequest {
  customerId: string;
  returnUrl: string;
}

export interface CreatePortalSessionResponse {
  url?: string;
  error?: string;
}

export interface SubscriptionStatus {
  id: string;
  status: string;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  planName?: string;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
  created: number;
}

export interface Customer {
  id: string;
  email: string;
  stripeCustomerId?: string;
}

// Mock payment event interface for Section 4 integration
export interface MockPaymentEvent {
  type: 'checkout.completed' | 'subscription.updated' | 'subscription.deleted';
  userId: string;
  subscriptionId?: string;
  planName?: string;
}

export interface PaymentProvider {
  // Customer management
  createCustomer(email: string, userId: string): Promise<string>;
  getOrCreateCustomer(userId: string, email: string): Promise<string>;

  // Checkout and billing portal
  createCheckoutSession(
    params: CreateCheckoutSessionRequest,
  ): Promise<CreateCheckoutSessionResponse>;
  createPortalSession(
    params: CreatePortalSessionRequest,
  ): Promise<CreatePortalSessionResponse>;

  // Subscription management
  getSubscriptionStatus(
    subscriptionId: string,
  ): Promise<SubscriptionStatus | null>;
  cancelSubscription(subscriptionId: string): Promise<boolean>;

  // Webhook handling
  constructWebhookEvent(
    payload: string,
    signature: string,
  ): Promise<WebhookEvent>;
  handleWebhookEvent(event: WebhookEvent): Promise<void>;
}

export interface PaymentService {
  // Subscription operations
  createCheckoutSession(
    params: CreateCheckoutSessionRequest,
  ): Promise<CreateCheckoutSessionResponse>;
  createPortalSession(
    customerId: string,
    returnUrl: string,
  ): Promise<CreatePortalSessionResponse>;

  // Customer operations
  getOrCreateCustomer(userId: string, email: string): Promise<string>;

  // Subscription status
  getUserSubscription(userId: string): Promise<Subscription | null>;
  syncSubscriptionStatus(subscriptionId: string): Promise<void>;
  isSubscriptionActive(userId: string): Promise<boolean>;

  // Plan operations
  getAvailablePlans(): Promise<Plan[]>;
  getPlanFeatures(planId: string): Promise<Record<string, boolean>>;

  // Feature access
  hasFeature(userId: string, featureName: string): Promise<boolean>;

  // Webhook handling
  handleWebhook(payload: string, signature: string): Promise<void>;
}

export type PaymentProviderType = 'stripe' | 'mock';

export interface PaymentConfig {
  provider: PaymentProviderType;
  stripe?: {
    secretKey: string;
    webhookSecret: string;
    publishableKey: string;
  };
}
