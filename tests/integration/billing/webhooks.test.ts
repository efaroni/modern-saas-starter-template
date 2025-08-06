/**
 * Integration tests for Stripe webhook processing
 * Tests webhook handler with real database operations
 */

import { eq, like } from 'drizzle-orm';

import { POST } from '@/app/api/webhooks/stripe/route';
import { db } from '@/lib/db';
import { users, webhookEvents } from '@/lib/db/schema';

// Mock the billing service to return mock implementation
jest.mock('@/lib/billing/service', () => ({
  billingService: {
    verifyWebhookSignature: jest.fn().mockReturnValue(true),
    parseWebhookEvent: jest.fn(),
  },
}));

// Mock email service
jest.mock('@/lib/email/service', () => ({
  emailService: {
    sendSubscriptionChangeEmail: jest.fn(),
    sendPaymentSuccessEmail: jest.fn(),
    sendPaymentFailedEmail: jest.fn(),
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
    await db.delete(webhookEvents).where(like(webhookEvents.id, 'evt_test%'));
  });

  afterEach(async () => {
    // Cleanup test data
    await db.delete(users).where(eq(users.email, 'webhook-test@example.com'));
    // Clean up any webhook events that might have been created
    await db.delete(webhookEvents).where(like(webhookEvents.id, 'evt_test%'));
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
    const request = {
      text: jest.fn().mockResolvedValue(
        JSON.stringify({
          id: 'evt_test_checkout_123',
          type: 'checkout.session.completed',
        }),
      ),
    } as unknown;

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
      where: eq(webhookEvents.id, 'evt_test_checkout_123'),
    });
    expect(webhookEvent).toBeDefined();
    expect(webhookEvent?.provider).toBe('stripe');
    expect(webhookEvent?.eventType).toBe('checkout.completed');
  });

  test('prevents duplicate webhook processing', async () => {
    // Pre-insert webhook event to simulate already processed
    await db.insert(webhookEvents).values({
      id: 'evt_test_duplicate_789',
      provider: 'stripe',
      eventType: 'checkout.completed',
    });

    // Mock webhook event parsing
    billingService.parseWebhookEvent.mockReturnValue({
      type: 'checkout.completed',
      data: {
        id: 'evt_test_duplicate_789',
        customer: 'cus_test_duplicate',
        client_reference_id: 'test-user-123',
      },
    });

    // Create mock request
    const request = {
      text: jest.fn().mockResolvedValue(
        JSON.stringify({
          id: 'evt_test_duplicate_789',
          type: 'checkout.session.completed',
        }),
      ),
    } as unknown;

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

  test('rejects webhook without signature', async () => {
    // Mock headers to return no signature
    headers.mockResolvedValue({
      get: jest.fn().mockReturnValue(null),
    });

    // Create mock request
    const request = {
      text: jest.fn().mockResolvedValue(
        JSON.stringify({
          id: 'evt_test_no_sig',
          type: 'checkout.session.completed',
        }),
      ),
    } as unknown;

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
    const request = {
      text: jest.fn().mockResolvedValue(
        JSON.stringify({
          id: 'evt_test_invalid_sig',
          type: 'checkout.session.completed',
        }),
      ),
    } as unknown;

    // Process webhook
    const response = await POST(request);
    const result = await response.json();

    // Verify rejection
    expect(response.status).toBe(400);
    expect(result.error).toBe('Invalid signature');
  });
});
