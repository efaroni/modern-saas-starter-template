/**
 * Integration tests for protected route authentication
 * Tests that unauthenticated requests are rejected and authenticated requests are allowed
 */

import { NextRequest } from 'next/server';

import { POST as aiAnalyzePost } from '@/app/api/ai/analyze-design/route';
import { POST as billingPortalPost } from '@/app/api/billing/portal/route';
import { testUsers } from '@/tests/fixtures/clerk';

// Mock Clerk auth
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(),
}));

// Mock rate limiter
jest.mock('@/lib/middleware/rate-limit', () => ({
  applyRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
}));

// Mock database
jest.mock('@/lib/db', () => ({
  db: {
    query: {
      users: {
        findFirst: jest.fn(),
      },
      userApiKeys: {
        findFirst: jest.fn(),
      },
    },
  },
}));

// Mock vision service
jest.mock('@/lib/ai/vision/service', () => ({
  createVisionService: jest.fn().mockReturnValue({
    analyzeDesign: jest.fn().mockResolvedValue({
      success: true,
      data: { analysis: 'test' },
    }),
  }),
  hasValidOpenAIKey: jest.fn().mockResolvedValue(true),
}));

// Mock Stripe
const mockStripeSessionCreate = jest.fn().mockResolvedValue({
  url: 'https://billing.stripe.com/session/test',
});

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    billingPortal: {
      sessions: {
        create: mockStripeSessionCreate,
      },
    },
  }));
});

import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

const mockAuth = auth as jest.Mock;
const mockDb = db as any;

// Mock NextRequest with formData support
class MockNextRequest extends NextRequest {
  private _formData: FormData;
  private _json: any;

  constructor(
    url: string,
    init: RequestInit & { formData?: FormData; json?: any } = {},
  ) {
    super(url, init);
    this._formData = init.formData || new FormData();
    this._json = init.json || {};
  }

  async formData(): Promise<FormData> {
    return this._formData;
  }

  async json(): Promise<any> {
    return this._json;
  }
}

describe('Protected Routes Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock database responses
    mockDb.query.users.findFirst.mockResolvedValue({
      id: testUsers.basic.id,
      email: testUsers.basic.emailAddresses[0].emailAddress,
    });
    mockDb.query.userApiKeys.findFirst.mockResolvedValue({
      userId: testUsers.basic.id,
      provider: 'openai',
      privateKeyEncrypted: 'encrypted_key',
    });
  });

  describe('/api/ai/analyze-design', () => {
    it('should reject unauthenticated requests', async () => {
      // Mock unauthenticated state
      mockAuth.mockResolvedValue({ userId: null });

      const formData = new FormData();
      formData.append('images', new Blob(['test'], { type: 'image/png' }));

      const request = new MockNextRequest(
        'http://localhost:3000/api/ai/analyze-design',
        {
          method: 'POST',
          formData: formData,
        },
      );

      const response = await aiAnalyzePost(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should allow authenticated requests', async () => {
      // Mock authenticated state
      mockAuth.mockResolvedValue({ userId: testUsers.basic.id });

      const formData = new FormData();
      formData.append('images', new Blob(['test'], { type: 'image/png' }));

      const request = new MockNextRequest(
        'http://localhost:3000/api/ai/analyze-design',
        {
          method: 'POST',
          formData: formData,
        },
      );

      const response = await aiAnalyzePost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockAuth).toHaveBeenCalled();
    });
  });

  describe('/api/billing/portal', () => {
    it('should reject unauthenticated requests', async () => {
      // Mock unauthenticated state
      mockAuth.mockResolvedValue({ userId: null });

      const request = new MockNextRequest(
        'http://localhost:3000/api/billing/portal',
        {
          method: 'POST',
          json: {},
        },
      );

      const response = await billingPortalPost(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should allow authenticated requests', async () => {
      // Mock authenticated state
      mockAuth.mockResolvedValue({ userId: testUsers.basic.id });

      const request = new MockNextRequest(
        'http://localhost:3000/api/billing/portal',
        {
          method: 'POST',
          json: {},
        },
      );

      const response = await billingPortalPost(request);

      // The main test is that it doesn't return 401 (unauthorized)
      expect(response.status).not.toBe(401);
      expect(mockAuth).toHaveBeenCalled();
    });
  });

  describe('Authentication middleware behavior', () => {
    it('should call auth() function on protected routes', async () => {
      // Mock authenticated state
      mockAuth.mockResolvedValue({ userId: testUsers.basic.id });

      const formData = new FormData();
      formData.append('images', new Blob(['test'], { type: 'image/png' }));

      const request = new MockNextRequest(
        'http://localhost:3000/api/ai/analyze-design',
        {
          method: 'POST',
          formData: formData,
        },
      );

      await aiAnalyzePost(request);

      expect(mockAuth).toHaveBeenCalledTimes(1);
    });

    it('should handle loading auth state gracefully', async () => {
      // Mock loading state (undefined userId)
      mockAuth.mockResolvedValue({ userId: undefined });

      const formData = new FormData();
      formData.append('images', new Blob(['test'], { type: 'image/png' }));

      const request = new MockNextRequest(
        'http://localhost:3000/api/ai/analyze-design',
        {
          method: 'POST',
          formData: formData,
        },
      );

      const response = await aiAnalyzePost(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });
});
