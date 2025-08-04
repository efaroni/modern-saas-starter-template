import { describe, it, expect, beforeEach } from '@jest/globals';

import { MockEmailService } from '@/lib/email/mock';

describe('MockEmailService', () => {
  let service: MockEmailService;

  beforeEach(() => {
    service = new MockEmailService();
  });

  describe('sendVerificationEmail', () => {
    it('should store verification email in sent emails', async () => {
      const result = await service.sendVerificationEmail('test@example.com', {
        verificationToken: 'token',
        verificationUrl: 'url',
        user: { email: 'test@example.com', name: 'Test User' },
      });

      expect(result.success).toBe(true);
      const sentEmails = service.getSentEmails();
      expect(sentEmails).toHaveLength(1);
      expect(sentEmails[0].type).toBe('verification');
      expect(sentEmails[0].to).toBe('test@example.com');
    });
  });

  describe('sendPaymentSuccessEmail', () => {
    it('should handle payment success email', async () => {
      const result = await service.sendPaymentSuccessEmail('test@example.com', {
        user: { email: 'test@example.com', name: 'Test User' },
        amount: 2000,
        currency: 'usd',
        invoiceUrl: 'https://invoice.example.com/123',
      });

      expect(result.success).toBe(true);
      expect(service.getLastSentEmail()?.type).toBe('payment_success');
    });
  });

  describe('sendMarketingEmail', () => {
    it('should handle marketing email to multiple recipients', async () => {
      const result = await service.sendMarketingEmail(
        ['user1@example.com', 'user2@example.com'],
        {
          subject: 'Newsletter',
          content: 'Check out our updates!',
          unsubscribeUrl: 'https://example.com/unsubscribe',
        },
      );

      expect(result.success).toBe(true);
      const lastEmail = service.getLastSentEmail();
      expect(lastEmail?.type).toBe('marketing');
      expect(lastEmail?.to).toEqual(['user1@example.com', 'user2@example.com']);
    });
  });

  describe('helper methods', () => {
    it('should clear sent emails', async () => {
      await service.sendWelcomeEmail('test@example.com', {
        user: { email: 'test@example.com' },
        dashboardUrl: 'http://localhost:3000/dashboard',
      });

      expect(service.getSentEmails()).toHaveLength(1);
      service.clearSentEmails();
      expect(service.getSentEmails()).toHaveLength(0);
    });

    it('should simulate email delays', async () => {
      const start = Date.now();
      await service.sendWelcomeEmail('test@example.com', {
        user: { email: 'test@example.com' },
        dashboardUrl: 'http://localhost:3000/dashboard',
      });
      const end = Date.now();

      // Should take at least 100ms due to simulated delay
      expect(end - start).toBeGreaterThan(90);
    });
  });
});
