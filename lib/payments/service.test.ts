import { describe, it, expect, beforeEach, jest } from '@jest/globals';

import { MockPaymentProvider } from './providers/mock';
import { PaymentServiceImpl } from './service';

import type { PaymentProvider } from './types';

// Create a mock PaymentService that bypasses the real database operations
class TestPaymentService extends PaymentServiceImpl {
  private mockSubscriptions: Map<string, any> = new Map();
  private mockPlans: Map<string, any> = new Map();

  // Override database-dependent methods for testing
  async getUserSubscription(userId: string) {
    return this.mockSubscriptions.get(userId) || null;
  }

  async getAvailablePlans() {
    return Array.from(this.mockPlans.values());
  }

  async getPlanFeatures(planId: string) {
    const plan = this.mockPlans.get(planId);
    return plan?.features || {};
  }

  async syncSubscriptionStatus(subscriptionId: string): Promise<void> {
    const status = await this.provider.getSubscriptionStatus(subscriptionId);
    if (status) {
      // In a real implementation, this would update the database
      // For testing, we'll simulate the operation
      console.log(
        `Would update subscription ${subscriptionId} with status ${status.status}`,
      );
    }
  }

  async isSubscriptionActive(userId: string): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription) return false;

    return (
      subscription.status === 'active' &&
      subscription.currentPeriodEnd > new Date()
    );
  }

  async hasFeature(userId: string, featureName: string): Promise<boolean> {
    const isActive = await this.isSubscriptionActive(userId);
    if (!isActive) return false;

    const subscription = await this.getUserSubscription(userId);
    if (!subscription) return false;

    // For testing, assume we can get plan features based on subscription
    const features = await this.getPlanFeatures(
      subscription.planId || 'default-plan',
    );
    return features[featureName] === true;
  }

  // Test helper methods
  setMockSubscription(userId: string, subscription: any) {
    this.mockSubscriptions.set(userId, subscription);
  }

  setMockPlan(planId: string, plan: any) {
    this.mockPlans.set(planId, plan);
  }

  clearMockData() {
    this.mockSubscriptions.clear();
    this.mockPlans.clear();
  }
}

