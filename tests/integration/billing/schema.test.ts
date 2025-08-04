/**
 * Schema validation tests for billing integration
 * Validates that billing Zod schemas compile and types are correct
 */

import {
  insertUserSchema,
  insertWebhookEventSchema,
} from '@/lib/db/schema';

describe('Billing Schema Validation', () => {
  describe('User Schema', () => {
    it('should validate user with billing customer ID', () => {
      const userWithBilling = {
        clerkId: 'user_test123',
        email: 'test@example.com',
        name: 'Test User',
        billingCustomerId: 'cus_stripe123',
      };

      expect(() => insertUserSchema.parse(userWithBilling)).not.toThrow();
    });

    it('should validate user without billing customer ID', () => {
      const userWithoutBilling = {
        clerkId: 'user_test123',
        email: 'test@example.com',
        name: 'Test User',
      };

      expect(() => insertUserSchema.parse(userWithoutBilling)).not.toThrow();
    });
  });

  describe('Webhook Event Schema', () => {
    it('should validate Stripe webhook event', () => {
      const stripeWebhookEvent = {
        id: 'evt_stripe123',
        provider: 'stripe',
        eventType: 'checkout.session.completed',
      };

      expect(() =>
        insertWebhookEventSchema.parse(stripeWebhookEvent),
      ).not.toThrow();
    });

    it('should validate Clerk webhook event', () => {
      const clerkWebhookEvent = {
        id: 'evt_clerk123',
        provider: 'clerk',
        eventType: 'user.created',
      };

      expect(() =>
        insertWebhookEventSchema.parse(clerkWebhookEvent),
      ).not.toThrow();
    });

    it('should have provider field', () => {
      const webhookEvent = {
        id: 'evt_test123',
        provider: 'stripe',
        eventType: 'checkout.session.completed',
      };

      const parsed = insertWebhookEventSchema.parse(webhookEvent);
      expect(parsed.provider).toBe('stripe');
    });
  });
});
