/**
 * Integration tests for Stripe webhook processing
 * Tests webhook handler with real database operations
 */

import { eq, like } from 'drizzle-orm';

import { POST } from '@/app/api/webhooks/stripe/route';
import { db } from '@/lib/db';
import { users, webhookEvents } from '@/lib/db/schema';
import { MockWebhookRequest } from '@/tests/helpers/webhook';

// Mock the billing service to return mock implementation
jest.mock('@/lib/billing/service', () => ({
  billingService: {
    verifyWebhookSignature: jest.fn().mockReturnValue(true),
    parseWebhookEvent: jest.fn(),
  },
}));

// Mock Next.js headers function
jest.mock('next/headers', () => ({
  headers: jest.fn(),
}));

// Get mocked modules
const { billingService } = jest.requireMock('@/lib/billing/service');
const { headers } = jest.requireMock('next/headers');

describe('Stripe Webhook Integration', () => {
  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock the headers function to return our mock headers
    headers.mockResolvedValue({
      get: jest.fn((name: string) => {
        if (name === 'stripe-signature') return 'test_signature';
        return null;
      }),
    });

    // Cleanup any existing test data
    await db.delete(users).where(eq(users.email, 'webhook-test@example.com'));
    await db.delete(users).where(eq(users.email, 'duplicate-test@example.com'));
    await db.delete(webhookEvents).where(like(webhookEvents.id, 'evt_test%'));
    await db.delete(webhookEvents).where(like(webhookEvents.id, 'cus_test%'));
    await db.delete(webhookEvents).where(like(webhookEvents.id, 'cs_test%'));
  });

  afterEach(async () => {
    // Cleanup test data
    await db.delete(users).where(eq(users.email, 'webhook-test@example.com'));
    await db.delete(users).where(eq(users.email, 'duplicate-test@example.com'));
    // Clean up any webhook events that might have been created
    await db.delete(webhookEvents).where(like(webhookEvents.id, 'evt_test%'));
    await db.delete(webhookEvents).where(like(webhookEvents.id, 'cus_test%'));
    await db.delete(webhookEvents).where(like(webhookEvents.id, 'cs_test%'));
  });

  test('stores customer ID from checkout.completed event', async () => {
    // Create test user
    const [testUser] = await db
      .insert(users)
      .values({
        email: 'webhook-test@example.com',
        clerkId: 'user_webhook_test',
      })
      .returning();

    // Mock webhook event parsing
    billingService.parseWebhookEvent.mockReturnValue({
      type: 'checkout.completed',
      data: {
        id: 'evt_test_checkout_123',
        customer: 'cus_test_webhook_456',
        client_reference_id: testUser.id,
        mode: 'subscription',
        customer_email: 'webhook-test@example.com',
      },
    });

    // Create mock request
    const request = new MockWebhookRequest(
      'http://localhost:3000/api/webhooks/stripe',
      {
        id: 'evt_test_checkout_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            customer: 'cus_test_webhook_456',
            client_reference_id: testUser.id,
            mode: 'subscription',
            customer_email: 'webhook-test@example.com',
          },
        },
      },
    );

    // Process webhook
    const response = await POST(request);
    const result = await response.json();

    // Verify response
    expect(response.status).toBe(200);
    expect(result.received).toBe(true);

    // Verify customer ID was stored
    const updatedUser = await db.query.users.findFirst({
      where: eq(users.id, testUser.id),
    });
    expect(updatedUser?.billingCustomerId).toBe('cus_test_webhook_456');

    // Verify webhook event was recorded for idempotency
    const webhookEvent = await db.query.webhookEvents.findFirst({
      where: eq(webhookEvents.id, 'cs_test_123'),
    });
    expect(webhookEvent).toBeDefined();
    expect(webhookEvent?.provider).toBe('stripe');
    expect(webhookEvent?.eventType).toBe('checkout.session.completed');
  });

  test('prevents duplicate webhook processing', async () => {
    // Create test user for duplicate test
    const [testUser] = await db
      .insert(users)
      .values({
        clerkId: 'user_duplicate_test',
        email: 'duplicate-test@example.com',
        name: 'Duplicate Test User',
        billingCustomerId: null,
      })
      .returning();

    // Pre-insert webhook event to simulate already processed
    await db.insert(webhookEvents).values({
      id: 'cs_test_duplicate',
      provider: 'stripe',
      eventType: 'checkout.session.completed',
    });

    // Mock webhook event parsing
    billingService.parseWebhookEvent.mockReturnValue({
      type: 'checkout.completed',
      data: {
        id: 'evt_test_duplicate_789',
        customer: 'cus_test_duplicate',
        client_reference_id: testUser.id,
      },
    });

    // Create mock request
    const request = new MockWebhookRequest(
      'http://localhost:3000/api/webhooks/stripe',
      {
        id: 'evt_test_duplicate_789',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_duplicate',
            customer: 'cus_test_duplicate',
            client_reference_id: testUser.id,
          },
        },
      },
    );

    // Process webhook
    const response = await POST(request);
    const result = await response.json();

    // Verify response
    expect(response.status).toBe(200);
    expect(result.received).toBe(true);

    // Cleanup
    await db
      .delete(webhookEvents)
      .where(eq(webhookEvents.id, 'evt_test_duplicate_789'));
  });

  test('stores customer ID from customer.created event', async () => {
    // Create test user without billing customer ID
    const [testUser] = await db
      .insert(users)
      .values({
        email: 'webhook-test@example.com',
        clerkId: 'user_webhook_customer_test',
        billingCustomerId: null, // No billing customer initially
      })
      .returning();

    // Mock webhook event parsing
    billingService.parseWebhookEvent.mockReturnValue({
      type: 'customer.created',
      data: {
        id: 'cus_test_new_customer_123',
        object: 'customer',
        email: 'webhook-test@example.com',
        created: Math.floor(Date.now() / 1000),
      },
    });

    // Create mock request
    const request = new MockWebhookRequest(
      'http://localhost:3000/api/webhooks/stripe',
      {
        id: 'evt_customer_created_123',
        type: 'customer.created',
        data: {
          object: {
            id: 'cus_test_new_customer_123',
            object: 'customer',
            email: 'webhook-test@example.com',
            created: Math.floor(Date.now() / 1000),
          },
        },
      },
    );

    // Process webhook
    const response = await POST(request);
    const result = await response.json();

    // Verify response
    expect(response.status).toBe(200);
    expect(result.received).toBe(true);

    // Verify customer ID was stored
    const updatedUser = await db.query.users.findFirst({
      where: eq(users.id, testUser.id),
    });
    expect(updatedUser?.billingCustomerId).toBe('cus_test_new_customer_123');

    // Verify webhook event was recorded for idempotency
    const webhookEvent = await db.query.webhookEvents.findFirst({
      where: eq(webhookEvents.id, 'cus_test_new_customer_123'),
    });
    expect(webhookEvent).toBeDefined();
    expect(webhookEvent?.provider).toBe('stripe');
    expect(webhookEvent?.eventType).toBe('customer.created');
  });

  test('rejects webhook without signature', async () => {
    // Mock headers to return no signature
    headers.mockResolvedValue({
      get: jest.fn().mockReturnValue(null),
    });

    // Create mock request
    const request = new MockWebhookRequest(
      'http://localhost:3000/api/webhooks/stripe',
      {
        id: 'evt_test_no_sig',
        type: 'checkout.session.completed',
      },
    );

    // Process webhook
    const response = await POST(request);
    const result = await response.json();

    // Verify rejection
    expect(response.status).toBe(400);
    expect(result.error).toBe('No signature provided');
  });

  test('rejects webhook with invalid signature', async () => {
    // Mock signature verification to fail
    billingService.verifyWebhookSignature.mockReturnValue(false);

    // Create mock request
    const request = new MockWebhookRequest(
      'http://localhost:3000/api/webhooks/stripe',
      {
        id: 'evt_test_invalid_sig',
        type: 'checkout.session.completed',
      },
    );

    // Process webhook
    const response = await POST(request);
    const result = await response.json();

    // Verify rejection
    expect(response.status).toBe(400);
    expect(result.error).toBe('Invalid signature');
  });
});
