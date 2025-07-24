import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from '@jest/globals';
import { testHelpers, authTestHelpers } from '@/lib/db/test-helpers';
import { testDb } from '@/lib/db/test';
import { users, subscriptions, plans } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Mock Next.js auth
jest.mock('@/lib/auth/auth', () => ({
  auth: jest.fn(),
}));

describe('Billing API Integration Tests', () => {
  let testUserId: string;
  let testEmail: string;
  let testPlanId: string;

  beforeAll(async () => {
    await testHelpers.setupTest();
  });

  afterAll(async () => {
    await testHelpers.teardownTest();
  });

  beforeEach(async () => {
    await authTestHelpers.cleanupAuthData();

    // Cleanup existing payment data
    await testDb.delete(subscriptions);
    await testDb.delete(plans);

    // Create test user
    testEmail = authTestHelpers.generateUniqueEmail();
    const testUser = await testDb
      .insert(users)
      .values({
        email: testEmail,
        name: 'Test User',
        password: 'hashedpassword',
      })
      .returning();
    testUserId = testUser[0].id;

    // Create test plan with unique price ID
    const uniquePriceId = `price_test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const testPlan = await testDb
      .insert(plans)
      .values({
        name: 'Test Pro Plan',
        stripePriceId: uniquePriceId,
        features: { ai_analysis: true, premium_support: true },
      })
      .returning();
    testPlanId = testPlan[0].id;

    // Mock authenticated user
    const { auth } = require('@/lib/auth/auth');
    auth.mockResolvedValue({
      user: {
        id: testUserId,
        email: testEmail,
        name: 'Test User',
      },
    });
  });

  afterEach(async () => {
    await authTestHelpers.cleanupAuthData();

    // Cleanup payment data
    await testDb.delete(subscriptions);
    await testDb.delete(plans);

    jest.clearAllMocks();
  });

  describe('POST /api/billing/checkout', () => {
    it('should create checkout session for authenticated user', async () => {
      const { POST } = await import('@/app/api/billing/checkout/route');

      const request = new Request(
        'http://localhost:3000/api/billing/checkout',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            priceId: 'price_test_123',
            successUrl: 'http://localhost:3000/success',
            cancelUrl: 'http://localhost:3000/cancel',
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.sessionId).toBeDefined();
      expect(data.data.url).toContain('success');
    });

    it('should return 401 for unauthenticated user', async () => {
      // Mock unauthenticated user
      const { auth } = require('@/lib/auth');
      auth.mockResolvedValue(null);

      const { POST } = await import('@/app/api/billing/checkout/route');

      const request = new Request(
        'http://localhost:3000/api/billing/checkout',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            priceId: 'price_test_123',
            successUrl: 'http://localhost:3000/success',
            cancelUrl: 'http://localhost:3000/cancel',
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    it('should validate required fields', async () => {
      const { POST } = await import('@/app/api/billing/checkout/route');

      const request = new Request(
        'http://localhost:3000/api/billing/checkout',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            // Missing required fields
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('required');
    });
  });

  describe('POST /api/billing/portal', () => {
    it('should create portal session for authenticated user', async () => {
      const { POST } = await import('@/app/api/billing/portal/route');

      const request = new Request('http://localhost:3000/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnUrl: 'http://localhost:3000/payments',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.url).toContain('mock_portal=true');
    });

    it('should return 401 for unauthenticated user', async () => {
      // Mock unauthenticated user
      const { auth } = require('@/lib/auth');
      auth.mockResolvedValue(null);

      const { POST } = await import('@/app/api/billing/portal/route');

      const request = new Request('http://localhost:3000/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnUrl: 'http://localhost:3000/payments',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('GET /api/billing/subscription', () => {
    it('should return subscription status for authenticated user', async () => {
      const { GET } = await import('@/app/api/billing/subscription/route');

      const request = new Request(
        'http://localhost:3000/api/billing/subscription',
        {
          method: 'GET',
        },
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.subscription).toBeNull();
      expect(data.data.isActive).toBe(false);
    });

    it('should return subscription when user has one', async () => {
      // Create test subscription
      await testDb.insert(subscriptions).values({
        userId: testUserId,
        stripeSubscriptionId: 'sub_test_123',
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const { GET } = await import('@/app/api/billing/subscription/route');

      const request = new Request(
        'http://localhost:3000/api/billing/subscription',
        {
          method: 'GET',
        },
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.subscription).toBeDefined();
      expect(data.data.subscription.status).toBe('active');
      expect(data.data.isActive).toBe(true);
    });
  });

  describe('POST /api/billing/webhook', () => {
    it('should process webhook with valid signature', async () => {
      const { POST } = await import('@/app/api/billing/webhook/route');

      const webhookPayload = JSON.stringify({
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_test_123',
            status: 'active',
            current_period_end: Math.floor(Date.now() / 1000) + 2592000, // 30 days
          },
        },
      });

      const request = new Request('http://localhost:3000/api/billing/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'test_signature',
          'Content-Type': 'application/json',
        },
        body: webhookPayload,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
    });

    it('should return 400 when signature is missing', async () => {
      const { POST } = await import('@/app/api/billing/webhook/route');

      const request = new Request('http://localhost:3000/api/billing/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No signature header');
    });
  });

  describe('GET /api/plans', () => {
    it('should return available plans', async () => {
      const { GET } = await import('@/app/api/plans/route');

      const request = new Request('http://localhost:3000/api/plans', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].name).toBe('Test Pro Plan');
      expect(data.data[0].stripePriceId).toBe('price_test_123');
    });

    it('should return empty array when no plans exist', async () => {
      // Clean up the test plan
      await testDb.delete(plans).where(eq(plans.id, testPlanId));

      const { GET } = await import('@/app/api/plans/route');

      const request = new Request('http://localhost:3000/api/plans', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(0);
    });
  });
});