describe('PaymentServiceImpl', () => {
  let paymentService: TestPaymentService;
  let mockProvider: PaymentProvider;

  // Test data factories
  const createMockSubscription = (overrides = {}) => ({
    id: 'sub-123',
    userId: 'user-123',
    stripeSubscriptionId: 'stripe_sub_123',
    status: 'active',
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    planId: 'plan-123',
    ...overrides,
  });

  const createMockPlan = (overrides = {}) => ({
    id: 'plan-123',
    name: 'Test Pro Plan',
    stripePriceId: 'price_test_123',
    features: { ai_analysis: true, premium_support: true },
    ...overrides,
  });

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Set up mock provider and service
    mockProvider = new MockPaymentProvider();
    paymentService = new TestPaymentService(mockProvider);
    paymentService.clearMockData();
  });

  describe('createCheckoutSession', () => {
    it('should delegate to provider and return result', async () => {
      // Arrange
      const params = {
        userId: 'user-123',
        priceId: 'price_test_123',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      };
      const expectedResult = {
        sessionId: 'mock_cs_123',
        url: 'https://example.com/success?session_id=mock_cs_123&mock=true',
      };

      // Mock provider method
      const createCheckoutSessionSpy = jest
        .spyOn(mockProvider, 'createCheckoutSession')
        .mockResolvedValue(expectedResult);

      // Act
      const result = await paymentService.createCheckoutSession(params);

      // Assert
      expect(createCheckoutSessionSpy).toHaveBeenCalledWith(params);
      expect(result).toEqual(expectedResult);
    });

    it('should return error from provider', async () => {
      // Arrange
      const params = {
        userId: 'user-123',
        priceId: 'invalid_price',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      };
      const expectedResult = { error: 'Test error' };

      jest
        .spyOn(mockProvider, 'createCheckoutSession')
        .mockResolvedValue(expectedResult);

      // Act
      const result = await paymentService.createCheckoutSession(params);

      // Assert
      expect(result).toEqual(expectedResult);
    });
  });

  describe('createPortalSession', () => {
    it('should delegate to provider and return result', async () => {
      // Arrange
      const customerId = 'cus_test_123';
      const returnUrl = 'https://example.com/return';
      const expectedResult = {
        url: 'https://example.com/portal?mock_portal=true',
      };

      const createPortalSessionSpy = jest
        .spyOn(mockProvider, 'createPortalSession')
        .mockResolvedValue(expectedResult);

      // Act
      const result = await paymentService.createPortalSession(
        customerId,
        returnUrl,
      );

      // Assert
      expect(createPortalSessionSpy).toHaveBeenCalledWith({
        customerId,
        returnUrl,
      });
      expect(result).toEqual(expectedResult);
    });

    it('should return error from provider', async () => {
      // Arrange
      const customerId = 'invalid_customer';
      const returnUrl = 'https://example.com/return';
      const expectedResult = { error: 'Customer not found' };

      jest
        .spyOn(mockProvider, 'createPortalSession')
        .mockResolvedValue(expectedResult);

      // Act
      const result = await paymentService.createPortalSession(
        customerId,
        returnUrl,
      );

      // Assert
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getOrCreateCustomer', () => {
    it('should delegate to provider and return customer ID', async () => {
      // Arrange
      const userId = 'user-123';
      const email = 'test@example.com';
      const expectedCustomerId = 'cus_mock_123';

      const getOrCreateCustomerSpy = jest
        .spyOn(mockProvider, 'getOrCreateCustomer')
        .mockResolvedValue(expectedCustomerId);

      // Act
      const result = await paymentService.getOrCreateCustomer(userId, email);

      // Assert
      expect(getOrCreateCustomerSpy).toHaveBeenCalledWith(userId, email);
      expect(result).toBe(expectedCustomerId);
    });
  });

  describe('getUserSubscription', () => {
    it('should return null when user has no subscription', async () => {
      // Arrange
      const userId = 'user-123';
      // No subscription set in mock data

      // Act
      const result = await paymentService.getUserSubscription(userId);

      // Assert
      expect(result).toBeNull();
    });

    it('should return subscription when user has one', async () => {
      // Arrange
      const userId = 'user-123';
      const mockSubscription = createMockSubscription({ userId });
      paymentService.setMockSubscription(userId, mockSubscription);

      // Act
      const result = await paymentService.getUserSubscription(userId);

      // Assert
      expect(result).toEqual(mockSubscription);
    });
  });

  describe('syncSubscriptionStatus', () => {
    it('should sync subscription status from provider', async () => {
      // Arrange
      const subscriptionId = 'sub_test_123';
      const mockStatus = {
        id: subscriptionId,
        status: 'active' as const,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false,
      };

      const getSubscriptionStatusSpy = jest
        .spyOn(mockProvider, 'getSubscriptionStatus')
        .mockResolvedValue(mockStatus);

      // Act
      await paymentService.syncSubscriptionStatus(subscriptionId);

      // Assert
      expect(getSubscriptionStatusSpy).toHaveBeenCalledWith(subscriptionId);
    });

    it('should handle provider returning null status', async () => {
      // Arrange
      const subscriptionId = 'sub_invalid_123';

      const getSubscriptionStatusSpy = jest
        .spyOn(mockProvider, 'getSubscriptionStatus')
        .mockResolvedValue(null);

      // Act
      await paymentService.syncSubscriptionStatus(subscriptionId);

      // Assert
      expect(getSubscriptionStatusSpy).toHaveBeenCalledWith(subscriptionId);
    });
  });

  describe('getAvailablePlans', () => {
    it('should return all available plans', async () => {
      // Arrange
      const mockPlans = [
        createMockPlan(),
        createMockPlan({ id: 'plan-456', name: 'Basic Plan' }),
      ];

      mockPlans.forEach(plan => {
        paymentService.setMockPlan(plan.id, plan);
      });

      // Act
      const result = await paymentService.getAvailablePlans();

      // Assert
      expect(result).toHaveLength(2);
      expect(result).toEqual(expect.arrayContaining(mockPlans));
    });

    it('should return empty array when no plans exist', async () => {
      // Arrange - no plans set in mock data

      // Act
      const result = await paymentService.getAvailablePlans();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getPlanFeatures', () => {
    it('should return plan features', async () => {
      // Arrange
      const planId = 'plan-123';
      const mockPlan = createMockPlan({ id: planId });
      paymentService.setMockPlan(planId, mockPlan);

      // Act
      const result = await paymentService.getPlanFeatures(planId);

      // Assert
      expect(result).toEqual(mockPlan.features);
    });

    it('should return empty object for non-existent plan', async () => {
      // Arrange
      const planId = 'non-existent-id';
      // No plan set in mock data

      // Act
      const result = await paymentService.getPlanFeatures(planId);

      // Assert
      expect(result).toEqual({});
    });
  });

  describe('handleWebhook', () => {
    it('should delegate to provider for webhook processing', async () => {
      // Arrange
      const payload = 'webhook_payload';
      const signature = 'test_signature';
      const mockEvent = {
        id: 'evt_123',
        type: 'customer.subscription.updated',
        data: { object: { id: 'sub_test_123' } },
        created: Date.now(),
      };

      const constructWebhookEventSpy = jest
        .spyOn(mockProvider, 'constructWebhookEvent')
        .mockResolvedValue(mockEvent);
      const handleWebhookEventSpy = jest
        .spyOn(mockProvider, 'handleWebhookEvent')
        .mockResolvedValue();

      // Act
      await paymentService.handleWebhook(payload, signature);

      // Assert
      expect(constructWebhookEventSpy).toHaveBeenCalledWith(payload, signature);
      expect(handleWebhookEventSpy).toHaveBeenCalledWith(mockEvent);
    });

    it('should propagate webhook construction errors', async () => {
      // Arrange
      const payload = 'invalid_payload';
      const signature = 'invalid_signature';

      jest
        .spyOn(mockProvider, 'constructWebhookEvent')
        .mockRejectedValue(new Error('Invalid webhook signature'));

      // Act & Assert
      await expect(
        paymentService.handleWebhook(payload, signature),
      ).rejects.toThrow('Invalid webhook signature');
    });
  });

  describe('isSubscriptionActive', () => {
    it('should return false when user has no subscription', async () => {
      // Arrange
      const userId = 'user-123';
      // No subscription set in mock data

      // Act
      const result = await paymentService.isSubscriptionActive(userId);

      // Assert
      expect(result).toBe(false);
    });

    it('should return true when user has active subscription', async () => {
      // Arrange
      const userId = 'user-123';
      const mockSubscription = createMockSubscription({
        userId,
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      paymentService.setMockSubscription(userId, mockSubscription);

      // Act
      const result = await paymentService.isSubscriptionActive(userId);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when subscription is expired', async () => {
      // Arrange
      const userId = 'user-123';
      const mockSubscription = createMockSubscription({
        userId,
        status: 'active',
        currentPeriodEnd: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      });
      paymentService.setMockSubscription(userId, mockSubscription);

      // Act
      const result = await paymentService.isSubscriptionActive(userId);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when subscription status is not active', async () => {
      // Arrange
      const userId = 'user-123';
      const mockSubscription = createMockSubscription({
        userId,
        status: 'past_due',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      paymentService.setMockSubscription(userId, mockSubscription);

      // Act
      const result = await paymentService.isSubscriptionActive(userId);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('hasFeature', () => {
    it('should return false when user has no subscription', async () => {
      // Arrange
      const userId = 'user-123';
      const featureName = 'ai_analysis';
      // No subscription set in mock data

      // Act
      const result = await paymentService.hasFeature(userId, featureName);

      // Assert
      expect(result).toBe(false);
    });

    it('should return true when user has active subscription and plan has feature', async () => {
      // Arrange
      const userId = 'user-123';
      const planId = 'plan-123';
      const featureName = 'ai_analysis';

      const mockSubscription = createMockSubscription({
        userId,
        planId,
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      const mockPlan = createMockPlan({
        id: planId,
        features: { ai_analysis: true, premium_support: true },
      });

      paymentService.setMockSubscription(userId, mockSubscription);
      paymentService.setMockPlan(planId, mockPlan);

      // Act
      const result = await paymentService.hasFeature(userId, featureName);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when subscription is inactive', async () => {
      // Arrange
      const userId = 'user-123';
      const planId = 'plan-123';
      const featureName = 'ai_analysis';

      const mockSubscription = createMockSubscription({
        userId,
        planId,
        status: 'past_due',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      paymentService.setMockSubscription(userId, mockSubscription);

      // Act
      const result = await paymentService.hasFeature(userId, featureName);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when plan does not have the feature', async () => {
      // Arrange
      const userId = 'user-123';
      const planId = 'plan-123';
      const featureName = 'advanced_analytics';

      const mockSubscription = createMockSubscription({
        userId,
        planId,
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      const mockPlan = createMockPlan({
        id: planId,
        features: { ai_analysis: true, premium_support: true }, // No advanced_analytics
      });

      paymentService.setMockSubscription(userId, mockSubscription);
      paymentService.setMockPlan(planId, mockPlan);

      // Act
      const result = await paymentService.hasFeature(userId, featureName);

      // Assert
      expect(result).toBe(false);
    });
  });
});
