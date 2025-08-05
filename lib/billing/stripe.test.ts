import Stripe from 'stripe';

import { StripeBillingService } from './stripe';

// Mock Stripe
jest.mock('stripe');

describe('StripeBillingService', () => {
  let service: StripeBillingService;
  let mockStripe: jest.Mocked<Stripe>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock Stripe instance
    mockStripe = {
      customers: {
        create: jest.fn(),
      },
      checkout: {
        sessions: {
          create: jest.fn(),
        },
      },
      billingPortal: {
        sessions: {
          create: jest.fn(),
        },
      },
      webhooks: {
        constructEvent: jest.fn(),
      },
    } as any;

    // Mock Stripe constructor
    (Stripe as jest.MockedClass<typeof Stripe>).mockImplementation(
      () => mockStripe,
    );

    service = new StripeBillingService('sk_test_123', 'whsec_test_123');
  });

  describe('constructor', () => {
    it('should initialize Stripe with correct configuration', () => {
      expect(Stripe).toHaveBeenCalledWith('sk_test_123', {
        apiVersion: '2025-06-30.basil',
        typescript: true,
      });
    });
  });

  describe('createCustomer', () => {
    it('should create a customer and return customer ID', async () => {
      const mockCustomer = { id: 'cus_test123' };
      mockStripe.customers.create.mockResolvedValue(mockCustomer as any);

      const result = await service.createCustomer('test@example.com');

      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
      });
      expect(result.customerId).toBe('cus_test123');
    });

    it('should handle Stripe API errors', async () => {
      mockStripe.customers.create.mockRejectedValue(new Error('API Error'));

      await expect(service.createCustomer('test@example.com')).rejects.toThrow(
        'API Error',
      );
    });
  });

  describe('createCheckoutSession', () => {
    it('should create a checkout session for subscription', async () => {
      const mockSession = { url: 'https://checkout.stripe.com/session123' };
      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession as any);

      const params = {
        email: 'test@example.com',
        userId: 'user_123',
        priceId: 'price_test',
        mode: 'subscription' as const,
        successUrl: 'http://localhost:3000/success',
        cancelUrl: 'http://localhost:3000/cancel',
        metadata: { userId: 'user123' },
      };

      const result = await service.createCheckoutSession(params);

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith({
        client_reference_id: 'user_123',
        customer_email: 'test@example.com',
        mode: 'subscription',
        line_items: [
          {
            price: 'price_test',
            quantity: 1,
          },
        ],
        success_url: 'http://localhost:3000/success',
        cancel_url: 'http://localhost:3000/cancel',
        metadata: { userId: 'user123' },
        payment_method_types: ['card'],
      });
      expect(result.url).toBe('https://checkout.stripe.com/session123');
    });

    it('should create a checkout session for one-time payment', async () => {
      const mockSession = { url: 'https://checkout.stripe.com/payment123' };
      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession as any);

      const params = {
        email: 'test@example.com',
        userId: 'user_123',
        priceId: 'price_test',
        mode: 'payment' as const,
        successUrl: 'http://localhost:3000/success',
        cancelUrl: 'http://localhost:3000/cancel',
      };

      const result = await service.createCheckoutSession(params);

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith({
        client_reference_id: 'user_123',
        customer_email: 'test@example.com',
        mode: 'payment',
        line_items: [
          {
            price: 'price_test',
            quantity: 1,
          },
        ],
        success_url: 'http://localhost:3000/success',
        cancel_url: 'http://localhost:3000/cancel',
        metadata: undefined,
        payment_method_types: ['card'],
      });
      expect(result.url).toBe('https://checkout.stripe.com/payment123');
    });
  });

  describe('createPortalSession', () => {
    it('should create a billing portal session', async () => {
      const mockSession = { url: 'https://billing.stripe.com/portal123' };
      mockStripe.billingPortal.sessions.create.mockResolvedValue(
        mockSession as any,
      );

      const result = await service.createPortalSession(
        'cus_test',
        'http://localhost:3000/dashboard',
      );

      expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_test',
        return_url: 'http://localhost:3000/dashboard',
      });
      expect(result.url).toBe('https://billing.stripe.com/portal123');
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should return true for valid signature', () => {
      mockStripe.webhooks.constructEvent.mockReturnValue({} as any);

      const result = service.verifyWebhookSignature('payload', 'signature');

      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        'payload',
        'signature',
        'whsec_test_123',
      );
      expect(result).toBe(true);
    });

    it('should return false for invalid signature', () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const result = service.verifyWebhookSignature(
        'payload',
        'invalid_signature',
      );

      expect(result).toBe(false);
    });
  });

  describe('parseWebhookEvent', () => {
    it('should parse and map Stripe webhook events correctly', () => {
      const stripeEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test',
            customer: 'cus_test',
            mode: 'subscription',
          },
        },
      };

      const result = service.parseWebhookEvent(JSON.stringify(stripeEvent));

      expect(result.type).toBe('checkout.completed');
      expect(result.data).toEqual({
        id: 'cs_test',
        customer: 'cus_test',
        mode: 'subscription',
      });
    });

    it('should map all supported event types', () => {
      const eventMappings = [
        { stripe: 'checkout.session.completed', mapped: 'checkout.completed' },
        {
          stripe: 'customer.subscription.updated',
          mapped: 'subscription.updated',
        },
        {
          stripe: 'customer.subscription.deleted',
          mapped: 'subscription.deleted',
        },
        { stripe: 'payment_intent.succeeded', mapped: 'payment.succeeded' },
      ];

      eventMappings.forEach(({ stripe, mapped }) => {
        const stripeEvent = {
          type: stripe,
          data: { object: { id: 'test' } },
        };

        const result = service.parseWebhookEvent(JSON.stringify(stripeEvent));

        expect(result.type).toBe(mapped);
      });
    });

    it('should pass through unmapped event types', () => {
      const stripeEvent = {
        type: 'unknown.event.type',
        data: { object: { id: 'test' } },
      };

      const result = service.parseWebhookEvent(JSON.stringify(stripeEvent));

      expect(result.type).toBe('unknown.event.type');
    });
  });
});
