import type {
  PaymentProvider,
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
  CreatePortalSessionRequest,
  CreatePortalSessionResponse,
  SubscriptionStatus,
  WebhookEvent,
} from '../types';

export class MockPaymentProvider implements PaymentProvider {
  async createCustomer(email: string, userId: string): Promise<string> {
    // Return a mock customer ID
    return `mock_cus_${userId.substring(0, 8)}`;
  }

  async getOrCreateCustomer(userId: string, email: string): Promise<string> {
    // Return a mock customer ID
    return `mock_cus_${userId.substring(0, 8)}`;
  }

  async createCheckoutSession(
    params: CreateCheckoutSessionRequest,
  ): Promise<CreateCheckoutSessionResponse> {
    // Simulate checkout session creation
    const sessionId = `mock_cs_${Date.now()}`;

    // Return mock checkout URL
    return {
      sessionId,
      url: `${params.successUrl}?session_id=${sessionId}&mock=true`,
    };
  }

  async createPortalSession(
    params: CreatePortalSessionRequest,
  ): Promise<CreatePortalSessionResponse> {
    // Return mock portal URL
    return {
      url: `${params.returnUrl}?mock_portal=true`,
    };
  }

  async getSubscriptionStatus(
    subscriptionId: string,
  ): Promise<SubscriptionStatus | null> {
    // Return mock subscription status
    return {
      id: subscriptionId,
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      cancelAtPeriodEnd: false,
      planName: 'Mock Pro Plan',
    };
  }

  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    // Mock successful cancellation
    console.log(`Mock: Cancelled subscription ${subscriptionId}`);
    return true;
  }

  async constructWebhookEvent(
    payload: string,
    signature: string,
  ): Promise<WebhookEvent> {
    // Parse the mock payload
    try {
      const data = JSON.parse(payload);
      return {
        id: `mock_evt_${Date.now()}`,
        type: data.type || 'customer.subscription.updated',
        data: {
          object: data.data?.object || {},
        },
        created: Math.floor(Date.now() / 1000),
      };
    } catch (error) {
      throw new Error('Invalid webhook payload');
    }
  }

  async handleWebhookEvent(event: WebhookEvent): Promise<void> {
    console.log(
      `Mock webhook handler: Processing event ${event.type} (${event.id})`,
    );

    switch (event.type) {
      case 'checkout.session.completed':
        console.log('Mock: Checkout session completed');
        break;
      case 'customer.subscription.updated':
        console.log('Mock: Subscription updated');
        break;
      case 'customer.subscription.deleted':
        console.log('Mock: Subscription deleted');
        break;
      default:
        console.log(`Mock: Unhandled event type: ${event.type}`);
    }
  }
}
