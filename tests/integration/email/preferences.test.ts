/**
 * Integration tests for email preferences enforcement
 * Tests that marketing emails respect user preferences while transactional emails always go through
 */

// Mock the database operations
jest.mock('@/lib/db/index', () => ({
  db: {
    query: {
      users: {
        findFirst: jest.fn(),
      },
      userEmailPreferences: {
        findFirst: jest.fn(),
      },
    },
  },
}));

// Mock the email service
jest.mock('@/lib/email/service', () => ({
  emailService: {
    sendTestEmail: jest.fn(),
  },
}));

import { db } from '@/lib/db/index';
import { canSendEmailToUser, EmailType } from '@/lib/email/preferences';
import { emailService } from '@/lib/email/service';

const _mockEmailService = emailService as jest.Mocked<typeof emailService>;
const mockDb = db as jest.Mocked<typeof db>;

describe('Email Preferences Integration', () => {
  const testEmail = 'preferences-test@example.com';
  const testUserId = 'test-user-123';

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Marketing Email Enforcement', () => {
    it('should allow marketing emails when preferences are enabled', async () => {
      // Mock user found
      mockDb.query.users.findFirst.mockResolvedValue({
        id: testUserId,
        name: 'Test User',
      });

      // Mock user preferences showing marketing enabled
      mockDb.query.userEmailPreferences.findFirst.mockResolvedValue({
        userId: testUserId,
        marketingEnabled: true,
      });

      const result = await canSendEmailToUser(testEmail, EmailType.MARKETING);

      expect(result.canSend).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should block marketing emails when preferences are disabled', async () => {
      // Mock user preferences showing marketing disabled
      // Mock user found
      mockDb.query.users.findFirst.mockResolvedValue({
        id: testUserId,
        name: 'Test User',
      });

      // Mock user preferences showing marketing disabled
      mockDb.query.userEmailPreferences.findFirst.mockResolvedValue({
        userId: testUserId,
        marketingEnabled: false,
      });

      const result = await canSendEmailToUser(testEmail, EmailType.MARKETING);

      expect(result.canSend).toBe(false);
      expect(result.reason).toBe('User has opted out of marketing emails');
    });

    it('should allow marketing emails by default when no preference record exists', async () => {
      // Mock user found
      mockDb.query.users.findFirst.mockResolvedValue({
        id: testUserId,
        name: 'Test User',
      });

      // Mock no preferences found (undefined)
      mockDb.query.userEmailPreferences.findFirst.mockResolvedValue(undefined);

      const result = await canSendEmailToUser(testEmail, EmailType.MARKETING);

      expect(result.canSend).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });

  describe('Transactional Email Enforcement', () => {
    it('should always allow transactional emails regardless of preferences', async () => {
      // Mock user found for transactional email
      mockDb.query.users.findFirst.mockResolvedValue({
        id: testUserId,
        name: 'Test User',
      });

      const result = await canSendEmailToUser(
        testEmail,
        EmailType.TRANSACTIONAL,
      );

      expect(result.canSend).toBe(true);
      expect(result.reason).toBeUndefined();
      // Should not query preferences for transactional emails
      expect(
        mockDb.query.userEmailPreferences.findFirst,
      ).not.toHaveBeenCalled();
    });
  });
});
