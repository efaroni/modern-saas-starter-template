/**
 * Integration tests for Clerk webhook handler
 * Tests webhook signature verification, event processing, and database sync
 */

import { eq } from 'drizzle-orm';

import { POST } from '@/app/api/webhooks/clerk/route';
import { users, webhookEvents } from '@/lib/db/schema';
import { testDb } from '@/lib/db/test';
import {
  webhookPayloads,
  createWebhookHeaders,
  createInvalidWebhookHeaders,
} from '@/tests/fixtures/clerk';
import { MockWebhookRequest } from '@/tests/helpers/webhook';

describe('Clerk Webhook Handler', () => {
  const WEBHOOK_SECRET = 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw';
  const originalEnv = process.env;

  beforeAll(() => {
    // Set webhook secret for tests
    process.env = {
      ...originalEnv,
      CLERK_WEBHOOK_SECRET: WEBHOOK_SECRET,
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(async () => {
    // Clean test data to prevent conflicts between webhook tests
    await testDb.delete(users);
    await testDb.delete(webhookEvents);
  });

  describe('Webhook Verification', () => {
    it('should reject requests without webhook secret configured', async () => {
      // Temporarily remove webhook secret
      delete process.env.CLERK_WEBHOOK_SECRET;

      const request = new MockWebhookRequest(
        'http://localhost:3000/api/webhooks/clerk',
        webhookPayloads.userCreated,
        createWebhookHeaders(webhookPayloads.userCreated, WEBHOOK_SECRET),
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Webhook secret not configured');

      // Restore webhook secret
      process.env.CLERK_WEBHOOK_SECRET = WEBHOOK_SECRET;
    });

    it('should reject requests with missing webhook headers', async () => {
      const request = new MockWebhookRequest(
        'http://localhost:3000/api/webhooks/clerk',
        webhookPayloads.userCreated,
        {}, // No webhook headers
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required webhook headers');
    });

    it('should reject requests with invalid webhook signature', async () => {
      const request = new MockWebhookRequest(
        'http://localhost:3000/api/webhooks/clerk',
        webhookPayloads.userCreated,
        createInvalidWebhookHeaders(),
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Webhook verification failed');
    });

    it('should accept requests with valid webhook signature', async () => {
      const request = new MockWebhookRequest(
        'http://localhost:3000/api/webhooks/clerk',
        webhookPayloads.userCreated,
        createWebhookHeaders(webhookPayloads.userCreated, WEBHOOK_SECRET),
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
    });
  });

  describe('User Event Processing', () => {
    it('should create user on user.created event', async () => {
      const headers = createWebhookHeaders(
        webhookPayloads.userCreated,
        WEBHOOK_SECRET,
      );
      const request = new MockWebhookRequest(
        'http://localhost:3000/api/webhooks/clerk',
        webhookPayloads.userCreated,
        headers,
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);

      // Verify user was created in database
      const createdUser = await testDb.query.users.findFirst({
        where: eq(users.clerkId, webhookPayloads.userCreated.data.id),
      });

      expect(createdUser).toBeDefined();
      expect(createdUser?.clerkId).toBe('user_webhook_created');
      expect(createdUser?.email).toBe('newuser@test.com');
      expect(createdUser?.name).toBe('New User');
      expect(createdUser?.imageUrl).toBe(
        'https://images.clerk.dev/uploaded/img_test_new_user.png',
      );

      // Verify webhook event was recorded
      const webhookEvent = await testDb.query.webhookEvents.findFirst({
        where: eq(webhookEvents.id, headers['svix-id']),
      });

      expect(webhookEvent).toBeDefined();
      expect(webhookEvent?.eventType).toBe('user.created');
    });

    it('should update user on user.updated event', async () => {
      // Create initial user
      await testDb.insert(users).values({
        clerkId: webhookPayloads.userUpdated.data.id,
        email: 'olduser@test.com',
        name: 'Old User',
        imageUrl: null,
      });

      const headers = createWebhookHeaders(
        webhookPayloads.userUpdated,
        WEBHOOK_SECRET,
      );
      const request = new MockWebhookRequest(
        'http://localhost:3000/api/webhooks/clerk',
        webhookPayloads.userUpdated,
        headers,
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);

      // Verify user was updated in database
      const updatedUser = await testDb.query.users.findFirst({
        where: eq(users.clerkId, webhookPayloads.userUpdated.data.id),
      });

      expect(updatedUser).toBeDefined();
      expect(updatedUser?.email).toBe('updated@test.com');
      expect(updatedUser?.name).toBe('Updated User');
      expect(updatedUser?.imageUrl).toBe(
        'https://images.clerk.dev/uploaded/img_test_updated_user.png',
      );
    });

    it('should delete user on user.deleted event', async () => {
      // Create user to delete
      await testDb.insert(users).values({
        clerkId: webhookPayloads.userDeleted.data.id,
        email: 'deleteme@test.com',
        name: 'Delete Me',
        imageUrl: null,
      });

      const headers = createWebhookHeaders(
        webhookPayloads.userDeleted,
        WEBHOOK_SECRET,
      );
      const request = new MockWebhookRequest(
        'http://localhost:3000/api/webhooks/clerk',
        webhookPayloads.userDeleted,
        headers,
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);

      // Verify user was deleted from database
      const deletedUser = await testDb.query.users.findFirst({
        where: eq(users.clerkId, webhookPayloads.userDeleted.data.id),
      });

      expect(deletedUser).toBeUndefined();
    });

    it('should handle user.deleted event when user does not exist', async () => {
      // Don't create user - simulate already deleted
      const headers = createWebhookHeaders(
        webhookPayloads.userDeleted,
        WEBHOOK_SECRET,
      );
      const request = new MockWebhookRequest(
        'http://localhost:3000/api/webhooks/clerk',
        webhookPayloads.userDeleted,
        headers,
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(data.warning).toContain('User not found');
    });
  });

  describe('Idempotency', () => {
    it('should handle duplicate webhook events gracefully', async () => {
      const headers = createWebhookHeaders(
        webhookPayloads.userCreated,
        WEBHOOK_SECRET,
      );
      const request = new MockWebhookRequest(
        'http://localhost:3000/api/webhooks/clerk',
        webhookPayloads.userCreated,
        headers,
      );

      // First request
      const response1 = await POST(request);
      expect(response1.status).toBe(200);

      // Duplicate request with same headers (same svix-id)
      const duplicateRequest = new MockWebhookRequest(
        'http://localhost:3000/api/webhooks/clerk',
        webhookPayloads.userCreated,
        headers, // Same headers = same svix-id
      );

      const response2 = await POST(duplicateRequest);
      const data2 = await response2.json();

      expect(response2.status).toBe(200);
      expect(data2.received).toBe(true);
      expect(data2.skipped).toBe(true);
      expect(data2.reason).toContain('Already processed');

      // Verify only one user was created
      const usersCount = await testDb
        .select({ count: users.id })
        .from(users)
        .where(eq(users.clerkId, webhookPayloads.userCreated.data.id));

      expect(usersCount.length).toBe(1);
    });
  });

  describe('Unknown Events', () => {
    it('should return 200 for unknown event types', async () => {
      const headers = createWebhookHeaders(
        webhookPayloads.unknownEvent,
        WEBHOOK_SECRET,
      );
      const request = new MockWebhookRequest(
        'http://localhost:3000/api/webhooks/clerk',
        webhookPayloads.unknownEvent,
        headers,
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);

      // Verify webhook event was still recorded
      const webhookEvent = await testDb.query.webhookEvents.findFirst({
        where: eq(webhookEvents.id, headers['svix-id']),
      });

      expect(webhookEvent).toBeDefined();
      expect(webhookEvent?.eventType).toBe('session.created');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock a database error by using an invalid webhook event
      const invalidPayload = {
        ...webhookPayloads.userCreated,
        data: {
          ...webhookPayloads.userCreated.data,
          email_addresses: null, // This will cause an error
        },
      };

      const headers = createWebhookHeaders(invalidPayload, WEBHOOK_SECRET);
      const request = new MockWebhookRequest(
        'http://localhost:3000/api/webhooks/clerk',
        invalidPayload,
        headers,
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('No primary email found');
    });
  });

  describe('User Data Edge Cases', () => {
    it('should handle user creation with no name fields', async () => {
      const payloadWithoutNames = {
        ...webhookPayloads.userCreated,
        data: {
          ...webhookPayloads.userCreated.data,
          first_name: null,
          last_name: null,
        },
      };

      const headers = createWebhookHeaders(payloadWithoutNames, WEBHOOK_SECRET);
      const request = new MockWebhookRequest(
        'http://localhost:3000/api/webhooks/clerk',
        payloadWithoutNames,
        headers,
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);

      // Verify user was created with null name
      const createdUser = await testDb.query.users.findFirst({
        where: eq(users.clerkId, payloadWithoutNames.data.id),
      });

      expect(createdUser).toBeDefined();
      expect(createdUser?.name).toBeNull();
    });

    it('should handle user creation with only first name', async () => {
      const payloadWithFirstNameOnly = {
        ...webhookPayloads.userCreated,
        data: {
          ...webhookPayloads.userCreated.data,
          id: 'user_webhook_first_only',
          first_name: 'First',
          last_name: null,
        },
      };

      const headers = createWebhookHeaders(
        payloadWithFirstNameOnly,
        WEBHOOK_SECRET,
      );
      const request = new MockWebhookRequest(
        'http://localhost:3000/api/webhooks/clerk',
        payloadWithFirstNameOnly,
        headers,
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);

      // Verify user was created with first name only
      const createdUser = await testDb.query.users.findFirst({
        where: eq(users.clerkId, payloadWithFirstNameOnly.data.id),
      });

      expect(createdUser).toBeDefined();
      expect(createdUser?.name).toBe('First');
    });

    it('should handle user creation without image_url', async () => {
      const payloadWithoutImage = {
        ...webhookPayloads.userCreated,
        data: {
          ...webhookPayloads.userCreated.data,
          id: 'user_webhook_no_image',
          image_url: null,
        },
      };

      const headers = createWebhookHeaders(payloadWithoutImage, WEBHOOK_SECRET);
      const request = new MockWebhookRequest(
        'http://localhost:3000/api/webhooks/clerk',
        payloadWithoutImage,
        headers,
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);

      // Verify user was created with null image
      const createdUser = await testDb.query.users.findFirst({
        where: eq(users.clerkId, payloadWithoutImage.data.id),
      });

      expect(createdUser).toBeDefined();
      expect(createdUser?.imageUrl).toBeNull();
    });
  });
});
