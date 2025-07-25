# Payment System Documentation

## Overview

This payment system provides a minimal Stripe integration following the "Stripe-first" approach outlined in SECTIONS.md. It leverages Stripe's built-in features (Checkout and Customer Portal) while maintaining a clean abstraction layer for easy testing and provider swapping.

## Architecture

### Service Layer Pattern

- **PaymentService**: Main service interface
- **PaymentProvider**: Abstract provider interface (Stripe, Mock)
- **Factory Pattern**: Automatic provider selection based on environment

### Database Schema

- **users.stripe_customer_id**: Links users to Stripe customers
- **subscriptions**: Minimal subscription tracking
- **plans**: Available subscription plans with feature flags

## Quick Start

### 1. Environment Setup

Add to your `.env.local`:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

### 2. Database Setup

Run the migration to add payment tables:

```bash
npm run db:push
```

### 3. Seed Sample Plans

```bash
npx tsx scripts/seed-plans.ts
```

### 4. Configure Stripe Webhook

In your Stripe dashboard:

1. Create a webhook endpoint: `https://yourdomain.com/api/billing/webhook`
2. Add these events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
3. Copy the webhook secret to `STRIPE_WEBHOOK_SECRET`

## Usage

### Basic Service Usage

```typescript
import { paymentService } from '@/lib/payments/factory';

// Create checkout session
const session = await paymentService.createCheckoutSession({
  userId: 'user_123',
  priceId: 'price_...',
  successUrl: 'https://yourdomain.com/success',
  cancelUrl: 'https://yourdomain.com/cancel',
});

// Get user subscription
const subscription = await paymentService.getUserSubscription('user_123');

// Check if user has access to a feature
const hasFeature = await paymentService.hasFeature('user_123', 'ai_analysis');
```

### API Endpoints

| Endpoint                    | Method | Description                    |
| --------------------------- | ------ | ------------------------------ |
| `/api/billing/checkout`     | POST   | Create Stripe Checkout session |
| `/api/billing/portal`       | POST   | Create Customer Portal session |
| `/api/billing/subscription` | GET    | Get user's subscription status |
| `/api/billing/webhook`      | POST   | Handle Stripe webhooks         |
| `/api/plans`                | GET    | List available plans           |

### Feature Access Control

```typescript
import { withSubscription } from '@/lib/payments/middleware';

// Protect API route
export async function GET(request: NextRequest) {
  const middlewareResponse = await withSubscription(request, {
    requireActive: true,
    requiredFeatures: ['ai_analysis'],
  });

  if (middlewareResponse) return middlewareResponse;

  // Your protected route logic here
}
```

### UI Components

```typescript
import { PricingCard } from '@/app/payments/components/pricing-card';
import { BillingStatus } from '@/app/payments/components/billing-status';
import { ManageBillingButton } from '@/app/payments/components/manage-billing-button';

// Use in your pages
<PricingCard plan={plan} onSubscribe={handleSubscribe} />
<BillingStatus subscription={subscription} isActive={isActive} />
<ManageBillingButton hasSubscription={hasSubscription} />
```

## Mock Mode

The system automatically uses a mock provider when Stripe credentials are not available:

- Checkout sessions return mock URLs
- Webhooks are simulated
- All operations succeed without external API calls
- Perfect for development and testing

## Testing

### Unit Tests

```bash
npm test lib/payments/service.test.ts
```

### Integration Tests

```bash
npm test tests/integration/payments/
```

### Manual Testing

1. Visit `/payments` to see the pricing page
2. Click "Subscribe" to test checkout flow (uses mock in development)
3. Use "Manage Billing" to test portal flow

## Webhook Security

The system implements proper webhook security:

- **Signature verification**: Uses `stripe.webhooks.constructEvent()`
- **Idempotency**: Prevents duplicate processing
- **Error handling**: Proper HTTP status codes for Stripe retry logic
- **Event filtering**: Only processes known event types

## Feature Flags

Plans support JSON-based feature flags:

```json
{
  "ai_analysis": true,
  "premium_support": true,
  "advanced_analytics": false
}
```

Use in your application:

```typescript
const canUseAI = await paymentService.hasFeature(userId, 'ai_analysis');
```

## Production Checklist

- [ ] Replace test Stripe keys with live keys
- [ ] Configure production webhook endpoint
- [ ] Create actual products/prices in Stripe Dashboard
- [ ] Update plan records with real Stripe price IDs
- [ ] Test webhook delivery in production
- [ ] Monitor subscription events
- [ ] Set up error alerting

## Troubleshooting

### Common Issues

**Webhook not working:**

- Check webhook secret matches Stripe dashboard
- Verify endpoint is publicly accessible
- Check webhook event types are configured

**Checkout not redirecting:**

- Verify success/cancel URLs are absolute
- Check Stripe publishable key is correct
- Ensure user is authenticated

**Feature access not working:**

- Check subscription status is 'active'
- Verify current period hasn't expired
- Confirm feature exists in plan

### Debug Mode

Enable debug logging:

```bash
NODE_ENV=development npm run dev
```

Check browser console and server logs for detailed error messages.

## Architecture Decisions

### Why Stripe-First?

- Reduces custom code complexity
- Leverages Stripe's battle-tested UI
- Automatic PCI compliance
- Built-in payment method management
- International payment support

### Why Service Abstraction?

- Easy provider swapping
- Testable without external dependencies
- Mock mode for development
- Future-proofing for multi-provider support

### Why Minimal Database Schema?

- Stripe is the source of truth
- Reduces sync complexity
- Easier to maintain consistency
- Faster initial implementation

## Integration with Section 4 (Emails)

The payment system emits events for the email system:

```typescript
// For Section 4 integration
export interface MockPaymentEvent {
  type: 'checkout.completed' | 'subscription.updated' | 'subscription.deleted';
  userId: string;
  subscriptionId?: string;
  planName?: string;
}
```

Webhook handlers automatically trigger appropriate emails through the email service integration.
