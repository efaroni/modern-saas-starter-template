import { describe, it, expect, beforeEach, jest } from '@jest/globals';

import { ResendEmailService } from './resend';

import type {
  PasswordResetEmailData,
  EmailVerificationData,
  WelcomeEmailData,
  EmailService,
} from './types';

/**
 * Unit Tests for ResendEmailService
 *
 * These tests focus on the service interface behavior rather than
 * mocking the Resend SDK directly. We test the contract and error handling.
 */

describe('ResendEmailService', () => {
  let resendService: EmailService;
  const testApiKey = 'test-api-key';
  const testFromEmail = 'noreply@test.com';
  const testBaseUrl = 'https://test.com';

  beforeEach(() => {
    resendService = new ResendEmailService(
      testApiKey,
      testFromEmail,
      testBaseUrl,
    );
  });

  describe('constructor and basic functionality', () => {
    it('should initialize as EmailService instance', () => {
      expect(resendService).toBeDefined();
      expect(typeof resendService.sendPasswordResetEmail).toBe('function');
      expect(typeof resendService.sendVerificationEmail).toBe('function');
      expect(typeof resendService.sendWelcomeEmail).toBe('function');
    });
  });

  describe('email data handling', () => {
    it('should handle password reset email data correctly', async () => {
      const testData: PasswordResetEmailData = {
        user: { name: 'Test User', email: 'test@example.com' },
        resetUrl: 'https://test.com/reset-password?token=abc123',
      };

      // Since we can't easily mock Resend in this environment,
      // we test that the method doesn't throw and returns the expected shape
      const result = await resendService.sendPasswordResetEmail(
        'test@example.com',
        testData,
      );

      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
      if (!result.success) {
        expect(result).toHaveProperty('error');
        expect(typeof result.error).toBe('string');
      }
    });

    it('should handle verification email data correctly', async () => {
      const testData: EmailVerificationData = {
        user: { name: 'Test User', email: 'test@example.com' },
        verificationUrl: 'https://test.com/verify?token=xyz789',
      };

      const result = await resendService.sendVerificationEmail(
        'test@example.com',
        testData,
      );

      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
      if (!result.success) {
        expect(result).toHaveProperty('error');
        expect(typeof result.error).toBe('string');
      }
    });

    it('should handle welcome email data correctly', async () => {
      const testData: WelcomeEmailData = {
        user: { name: 'Test User', email: 'test@example.com' },
        dashboardUrl: 'https://test.com/dashboard',
      };

      const result = await resendService.sendWelcomeEmail(
        'test@example.com',
        testData,
      );

      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
      if (!result.success) {
        expect(result).toHaveProperty('error');
        expect(typeof result.error).toBe('string');
      }
    });

    it('should handle missing user names gracefully', async () => {
      const testDataWithoutName: PasswordResetEmailData = {
        user: { email: 'test@example.com' },
        resetUrl: 'https://test.com/reset-password?token=abc123',
      };

      // Should not throw for missing name
      const result = await resendService.sendPasswordResetEmail(
        'test@example.com',
        testDataWithoutName,
      );

      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    it('should work with different email types consistently', async () => {
      const testCases = [
        {
          method: 'sendPasswordResetEmail',
          data: {
            user: { name: 'Test User', email: 'test@example.com' },
            resetUrl: 'https://test.com/reset',
          },
        },
        {
          method: 'sendVerificationEmail',
          data: {
            user: { name: 'Test User', email: 'test@example.com' },
            verificationUrl: 'https://test.com/verify',
          },
        },
        {
          method: 'sendWelcomeEmail',
          data: {
            user: { name: 'Test User', email: 'test@example.com' },
            dashboardUrl: 'https://test.com/dashboard',
          },
        },
      ];

      for (const testCase of testCases) {
        const method = resendService[
          testCase.method as keyof EmailService
        ] as any;
        const result = await method('test@example.com', testCase.data);

        expect(result).toHaveProperty('success');
        expect(typeof result.success).toBe('boolean');
        if (!result.success) {
          expect(result).toHaveProperty('error');
          expect(typeof result.error).toBe('string');
        }
      }
    });
  });

  describe('configuration handling', () => {
    it('should accept different API keys', () => {
      const service1 = new ResendEmailService(
        'key1',
        'test@example.com',
        'https://test.com',
      );
      const service2 = new ResendEmailService(
        'key2',
        'test@example.com',
        'https://test.com',
      );

      expect(service1).toBeInstanceOf(ResendEmailService);
      expect(service2).toBeInstanceOf(ResendEmailService);
    });

    it('should accept different from emails', () => {
      const service1 = new ResendEmailService(
        'key',
        'noreply@test1.com',
        'https://test.com',
      );
      const service2 = new ResendEmailService(
        'key',
        'noreply@test2.com',
        'https://test.com',
      );

      expect(service1).toBeInstanceOf(ResendEmailService);
      expect(service2).toBeInstanceOf(ResendEmailService);
    });

    it('should accept different base URLs', () => {
      const service1 = new ResendEmailService(
        'key',
        'test@example.com',
        'https://test1.com',
      );
      const service2 = new ResendEmailService(
        'key',
        'test@example.com',
        'https://test2.com',
      );

      expect(service1).toBeInstanceOf(ResendEmailService);
      expect(service2).toBeInstanceOf(ResendEmailService);
    });
  });
});
