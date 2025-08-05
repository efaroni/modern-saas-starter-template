import { MockBillingService } from './mock';

describe('MockBillingService', () => {
  let service: MockBillingService;

  beforeEach(() => {
    service = new MockBillingService();
  });

  describe('createCustomer', () => {
    it('should return a mock customer ID', async () => {
      const result = await service.createCustomer('test@example.com');

      expect(result.customerId).toMatch(/^cus_mock_\d+$/);
    });

    it('should use custom mock result when configured', async () => {
      const mockCustomerId = 'cus_custom_mock';
      service.setMockResults({
        createCustomer: { customerId: mockCustomerId },
      });

      const result = await service.createCustomer('test@example.com');

      expect(result.customerId).toBe(mockCustomerId);
    });
  });

  describe('createCheckoutSession', () => {
    it('should return a mock checkout URL', async () => {
      const params = {
        email: 'test@example.com',
        userId: 'user_123',
        priceId: 'price_test',
        mode: 'subscription' as const,
        successUrl: 'http://localhost:3000/success',
        cancelUrl: 'http://localhost:3000/cancel',
      };

      const result = await service.createCheckoutSession(params);

      expect(result.url).toMatch(
        /^https:\/\/checkout\.stripe\.com\/mock\/\d+\?email=test@example\.com&user=user_123$/,
      );
    });

    it('should use custom mock result when configured', async () => {
      const mockUrl = 'https://custom.checkout.url';
      service.setMockResults({
        createCheckoutSession: { url: mockUrl },
      });

      const params = {
        email: 'test@example.com',
        userId: 'user_123',
        priceId: 'price_test',
        mode: 'subscription' as const,
        successUrl: 'http://localhost:3000/success',
        cancelUrl: 'http://localhost:3000/cancel',
      };

      const result = await service.createCheckoutSession(params);

      expect(result.url).toBe(mockUrl);
    });
  });

  describe('createPortalSession', () => {
    it('should return a mock portal URL', async () => {
      const result = await service.createPortalSession(
        'cus_test',
        'http://localhost:3000/dashboard',
      );

      expect(result.url).toMatch(/^https:\/\/billing\.stripe\.com\/mock\/\d+$/);
    });

    it('should use custom mock result when configured', async () => {
      const mockUrl = 'https://custom.portal.url';
      service.setMockResults({
        createPortalSession: { url: mockUrl },
      });

      const result = await service.createPortalSession(
        'cus_test',
        'http://localhost:3000/dashboard',
      );

      expect(result.url).toBe(mockUrl);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should return true for valid mock signature', () => {
      const result = service.verifyWebhookSignature(
        'test payload',
        'mock_valid_signature',
      );

      expect(result).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const result = service.verifyWebhookSignature(
        'test payload',
        'invalid_signature',
      );

      expect(result).toBe(false);
    });

    it('should use custom mock result when configured', () => {
      service.setMockResults({ verifyWebhookSignature: true });

      const result = service.verifyWebhookSignature(
        'test payload',
        'any_signature',
      );

      expect(result).toBe(true);
    });
  });

  describe('parseWebhookEvent', () => {
    it('should parse mock webhook event', () => {
      const payload = JSON.stringify({
        type: 'checkout.session.completed',
        data: { id: 'test_event', customer: 'cus_test' },
      });

      const result = service.parseWebhookEvent(payload);

      expect(result.type).toBe('checkout.session.completed');
      expect(result.data.id).toBe('test_event');
      expect(result.data.customer).toBe('cus_test');
    });

    it('should use default values for missing data', () => {
      const payload = JSON.stringify({});

      const result = service.parseWebhookEvent(payload);

      expect(result.type).toBe('checkout.completed');
      expect(result.data.id).toBe('mock_event');
      expect(result.data.customer).toBe('cus_mock');
    });

    it('should use custom mock result when configured', () => {
      const mockEvent = {
        type: 'subscription.updated' as const,
        data: { id: 'custom_event', status: 'active' },
      };
      service.setMockResults({ parseWebhookEvent: mockEvent });

      const result = service.parseWebhookEvent('{}');

      expect(result).toEqual(mockEvent);
    });
  });
});
