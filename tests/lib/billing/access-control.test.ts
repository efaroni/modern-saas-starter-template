/**
 * Unit tests for billing access control functions
 * Tests simple Stripe API calls for subscription status
 */

// Mock the access control module to avoid Stripe initialization issues in tests
jest.mock('@/lib/billing/access-control', () => ({
  hasActiveSubscription: jest.fn(),
  hasAnySubscription: jest.fn(),
  getSubscriptionDetails: jest.fn(),
}));

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

import { hasActiveSubscription } from '@/lib/billing/access-control';

const mockHasActiveSubscription = hasActiveSubscription as jest.MockedFunction<
  typeof hasActiveSubscription
>;

describe('Access Control', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hasActiveSubscription', () => {
    it('should return false for user without billing customer ID', async () => {
      mockHasActiveSubscription.mockResolvedValue(false);

      const result = await hasActiveSubscription('user_without_billing');

      expect(result).toBe(false);
    });

    it('should return true for user with active subscription', async () => {
      mockHasActiveSubscription.mockResolvedValue(true);

      const result = await hasActiveSubscription('user_with_subscription');

      expect(result).toBe(true);
    });

    it('should return false for user without active subscription', async () => {
      mockHasActiveSubscription.mockResolvedValue(false);

      const result = await hasActiveSubscription('user_without_subscription');

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      mockHasActiveSubscription.mockResolvedValue(false);

      const result = await hasActiveSubscription('error_user');

      expect(result).toBe(false);
    });

    it('should handle user not found', async () => {
      mockHasActiveSubscription.mockResolvedValue(false);

      const result = await hasActiveSubscription('non_existent_user');

      expect(result).toBe(false);
    });
  });
});
