/**
 * Integration tests for welcome email on user signup
 * Tests that Clerk webhook triggers welcome email with correct data
 */

import { eq } from 'drizzle-orm';

import { POST } from '@/app/api/webhooks/clerk/route';
import { users, webhookEvents } from '@/lib/db/schema';
import { testDb } from '@/lib/db/test';
import { emailService } from '@/lib/email/service';
import { createWebhookHeaders } from '@/tests/fixtures/clerk';
import { MockWebhookRequest } from '@/tests/helpers/webhook';

// Mock the email service
jest.mock('@/lib/email/service', () => ({
  emailService: {
    sendWelcomeEmail: jest.fn(),
  },
}));

const mockEmailService = emailService as jest.Mocked<typeof emailService>;

describe('Welcome Email Integration', () => {
  const WEBHOOK_SECRET = 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw';
  const originalEnv = process.env;

  beforeAll(() => {
    // Set webhook secret for tests
    process.env = {
      ...originalEnv,
      CLERK_WEBHOOK_SECRET: WEBHOOK_SECRET,
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(async () => {
    // Clean up test data
    await testDb
      .delete(webhookEvents)
      .where(eq(webhookEvents.provider, 'clerk'));
    await testDb.delete(users);

    // Reset mocks
    mockEmailService.sendWelcomeEmail.mockClear();
  });

  afterEach(async () => {
    // Clean up after each test
    await testDb
      .delete(webhookEvents)
      .where(eq(webhookEvents.provider, 'clerk'));
    await testDb.delete(users);
  });

  describe('User Signup Welcome Email', () => {
    it('should send welcome email on user.created webhook with correct data', async () => {
      const userCreatedPayload = {
        type: 'user.created',
        object: 'event',
        id: 'evt_test_welcome_email',
        data: {
          id: 'user_welcome_test_123',
          email_addresses: [
            {
              id: 'email_welcome_test',
              email_address: 'welcome-test@example.com',
              verification: {
                status: 'verified',
                strategy: 'email_code',
              },
            },
          ],
          primary_email_address_id: 'email_welcome_test',
          first_name: 'Welcome',
          last_name: 'Test',
          image_url: 'https://images.clerk.dev/uploaded/img_welcome_test.png',
          username: null,
          public_metadata: {},
          private_metadata: {},
          unsafe_metadata: {},
          created_at: Date.now(),
          updated_at: Date.now(),
        },
      };

      // Mock successful email sending
      mockEmailService.sendWelcomeEmail.mockResolvedValue({ success: true });

      const request = new MockWebhookRequest(
        'http://localhost:3000/api/webhooks/clerk',
        userCreatedPayload,
        createWebhookHeaders(userCreatedPayload, WEBHOOK_SECRET),
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);

      // Verify user was created in database
      const createdUser = await testDb.query.users.findFirst({
        where: eq(users.clerkId, 'user_welcome_test_123'),
      });

      expect(createdUser).toBeDefined();
      expect(createdUser?.email).toBe('welcome-test@example.com');
      expect(createdUser?.name).toBe('Welcome Test');

      // Verify welcome email was called with correct data
      expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledTimes(1);
      expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledWith(
        'welcome-test@example.com',
        {
          user: {
            id: createdUser?.id,
            email: 'welcome-test@example.com',
            name: 'Welcome Test',
          },
          dashboardUrl: 'http://localhost:3000/dashboard',
        },
      );
    });

    it('should handle missing name gracefully', async () => {
      const userCreatedPayload = {
        type: 'user.created',
        object: 'event',
        id: 'evt_test_no_name',
        data: {
          id: 'user_no_name_123',
          email_addresses: [
            {
              id: 'email_no_name_test',
              email_address: 'noname-test@example.com',
              verification: {
                status: 'verified',
                strategy: 'email_code',
              },
            },
          ],
          primary_email_address_id: 'email_no_name_test',
          first_name: null,
          last_name: null,
          image_url: null,
          username: null,
          public_metadata: {},
          private_metadata: {},
          unsafe_metadata: {},
          created_at: Date.now(),
          updated_at: Date.now(),
        },
      };

      mockEmailService.sendWelcomeEmail.mockResolvedValue({ success: true });

      const request = new MockWebhookRequest(
        'http://localhost:3000/api/webhooks/clerk',
        userCreatedPayload,
        createWebhookHeaders(userCreatedPayload, WEBHOOK_SECRET),
      );

      const response = await POST(request);
      expect(response.status).toBe(200);

      // Verify welcome email was called with null name
      expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledWith(
        'noname-test@example.com',
        {
          user: {
            id: expect.any(String),
            email: 'noname-test@example.com',
            name: null,
          },
          dashboardUrl: 'http://localhost:3000/dashboard',
        },
      );
    });

    it('should continue webhook processing even if email fails', async () => {
      const userCreatedPayload = {
        type: 'user.created',
        object: 'event',
        id: 'evt_test_email_fail',
        data: {
          id: 'user_email_fail_123',
          email_addresses: [
            {
              id: 'email_fail_test',
              email_address: 'emailfail-test@example.com',
              verification: {
                status: 'verified',
                strategy: 'email_code',
              },
            },
          ],
          primary_email_address_id: 'email_fail_test',
          first_name: 'Email',
          last_name: 'Fail',
          image_url: null,
          username: null,
          public_metadata: {},
          private_metadata: {},
          unsafe_metadata: {},
          created_at: Date.now(),
          updated_at: Date.now(),
        },
      };

      // Mock email service failure
      mockEmailService.sendWelcomeEmail.mockResolvedValue({
        success: false,
        error: 'Email service unavailable',
      });

      const request = new MockWebhookRequest(
        'http://localhost:3000/api/webhooks/clerk',
        userCreatedPayload,
        createWebhookHeaders(userCreatedPayload, WEBHOOK_SECRET),
      );

      const response = await POST(request);
      const data = await response.json();

      // Webhook should still succeed even if email fails
      expect(response.status).toBe(200);
      expect(data.received).toBe(true);

      // Verify user was still created in database
      const createdUser = await testDb.query.users.findFirst({
        where: eq(users.clerkId, 'user_email_fail_123'),
      });

      expect(createdUser).toBeDefined();
      expect(createdUser?.email).toBe('emailfail-test@example.com');
      expect(createdUser?.name).toBe('Email Fail');

      // Verify email was attempted
      expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledTimes(1);
    });

    it('should not send welcome email on user.updated webhook', async () => {
      // First create a user with a valid UUID
      await testDb.insert(users).values({
        id: crypto.randomUUID(),
        clerkId: 'user_update_test_123',
        email: 'update-test@example.com',
        name: 'Update Test',
      });

      const userUpdatedPayload = {
        type: 'user.updated',
        object: 'event',
        id: 'evt_test_updated',
        data: {
          id: 'user_update_test_123',
          email_addresses: [
            {
              id: 'email_update_test',
              email_address: 'update-test@example.com',
              verification: {
                status: 'verified',
                strategy: 'email_code',
              },
            },
          ],
          primary_email_address_id: 'email_update_test',
          first_name: 'Updated',
          last_name: 'Name',
          image_url: null,
          username: null,
          public_metadata: {},
          private_metadata: {},
          unsafe_metadata: {},
          created_at: Date.now() - 86400000, // 1 day ago
          updated_at: Date.now(),
        },
      };

      const request = new MockWebhookRequest(
        'http://localhost:3000/api/webhooks/clerk',
        userUpdatedPayload,
        createWebhookHeaders(userUpdatedPayload, WEBHOOK_SECRET),
      );

      const response = await POST(request);
      expect(response.status).toBe(200);

      // Verify welcome email was NOT sent for user update
      expect(mockEmailService.sendWelcomeEmail).not.toHaveBeenCalled();
    });
  });
});
