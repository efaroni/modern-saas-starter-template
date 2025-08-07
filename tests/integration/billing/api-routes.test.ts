/**
 * Integration tests for billing API routes
 * Tests API endpoints with mocked auth and real database
 */

import { eq } from 'drizzle-orm';

import { POST as createCheckoutSession } from '@/app/api/billing/checkout/session/route';
import { POST as createPortalSession } from '@/app/api/billing/portal/route';
import { GET as getSubscriptionStatus } from '@/app/api/billing/subscription/status/route';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

// Mock Clerk auth
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(),
}));

// Mock billing service
jest.mock('@/lib/billing/service', () => ({
  billingService: {
    createCustomer: jest.fn(),
    createCheckoutSession: jest.fn(),
    createPortalSession: jest.fn(),
  },
}));

// Mock access control functions
jest.mock('@/lib/billing/access-control', () => ({
  hasActiveSubscription: jest.fn(),
  getSubscriptionDetails: jest.fn(),
}));

// Get mocked modules
const { auth } = jest.requireMock('@clerk/nextjs/server');
const { billingService } = jest.requireMock('@/lib/billing/service');
const { hasActiveSubscription, getSubscriptionDetails } = jest.requireMock(
  '@/lib/billing/access-control',
);

describe('Billing API Routes Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Set required environment variable for tests
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  });

  afterEach(async () => {
    // Cleanup test users
    await db.delete(users).where(eq(users.email, 'api-test@example.com'));
  });

  describe('GET /api/billing/subscription/status', () => {
    test('returns subscription status for authenticated user', async () => {
      // Create test user
      const [testUser] = await db
        .insert(users)
        .values({
          email: 'api-test@example.com',
          clerkId: 'user_api_test_status',
          billingCustomerId: 'cus_test_api_123',
        })
        .returning();

      // Mock auth
      auth.mockResolvedValue({ userId: 'user_api_test_status' });

      // Mock access control functions
      hasActiveSubscription.mockResolvedValue(true);
      getSubscriptionDetails.mockResolvedValue({
        status: 'active',
        currentPeriodEnd: new Date('2024-12-31'),
      });

      // Create mock request
      const request = {} as unknown;

      // Make request
      const response = await getSubscriptionStatus(request);
      const result = await response.json();

      // Verify response
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.hasAccess).toBe(true);
      expect(result.data.subscription.status).toBe('active');

      // Verify access control was called with correct user ID
      expect(hasActiveSubscription).toHaveBeenCalledWith(testUser.id);
      expect(getSubscriptionDetails).toHaveBeenCalledWith(testUser.id);
    });

    test('returns 401 for unauthenticated request', async () => {
      // Mock auth to return no user
      auth.mockResolvedValue({ userId: null });

      // Create mock request
      const request = {} as unknown;

      // Make request
      const response = await getSubscriptionStatus(request);
      const result = await response.json();

      // Verify response
      expect(response.status).toBe(401);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized');
    });

    test('returns 404 when user not found in database', async () => {
      // Mock auth with user not in database
      auth.mockResolvedValue({ userId: 'user_not_in_db' });

      // Create mock request
      const request = {} as unknown;

      // Make request
      const response = await getSubscriptionStatus(request);
      const result = await response.json();

      // Verify response - should return 404 for user not found
      expect(response.status).toBe(404);
      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });

  describe('POST /api/billing/checkout/session', () => {
    test('creates checkout session for authenticated user', async () => {
      // Create test user with billing customer
      const [testUser] = await db
        .insert(users)
        .values({
          email: 'api-test@example.com',
          clerkId: 'user_api_test_checkout',
          billingCustomerId: 'cus_test_checkout_456',
        })
        .returning();

      // Mock auth
      auth.mockResolvedValue({ userId: 'user_api_test_checkout' });

      // Mock billing service
      billingService.createCheckoutSession.mockResolvedValue({
        url: 'https://checkout.stripe.com/test_session_123',
      });

      // Create mock request
      const request = {
        json: jest.fn().mockResolvedValue({
          priceId: 'price_test_subscription',
          mode: 'subscription',
        }),
      } as unknown;

      // Make request
      const response = await createCheckoutSession(request);
      const result = await response.json();

      // Verify response
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.checkoutUrl).toBe(
        'https://checkout.stripe.com/test_session_123',
      );

      // Verify billing service was called correctly
      expect(billingService.createCheckoutSession).toHaveBeenCalledWith({
        customerId: 'cus_test_checkout_456',
        priceId: 'price_test_subscription',
        mode: 'subscription',
        successUrl: expect.stringContaining('/billing-test?success=true'),
        cancelUrl: expect.stringContaining('/billing-test?cancelled=true'),
        metadata: expect.objectContaining({
          userId: testUser.id,
        }),
      });
    });

    test('creates checkout session for user with existing billing customer', async () => {
      // Create test user with billing customer (reflects new architecture)
      const [testUser] = await db
        .insert(users)
        .values({
          email: 'api-test@example.com',
          clerkId: 'user_api_test_with_customer',
          billingCustomerId: 'cus_existing_customer_123',
        })
        .returning();

      // Mock auth
      auth.mockResolvedValue({ userId: 'user_api_test_with_customer' });

      // Mock billing service
      billingService.createCheckoutSession.mockResolvedValue({
        url: 'https://checkout.stripe.com/test_session_456',
      });

      // Create mock request
      const request = {
        json: jest.fn().mockResolvedValue({
          priceId: 'price_test_subscription',
          mode: 'subscription',
        }),
      } as unknown;

      // Make request
      const response = await createCheckoutSession(request);
      const result = await response.json();

      // Verify response
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);

      // Verify checkout session was created with existing customer ID
      expect(billingService.createCheckoutSession).toHaveBeenCalledWith({
        customerId: 'cus_existing_customer_123',
        priceId: 'price_test_subscription',
        mode: 'subscription',
        successUrl: expect.stringContaining('/billing-test?success=true'),
        cancelUrl: expect.stringContaining('/billing-test?cancelled=true'),
        metadata: { userId: testUser.id },
      });

      // Verify customer creation was NOT called since user already has one
      expect(billingService.createCustomer).not.toHaveBeenCalled();
    });

    test('returns 401 for unauthenticated request', async () => {
      // Mock auth to return no user
      auth.mockResolvedValue({ userId: null });

      // Create mock request
      const request = {
        json: jest.fn().mockResolvedValue({
          priceId: 'price_test_subscription',
          mode: 'subscription',
        }),
      } as unknown;

      // Make request
      const response = await createCheckoutSession(request);
      const result = await response.json();

      // Verify response
      expect(response.status).toBe(401);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized');
    });
  });

  describe('POST /api/billing/portal', () => {
    test('creates portal session for user with billing customer', async () => {
      // Create test user with billing customer
      await db
        .insert(users)
        .values({
          email: 'api-test@example.com',
          clerkId: 'user_api_test_portal',
          billingCustomerId: 'cus_test_portal_123',
        })
        .returning();

      // Mock auth
      auth.mockResolvedValue({ userId: 'user_api_test_portal' });

      // Mock billing service
      billingService.createPortalSession.mockResolvedValue({
        url: 'https://billing.stripe.com/test_portal_session',
      });

      // Create mock request
      const request = {} as unknown;

      // Make request
      const response = await createPortalSession(request);
      const result = await response.json();

      // Verify response
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.portalUrl).toBe(
        'https://billing.stripe.com/test_portal_session',
      );

      // Verify billing service was called correctly
      expect(billingService.createPortalSession).toHaveBeenCalledWith(
        'cus_test_portal_123',
        expect.stringContaining('/dashboard'),
      );
    });

    test('creates portal session for user with existing billing customer', async () => {
      // Create test user with billing customer (reflects new architecture)
      await db
        .insert(users)
        .values({
          email: 'api-test@example.com',
          clerkId: 'user_api_test_with_billing',
          billingCustomerId: 'cus_existing_portal_456',
        })
        .returning();

      // Mock auth
      auth.mockResolvedValue({ userId: 'user_api_test_with_billing' });

      // Mock billing service
      billingService.createPortalSession.mockResolvedValue({
        url: 'https://billing.stripe.com/test_portal_existing',
      });

      // Create mock request
      const request = {} as unknown;

      // Make request
      const response = await createPortalSession(request);
      const result = await response.json();

      // Verify response
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.portalUrl).toBe(
        'https://billing.stripe.com/test_portal_existing',
      );

      // Verify portal session was created with existing customer ID
      expect(billingService.createPortalSession).toHaveBeenCalledWith(
        'cus_existing_portal_456',
        expect.stringContaining('/dashboard'),
      );

      // Verify customer creation was NOT called since user already has one
      expect(billingService.createCustomer).not.toHaveBeenCalled();
    });
  });
});
