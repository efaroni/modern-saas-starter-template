import { describe, it, expect, beforeEach } from '@jest/globals';

import { MockEmailService } from './mock';

describe('MockEmailService', () => {
  let service: MockEmailService;

  beforeEach(() => {
    service = new MockEmailService();
  });

  describe('existing methods', () => {
    it('should always return success for password reset email', async () => {
      const result = await service.sendPasswordResetEmail('test@example.com', {
        resetToken: 'token',
        resetUrl: 'url',
        user: { email: 'test@example.com' },
      });

      expect(result.success).toBe(true);

      const sentEmails = service.getSentEmails();
      expect(sentEmails).toHaveLength(1);
      expect(sentEmails[0].type).toBe('password_reset');
      expect(sentEmails[0].to).toBe('test@example.com');
    });

    it('should track sent emails', async () => {
      await service.sendPasswordResetEmail('user1@example.com', {
        resetToken: 'token1',
        resetUrl: 'url1',
        user: { email: 'user1@example.com' },
      });

      await service.sendVerificationEmail('user2@example.com', {
        verificationToken: 'token2',
        verificationUrl: 'url2',
        user: { email: 'user2@example.com' },
      });

      const sentEmails = service.getSentEmails();
      expect(sentEmails).toHaveLength(2);
      expect(sentEmails[0].type).toBe('password_reset');
      expect(sentEmails[1].type).toBe('verification');
    });
  });

  describe('new billing methods', () => {
    it('should return success for payment success email', async () => {
      const result = await service.sendPaymentSuccessEmail('test@example.com', {
        user: { email: 'test@example.com', name: 'Test User' },
        amount: 2000,
        currency: 'usd',
        invoiceUrl: 'https://invoice.test',
      });

      expect(result.success).toBe(true);

      const sentEmails = service.getSentEmails();
      expect(sentEmails).toHaveLength(1);
      expect(sentEmails[0].type).toBe('payment_success');
      expect(sentEmails[0].to).toBe('test@example.com');
    });

    it('should return success for payment failed email', async () => {
      const result = await service.sendPaymentFailedEmail('test@example.com', {
        user: { email: 'test@example.com', name: 'Test User' },
        amount: 2000,
        currency: 'usd',
      });

      expect(result.success).toBe(true);

      const sentEmails = service.getSentEmails();
      expect(sentEmails).toHaveLength(1);
      expect(sentEmails[0].type).toBe('payment_failed');
    });

    it('should return success for subscription change email', async () => {
      const result = await service.sendSubscriptionChangeEmail(
        'test@example.com',
        {
          user: { email: 'test@example.com', name: 'Test User' },
          previousPlan: 'Free',
          newPlan: 'Pro',
          effectiveDate: new Date(),
        },
      );

      expect(result.success).toBe(true);

      const sentEmails = service.getSentEmails();
      expect(sentEmails).toHaveLength(1);
      expect(sentEmails[0].type).toBe('subscription_change');
    });

    it('should handle marketing emails for multiple recipients', async () => {
      const emails = [
        'user1@example.com',
        'user2@example.com',
        'user3@example.com',
      ];
      const result = await service.sendMarketingEmail(emails, {
        subject: 'Newsletter',
        content: 'Newsletter content',
        ctaText: 'Read More',
        ctaUrl: 'https://example.com/news',
      });

      expect(result.success).toBe(true);

      const sentEmails = service.getSentEmails();
      expect(sentEmails).toHaveLength(3);

      // Check that all emails are marketing type
      sentEmails.forEach(email => {
        expect(email.type).toBe('marketing');
      });

      // Check recipients
      const recipients = sentEmails.map(email => email.to);
      expect(recipients).toEqual(expect.arrayContaining(emails));
    });
  });

  describe('failure simulation', () => {
    it('should simulate failures when configured', async () => {
      service.setShouldFail(true);

      const result = await service.sendPaymentSuccessEmail('test@example.com', {
        user: { email: 'test@example.com' },
        amount: 2000,
        currency: 'usd',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email service failed');

      // Should not track failed emails
      const sentEmails = service.getSentEmails();
      expect(sentEmails).toHaveLength(0);
    });

    it('should work normally after disabling failure mode', async () => {
      service.setShouldFail(true);
      service.setShouldFail(false);

      const result = await service.sendMarketingEmail(['test@example.com'], {
        subject: 'Test',
        content: 'Test content',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('helper methods', () => {
    it('should return last sent email', async () => {
      await service.sendPasswordResetEmail('user1@example.com', {
        resetToken: 'token1',
        resetUrl: 'url1',
        user: { email: 'user1@example.com' },
      });

      await service.sendVerificationEmail('user2@example.com', {
        verificationToken: 'token2',
        verificationUrl: 'url2',
        user: { email: 'user2@example.com' },
      });

      const lastEmail = service.getLastSentEmail();
      expect(lastEmail.type).toBe('verification');
      expect(lastEmail.to).toBe('user2@example.com');
    });

    it('should clear sent emails', async () => {
      await service.sendWelcomeEmail('test@example.com', {
        user: { email: 'test@example.com' },
        dashboardUrl: 'https://example.com/dashboard',
      });

      expect(service.getSentEmails()).toHaveLength(1);

      service.clearSentEmails();
      expect(service.getSentEmails()).toHaveLength(0);
    });
  });
});
