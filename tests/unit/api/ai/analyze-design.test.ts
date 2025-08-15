/**
 * Unit tests for /api/ai/analyze-design route
 * Tests authentication requirements and basic functionality
 */

import { NextRequest } from 'next/server';

// Mock NextRequest with formData support
class MockNextRequest extends NextRequest {
  private _formData: FormData;

  constructor(url: string, init: RequestInit & { formData?: FormData } = {}) {
    const { formData, signal, ...requestInit } = init;
    super(url, { ...requestInit, signal: signal ?? undefined });
    this._formData = formData || new FormData();
  }

  formData(): Promise<FormData> {
    return Promise.resolve(this._formData);
  }
}

// Mock Clerk auth directly
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(),
}));

// Get the mocked auth function
import { auth } from '@clerk/nextjs/server';
const mockAuth = auth as unknown as jest.Mock;

// Helper functions for auth mocking
const mockAuthenticatedUser = (user: { id: string }) => {
  mockAuth.mockResolvedValue({ userId: user.id });
  return user;
};

const mockUnauthenticatedUser = () => {
  mockAuth.mockResolvedValue({ userId: null });
};

// Mock the rate limiter
jest.mock('@/lib/middleware/rate-limit', () => ({
  applyRateLimit: jest.fn().mockReturnValue({ allowed: true }),
}));

// Mock the vision service
jest.mock('@/lib/ai/vision/service', () => ({
  createVisionService: jest.fn().mockReturnValue({
    analyzeDesign: jest.fn().mockResolvedValue({
      success: true,
      data: {
        colors: { primary: ['#000000'] },
        typography: { headings: [] },
        spacing: { scale: [] },
        analysis: { summary: 'Test analysis' },
      },
    }),
  }),
  hasValidOpenAIKey: jest.fn().mockResolvedValue(true),
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

// Mock rate limiting middleware
jest.mock('@/lib/middleware/rate-limit', () => ({
  applyRateLimit: jest.fn(() => ({ allowed: true, retryAfter: 0 })),
}));

// Import the route handler after mocks are setup
import { POST } from '@/app/api/ai/analyze-design/route';
import { db } from '@/lib/db';
import { applyRateLimit } from '@/lib/middleware/rate-limit';
import { testUsers } from '@/tests/fixtures/clerk';

describe('POST /api/ai/analyze-design', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      // Mock unauthenticated state
      mockUnauthenticatedUser();

      // Create mock request
      const formData = new FormData();
      formData.append('images', new Blob(['test'], { type: 'image/png' }));

      const request = new MockNextRequest(
        'http://localhost:3000/api/ai/analyze-design',
        {
          method: 'POST',
          formData: formData,
        },
      );

      // Call the handler
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        error: 'Unauthorized',
      });
    });

    it('should allow authenticated users to access the endpoint', async () => {
      // Mock authenticated user
      const user = mockAuthenticatedUser(testUsers.basic);

      // Mock database responses
      (db.query.users.findFirst as jest.Mock).mockResolvedValue({
        id: user.id,
        email: (user as any).emailAddresses[0].emailAddress,
      });

      (db.query.userApiKeys.findFirst as jest.Mock).mockResolvedValue({
        userId: user.id,
        provider: 'openai',
        privateKeyEncrypted: 'encrypted_key',
      });

      // Create mock request with image
      const formData = new FormData();
      formData.append('images', new Blob(['test'], { type: 'image/png' }));

      const request = new MockNextRequest(
        'http://localhost:3000/api/ai/analyze-design',
        {
          method: 'POST',
          formData: formData,
        },
      );

      // Call the handler
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(mockAuth).toHaveBeenCalled();
    });
  });

  describe('Input Validation', () => {
    beforeEach(() => {
      // Setup authenticated user for all validation tests
      const user = mockAuthenticatedUser(testUsers.basic);

      (db.query.users.findFirst as jest.Mock).mockResolvedValue({
        id: user.id,
        email: (user as any).emailAddresses[0].emailAddress,
      });

      (db.query.userApiKeys.findFirst as jest.Mock).mockResolvedValue({
        userId: user.id,
        provider: 'openai',
        privateKeyEncrypted: 'encrypted_key',
      });
    });

    it('should return 400 when no images are provided', async () => {
      const formData = new FormData();

      const request = new MockNextRequest(
        'http://localhost:3000/api/ai/analyze-design',
        {
          method: 'POST',
          formData: formData,
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid input');
      expect(data.details).toBeDefined();
    });

    it('should work with mock service in test environment', async () => {
      // In test environment, it always uses MockVisionService regardless of API key
      (db.query.userApiKeys.findFirst as jest.Mock).mockResolvedValue(null);

      const formData = new FormData();
      formData.append('images', new Blob(['test'], { type: 'image/png' }));

      const request = new MockNextRequest(
        'http://localhost:3000/api/ai/analyze-design',
        {
          method: 'POST',
          formData: formData,
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should respect rate limits', async () => {
      // Mock rate limit exceeded
      (
        applyRateLimit as jest.MockedFunction<typeof applyRateLimit>
      ).mockReturnValueOnce({
        allowed: false,
        retryAfter: 60,
      });

      mockAuthenticatedUser(testUsers.basic);

      const formData = new FormData();
      formData.append('images', new Blob(['test'], { type: 'image/png' }));

      const request = new MockNextRequest(
        'http://localhost:3000/api/ai/analyze-design',
        {
          method: 'POST',
          formData: formData,
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Rate limit exceeded');
    });
  });
});
