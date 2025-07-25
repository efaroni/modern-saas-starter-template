import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

import { testHelpers } from '@/lib/db/test-helpers';
import { MockEmailService } from '@/lib/email/mock';
import { emailService } from '@/lib/email/service';

describe('Billing Email Integration', () => {
  beforeEach(async () => {
    await testHelpers.setupTest();
    // Clear any previous emails
    if (emailService instanceof MockEmailService) {
      emailService.clearSentEmails();
    }
  });

  afterEach(async () => {
    await testHelpers.teardownTest();
  });

  describe('Payment Success Email', () => {
    it('should send payment success email with all details', async () => {
      const result = await emailService.sendPaymentSuccessEmail(
        'customer@example.com',
        {
          user: { email: 'customer@example.com', name: 'John Doe' },
          amount: 2999, // $29.99 in cents
          currency: 'usd',
          invoiceUrl: 'https://invoice.stripe.com/test',
          billingDetails: { last4: '4242', brand: 'visa' },
        },
      );

      expect(result.success).toBe(true);

      // Verify email was tracked (if using mock service)
      if (emailService instanceof MockEmailService) {
        const sentEmails = emailService.getSentEmails();
        expect(sentEmails).toHaveLength(1);

        const sentEmail = sentEmails[0];
        expect(sentEmail.type).toBe('payment_success');
        expect(sentEmail.to).toBe('customer@example.com');

        const emailData = sentEmail.data as {
          amount: number;
          currency: string;
          user: { name: string };
        };
        expect(emailData.amount).toBe(2999);
        expect(emailData.currency).toBe('usd');
        expect(emailData.user.name).toBe('John Doe');
      }
    });

    it('should handle missing optional fields gracefully', async () => {
      const result = await emailService.sendPaymentSuccessEmail(
        'customer@example.com',
        {
          user: { email: 'customer@example.com' },
          amount: 1000,
          currency: 'usd',
        },
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Payment Failed Email', () => {
    it('should send payment failed email', async () => {
      const result = await emailService.sendPaymentFailedEmail(
        'customer@example.com',
        {
          user: { email: 'customer@example.com', name: 'Jane Smith' },
          amount: 4999,
          currency: 'usd',
          billingDetails: { last4: '1234', brand: 'mastercard' },
        },
      );

      expect(result.success).toBe(true);

      if (emailService instanceof MockEmailService) {
        const sentEmails = emailService.getSentEmails();
        expect(sentEmails).toHaveLength(1);

        const sentEmail = sentEmails[0];
        expect(sentEmail.type).toBe('payment_failed');
        expect(sentEmail.to).toBe('customer@example.com');
      }
    });
  });

  describe('Subscription Change Email', () => {
    it('should send subscription upgrade email', async () => {
      const effectiveDate = new Date('2024-02-01');
      const result = await emailService.sendSubscriptionChangeEmail(
        'subscriber@example.com',
        {
          user: { email: 'subscriber@example.com', name: 'Bob Wilson' },
          previousPlan: 'Free',
          newPlan: 'Pro',
          effectiveDate,
        },
      );

      expect(result.success).toBe(true);

      if (emailService instanceof MockEmailService) {
        const sentEmails = emailService.getSentEmails();
        expect(sentEmails).toHaveLength(1);

        const sentEmail = sentEmails[0];
        expect(sentEmail.type).toBe('subscription_change');
        expect(sentEmail.to).toBe('subscriber@example.com');

        const emailData = sentEmail.data as {
          previousPlan: string;
          newPlan: string;
          effectiveDate: Date;
        };
        expect(emailData.previousPlan).toBe('Free');
        expect(emailData.newPlan).toBe('Pro');
        expect(emailData.effectiveDate).toEqual(effectiveDate);
      }
    });

    it('should send subscription cancellation email', async () => {
      const effectiveDate = new Date('2024-03-01');
      const result = await emailService.sendSubscriptionChangeEmail(
        'subscriber@example.com',
        {
          user: { email: 'subscriber@example.com', name: 'Alice Brown' },
          previousPlan: 'Pro',
          newPlan: 'Free',
          effectiveDate,
        },
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Marketing Email', () => {
    it('should send marketing email to multiple recipients', async () => {
      const recipients = [
        'user1@example.com',
        'user2@example.com',
        'user3@example.com',
      ];

      const result = await emailService.sendMarketingEmail(recipients, {
        subject: 'New Features Available!',
        content: '<p>Check out our latest features and improvements.</p>',
        ctaText: 'Learn More',
        ctaUrl: 'https://example.com/features',
      });

      expect(result.success).toBe(true);

      if (emailService instanceof MockEmailService) {
        const sentEmails = emailService.getSentEmails();
        expect(sentEmails).toHaveLength(3);

        // Check that all recipients received the email
        const recipients_sent = sentEmails.map(email => email.to);
        expect(recipients_sent).toEqual(expect.arrayContaining(recipients));

        // Check that all emails are marketing type
        sentEmails.forEach(email => {
          expect(email.type).toBe('marketing');
        });
      }
    });

    it('should handle empty recipient list gracefully', async () => {
      const result = await emailService.sendMarketingEmail([], {
        subject: 'Test Email',
        content: 'Test content',
      });

      expect(result.success).toBe(true);

      if (emailService instanceof MockEmailService) {
        const sentEmails = emailService.getSentEmails();
        expect(sentEmails).toHaveLength(0);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle service failures gracefully', async () => {
      // Configure mock service to fail
      if (emailService instanceof MockEmailService) {
        emailService.setShouldFail(true);

        const result = await emailService.sendPaymentSuccessEmail(
          'test@example.com',
          {
            user: { email: 'test@example.com' },
            amount: 1000,
            currency: 'usd',
          },
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('Email service failed');

        // Reset for other tests
        emailService.setShouldFail(false);
      }
    });
  });
});
