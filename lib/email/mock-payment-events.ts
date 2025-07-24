import { emailService } from './service';

export interface MockPaymentEvent {
  type: 'checkout.completed' | 'subscription.updated' | 'subscription.deleted';
  userId: string;
  userEmail: string;
  userName?: string;
  subscriptionId?: string;
  planName?: string;
}

export class MockPaymentEventHandler {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  async handleEvent(
    event: MockPaymentEvent,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      switch (event.type) {
        case 'checkout.completed':
          return await this.handleCheckoutCompleted(event);
        case 'subscription.updated':
          // For now, we don't send emails on subscription updates
          // This can be expanded based on what updates we want to notify about
          return { success: true };
        case 'subscription.deleted':
          return await this.handleSubscriptionDeleted(event);
        default:
          return { success: false, error: 'Unknown event type' };
      }
    } catch (error) {
      console.error('Failed to handle payment event:', error);
      return { success: false, error: 'Failed to handle payment event' };
    }
  }

  private async handleCheckoutCompleted(
    event: MockPaymentEvent,
  ): Promise<{ success: boolean; error?: string }> {
    if (!event.planName) {
      return {
        success: false,
        error: 'Plan name required for checkout completed event',
      };
    }

    return await emailService.sendSubscriptionConfirmationEmail(
      event.userEmail,
      {
        user: {
          email: event.userEmail,
          name: event.userName,
        },
        planName: event.planName,
        dashboardUrl: `${this.baseUrl}/dashboard`,
      },
    );
  }

  private async handleSubscriptionDeleted(
    event: MockPaymentEvent,
  ): Promise<{ success: boolean; error?: string }> {
    if (!event.planName) {
      return {
        success: false,
        error: 'Plan name required for subscription deleted event',
      };
    }

    return await emailService.sendSubscriptionEndingEmail(event.userEmail, {
      user: {
        email: event.userEmail,
        name: event.userName,
      },
      planName: event.planName,
      reason: 'cancelled', // Default to cancelled for mock events
      dashboardUrl: `${this.baseUrl}/dashboard`,
    });
  }
}

// Export a default instance
export const mockPaymentEventHandler = new MockPaymentEventHandler();
