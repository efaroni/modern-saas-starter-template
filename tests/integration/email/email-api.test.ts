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
import { users, emailPreferences, emailLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Mock Next.js auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// Mock email service to avoid actual email sending
jest.mock('@/lib/email/service', () => ({
  emailService: {
    sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true }),
    sendVerificationEmail: jest.fn().mockResolvedValue({ success: true }),
    sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true }),
    sendSubscriptionConfirmationEmail: jest
      .fn()
      .mockResolvedValue({ success: true }),
    sendSubscriptionEndingEmail: jest.fn().mockResolvedValue({ success: true }),
  },
}));

describe('Email API Integration Tests', () => {
  let testUserId: string;
  let testEmail: string;

  beforeAll(async () => {
    await testHelpers.setupTest();
  });

  afterAll(async () => {
    await testHelpers.teardownTest();
  });

  beforeEach(async () => {
    await authTestHelpers.cleanupAuthData();

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
  });

  afterEach(async () => {
    await authTestHelpers.cleanupAuthData();
    jest.clearAllMocks();
  });

  describe('POST /api/emails/send', () => {
    // Note: This endpoint only works in development mode
    const originalNodeEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should send welcome email in development mode', async () => {
      process.env.NODE_ENV = 'development';

      const { POST } = await import('@/app/api/emails/send/route');

      const request = new Request('http://localhost:3000/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          templateType: 'welcome',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify email service was called
      const { emailService } = require('@/lib/email/service');
      expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith(
        testEmail,
        expect.objectContaining({
          user: { email: testEmail, name: 'Test User' },
          dashboardUrl: 'http://localhost:3000/dashboard',
        }),
      );
    });

    it('should send verification email in development mode', async () => {
      process.env.NODE_ENV = 'development';

      const { POST } = await import('@/app/api/emails/send/route');

      const request = new Request('http://localhost:3000/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          templateType: 'verification',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const { emailService } = require('@/lib/email/service');
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        testEmail,
        expect.objectContaining({
          user: { email: testEmail, name: 'Test User' },
          verificationToken: 'test-token-123',
        }),
      );
    });

    it('should send password reset email in development mode', async () => {
      process.env.NODE_ENV = 'development';

      const { POST } = await import('@/app/api/emails/send/route');

      const request = new Request('http://localhost:3000/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          templateType: 'password_reset',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const { emailService } = require('@/lib/email/service');
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        testEmail,
        expect.objectContaining({
          user: { email: testEmail, name: 'Test User' },
          resetToken: 'reset-token-123',
        }),
      );
    });

    it('should reject requests in production mode', async () => {
      process.env.NODE_ENV = 'production';

      const { POST } = await import('@/app/api/emails/send/route');

      const request = new Request('http://localhost:3000/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          templateType: 'welcome',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Test emails only available in development');
    });

    it('should validate email format', async () => {
      process.env.NODE_ENV = 'development';

      const { POST } = await import('@/app/api/emails/send/route');

      const request = new Request('http://localhost:3000/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email',
          templateType: 'welcome',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should validate template type', async () => {
      process.env.NODE_ENV = 'development';

      const { POST } = await import('@/app/api/emails/send/route');

      const request = new Request('http://localhost:3000/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          templateType: 'invalid_template',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('GET /api/emails/preferences', () => {
    it('should get email preferences for authenticated user', async () => {
      // Mock authenticated user
      const { auth } = require('@/lib/auth');
      auth.mockResolvedValue({
        user: {
          id: testUserId,
          email: testEmail,
          name: 'Test User',
        },
      });

      const { GET } = await import('@/app/api/emails/preferences/route');

      const request = new Request(
        'http://localhost:3000/api/emails/preferences',
        {
          method: 'GET',
        },
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        userId: testUserId,
        marketingEmails: true, // Default value
      });
    });

    it('should create default preferences if none exist', async () => {
      const { auth } = require('@/lib/auth');
      auth.mockResolvedValue({
        user: {
          id: testUserId,
          email: testEmail,
          name: 'Test User',
        },
      });

      const { GET } = await import('@/app/api/emails/preferences/route');

      const request = new Request(
        'http://localhost:3000/api/emails/preferences',
        {
          method: 'GET',
        },
      );

      await GET(request);

      // Verify preferences were created in database
      const preferences = await testDb.query.emailPreferences.findFirst({
        where: eq(emailPreferences.userId, testUserId),
      });

      expect(preferences).toBeDefined();
      expect(preferences?.marketingEmails).toBe(true);
    });

    it('should return 401 for unauthenticated user', async () => {
      const { auth } = require('@/lib/auth');
      auth.mockResolvedValue(null);

      const { GET } = await import('@/app/api/emails/preferences/route');

      const request = new Request(
        'http://localhost:3000/api/emails/preferences',
        {
          method: 'GET',
        },
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('PUT /api/emails/preferences', () => {
    it('should update email preferences for authenticated user', async () => {
      const { auth } = require('@/lib/auth');
      auth.mockResolvedValue({
        user: {
          id: testUserId,
          email: testEmail,
          name: 'Test User',
        },
      });

      const { PUT } = await import('@/app/api/emails/preferences/route');

      const request = new Request(
        'http://localhost:3000/api/emails/preferences',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            marketingEmails: false,
          }),
        },
      );

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.marketingEmails).toBe(false);

      // Verify in database
      const preferences = await testDb.query.emailPreferences.findFirst({
        where: eq(emailPreferences.userId, testUserId),
      });

      expect(preferences?.marketingEmails).toBe(false);
    });

    it('should create preferences if they do not exist', async () => {
      const { auth } = require('@/lib/auth');
      auth.mockResolvedValue({
        user: {
          id: testUserId,
          email: testEmail,
          name: 'Test User',
        },
      });

      const { PUT } = await import('@/app/api/emails/preferences/route');

      const request = new Request(
        'http://localhost:3000/api/emails/preferences',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            marketingEmails: false,
          }),
        },
      );

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.marketingEmails).toBe(false);
    });

    it('should return 401 for unauthenticated user', async () => {
      const { auth } = require('@/lib/auth');
      auth.mockResolvedValue(null);

      const { PUT } = await import('@/app/api/emails/preferences/route');

      const request = new Request(
        'http://localhost:3000/api/emails/preferences',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            marketingEmails: false,
          }),
        },
      );

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    it('should validate request body', async () => {
      const { auth } = require('@/lib/auth');
      auth.mockResolvedValue({
        user: {
          id: testUserId,
          email: testEmail,
          name: 'Test User',
        },
      });

      const { PUT } = await import('@/app/api/emails/preferences/route');

      const request = new Request(
        'http://localhost:3000/api/emails/preferences',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            marketingEmails: 'invalid', // Should be boolean
          }),
        },
      );

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/emails/unsubscribe', () => {
    it('should unsubscribe user with valid token', async () => {
      const { generateUnsubscribeToken } = await import(
        '@/app/api/emails/unsubscribe/route'
      );
      const validToken = generateUnsubscribeToken(testEmail);

      const { POST } = await import('@/app/api/emails/unsubscribe/route');

      const request = new Request(
        'http://localhost:3000/api/emails/unsubscribe',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: testEmail,
            token: validToken,
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe(
        'Successfully unsubscribed from marketing emails',
      );

      // Verify preferences were updated in database
      const preferences = await testDb.query.emailPreferences.findFirst({
        where: eq(emailPreferences.userId, testUserId),
      });

      expect(preferences?.marketingEmails).toBe(false);
    });

    it('should reject invalid token', async () => {
      const { POST } = await import('@/app/api/emails/unsubscribe/route');

      const request = new Request(
        'http://localhost:3000/api/emails/unsubscribe',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: testEmail,
            token: 'invalid-token',
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid unsubscribe token');
    });

    it('should return 404 for non-existent user', async () => {
      const nonExistentEmail = 'nonexistent@example.com';
      const { generateUnsubscribeToken } = await import(
        '@/app/api/emails/unsubscribe/route'
      );
      const validToken = generateUnsubscribeToken(nonExistentEmail);

      const { POST } = await import('@/app/api/emails/unsubscribe/route');

      const request = new Request(
        'http://localhost:3000/api/emails/unsubscribe',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: nonExistentEmail,
            token: validToken,
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User not found');
    });

    it('should validate request body', async () => {
      const { POST } = await import('@/app/api/emails/unsubscribe/route');

      const request = new Request(
        'http://localhost:3000/api/emails/unsubscribe',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'invalid-email', // Invalid email format
            token: 'some-token',
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('GET /api/emails/unsubscribe', () => {
    it('should return HTML success page for valid unsubscribe', async () => {
      const { generateUnsubscribeToken } = await import(
        '@/app/api/emails/unsubscribe/route'
      );
      const validToken = generateUnsubscribeToken(testEmail);

      const { GET } = await import('@/app/api/emails/unsubscribe/route');

      const request = new Request(
        `http://localhost:3000/api/emails/unsubscribe?email=${encodeURIComponent(testEmail)}&token=${validToken}`,
        { method: 'GET' },
      );

      const response = await GET(request);
      const html = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/html');
      expect(html).toContain('Unsubscribed Successfully');
      expect(html).toContain(testEmail);

      // Verify preferences were updated
      const preferences = await testDb.query.emailPreferences.findFirst({
        where: eq(emailPreferences.userId, testUserId),
      });

      expect(preferences?.marketingEmails).toBe(false);
    });

    it('should return HTML error page for invalid token', async () => {
      const { GET } = await import('@/app/api/emails/unsubscribe/route');

      const request = new Request(
        `http://localhost:3000/api/emails/unsubscribe?email=${encodeURIComponent(testEmail)}&token=invalid-token`,
        { method: 'GET' },
      );

      const response = await GET(request);
      const html = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/html');
      expect(html).toContain('Invalid unsubscribe link');
    });

    it('should return HTML error page for missing parameters', async () => {
      const { GET } = await import('@/app/api/emails/unsubscribe/route');

      const request = new Request(
        'http://localhost:3000/api/emails/unsubscribe?email=test@example.com',
        { method: 'GET' },
      );

      const response = await GET(request);
      const html = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/html');
      expect(html).toContain('Invalid unsubscribe link');
    });
  });
});
