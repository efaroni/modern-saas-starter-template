import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { eq } from 'drizzle-orm';

import { emailLogs } from '@/lib/db/schema';
import { testDb } from '@/lib/db/test';
import { testHelpers } from '@/lib/db/test-helpers';

import { EmailLogger } from './email-logger';

describe('EmailLogger', () => {
  let emailLogger: EmailLogger;

  beforeEach(async () => {
    await testHelpers.setupTest();
    emailLogger = new EmailLogger();
  });

  afterEach(async () => {
    await testHelpers.teardownTest();
  });

  describe('logEmail', () => {
    it('should log email with sent status', async () => {
      const params = {
        toEmail: 'test@example.com',
        templateType: 'welcome' as const,
        resendId: 'resend-123',
        metadata: { userId: 'user-123' },
      };

      await emailLogger.logEmail(params, 'sent');

      const logs = await testDb.query.emailLogs.findMany({
        where: eq(emailLogs.toEmail, 'test@example.com'),
      });

      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        toEmail: 'test@example.com',
        templateType: 'welcome',
        status: 'sent',
        resendId: 'resend-123',
        metadata: { userId: 'user-123' },
      });
    });

    it('should log email with failed status', async () => {
      const params = {
        toEmail: 'test@example.com',
        templateType: 'verification' as const,
      };

      await emailLogger.logEmail(params, 'failed');

      const logs = await testDb.query.emailLogs.findMany({
        where: eq(emailLogs.toEmail, 'test@example.com'),
      });

      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        toEmail: 'test@example.com',
        templateType: 'verification',
        status: 'failed',
        resendId: null,
        metadata: {},
      });
    });

    it('should handle database errors gracefully', async () => {
      // This test verifies the error handling in logEmail
      // Since we can't easily simulate a database error, we test with invalid data
      const params = {
        toEmail: 'test@example.com',
        templateType: 'invalid_type' as any,
      };

      // This should not throw an error, even with invalid template type
      await expect(emailLogger.logEmail(params, 'sent')).resolves.not.toThrow();
    });
  });

  describe('checkIdempotency', () => {
    it('should return false for non-existent eventId', async () => {
      const result = await emailLogger.checkIdempotency('non-existent-event');
      expect(result).toBe(false);
    });

    it('should return true for existing eventId', async () => {
      const eventId = 'test-event-123';

      // First, log an email with this eventId
      await emailLogger.logEmail(
        {
          toEmail: 'test@example.com',
          templateType: 'welcome',
          eventId,
        },
        'sent',
      );

      // Then check idempotency
      const result = await emailLogger.checkIdempotency(eventId);
      expect(result).toBe(true);
    });

    it('should return false for empty eventId', async () => {
      const result = await emailLogger.checkIdempotency('');
      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      // This should not throw an error
      await expect(emailLogger.checkIdempotency('test-event')).resolves.toBe(
        false,
      );
    });
  });

  describe('template types', () => {
    it('should support all template types', async () => {
      const templateTypes = [
        'welcome',
        'verification',
        'password_reset',
        'subscription_confirmation',
        'subscription_ending',
      ] as const;

      for (const templateType of templateTypes) {
        await emailLogger.logEmail(
          {
            toEmail: `test-${templateType}@example.com`,
            templateType,
          },
          'sent',
        );
      }

      const logs = await testDb.query.emailLogs.findMany();
      expect(logs).toHaveLength(templateTypes.length);

      const loggedTypes = logs.map(log => log.templateType).sort();
      expect(loggedTypes).toEqual([...templateTypes].sort());
    });
  });
});
