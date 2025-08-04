/**
 * Unit tests for /api/billing/portal route
 * Tests authentication and Stripe portal session creation
 */

import { NextRequest } from 'next/server';

import { testUsers } from '@/tests/fixtures/clerk';

// Mock Clerk auth directly
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(),
}));

// Get the mocked auth function
import { auth } from '@clerk/nextjs/server';
const mockAuth = auth as jest.Mock;

// Helper functions for auth mocking
const mockAuthenticatedUser = (user: any) => {
  mockAuth.mockResolvedValue({ userId: user.id });
  return user;
};

const mockUnauthenticatedUser = () => {
  mockAuth.mockResolvedValue({ userId: null });
};

// Mock database
jest.mock('@/lib/db', () => ({
  db: {
    query: {
      users: {
        findFirst: jest.fn(),
      },
    },
  },
}));

// Mock billing service
jest.mock('@/lib/billing/service', () => ({
  billingService: {
    createCustomer: jest.fn(),
    createPortalSession: jest.fn(),
  },
}));

// Import the route handler after mocks are setup
import { POST } from '@/app/api/billing/portal/route';
import { billingService } from '@/lib/billing/service';
import { db } from '@/lib/db';

const mockCreateCustomer = billingService.createCustomer as jest.Mock;
const mockCreatePortalSession = billingService.createPortalSession as jest.Mock;

describe('POST /api/billing/portal', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup billing service mock defaults
    mockCreateCustomer.mockResolvedValue({ customerId: 'cus_test_123' });
    mockCreatePortalSession.mockResolvedValue({
      url: 'https://billing.stripe.com/session/test_123',
    });
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser();

      // Ensure database mock doesn't interfere with auth check
      (db.query.users.findFirst as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost:3000/api/billing/portal',
        {
          method: 'POST',
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        success: false,
        error: 'Unauthorized',
      });
      expect(mockCreatePortalSession).not.toHaveBeenCalled();
    });

    it('should process request for authenticated users', async () => {
      const user = mockAuthenticatedUser(testUsers.basic);

      // Mock database response with billing customer ID
      (db.query.users.findFirst as jest.Mock).mockResolvedValue({
        id: user.id,
        email: user.emailAddresses[0].emailAddress,
        billingCustomerId: 'cus_test_123',
      });

      // Mock successful portal session creation
      mockCreatePortalSession.mockResolvedValue({
        url: 'https://billing.stripe.com/session/test_123',
      });

      const request = new NextRequest(
        'http://localhost:3000/api/billing/portal',
        {
          method: 'POST',
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.portalUrl).toBe(
        'https://billing.stripe.com/session/test_123',
      );
      expect(mockAuth).toHaveBeenCalled();
      expect(mockCreatePortalSession).toHaveBeenCalledWith(
        'cus_test_123',
        'http://localhost:3000/dashboard',
      );
    });
  });

  describe('Customer Validation', () => {
    beforeEach(() => {
      mockAuthenticatedUser(testUsers.basic);
    });

    it('should create customer and portal session when user exists', async () => {
      // Mock user - route will create customer automatically now
      (db.query.users.findFirst as jest.Mock).mockResolvedValue({
        id: testUsers.basic.id,
        email: testUsers.basic.emailAddresses[0].emailAddress,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/billing/portal',
        {
          method: 'POST',
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.portalUrl).toBe(
        'https://billing.stripe.com/session/test_123',
      );
      expect(mockCreateCustomer).toHaveBeenCalledWith(
        testUsers.basic.emailAddresses[0].emailAddress,
      );
      expect(mockCreatePortalSession).toHaveBeenCalledWith(
        'cus_test_123',
        'http://localhost:3000/dashboard',
      );
    });

    it('should handle billing service errors gracefully', async () => {
      (db.query.users.findFirst as jest.Mock).mockResolvedValue({
        id: testUsers.basic.id,
        email: testUsers.basic.emailAddresses[0].emailAddress,
      });

      // Mock billing service error - createCustomer succeeds but portal creation fails
      mockCreateCustomer.mockResolvedValue({ customerId: 'cus_test_123' });
      mockCreatePortalSession.mockRejectedValue(new Error('Stripe API error'));

      const request = new NextRequest(
        'http://localhost:3000/api/billing/portal',
        {
          method: 'POST',
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to create portal session');
    });
  });
});
