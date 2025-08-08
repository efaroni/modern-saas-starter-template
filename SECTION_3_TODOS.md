# Minimal Billing Implementation - Boilerplate Setup

## Overview

This is a **boilerplate implementation** focused on minimal setup and maximum use of Stripe's built-in features. We don't reinvent what Stripe already does perfectly.

## What You Get

✅ **Test Page**: Complete billing test interface at `/billing-test`  
✅ **Stripe Integration**: Full checkout, portal, and webhook processing  
✅ **Database**: Minimal schema storing only Stripe customer ID  
✅ **Email Notifications**: Payment success/failure emails via webhooks  
✅ **Service Abstraction**: Clean interface allowing provider switching

## What We DON'T Build

❌ Local subscription status tracking (query Stripe directly)  
❌ Complex payment flows (use Stripe Checkout)  
❌ Billing management UI (use Stripe Customer Portal)  
❌ Purchase tracking table (use Stripe invoices/events)  
❌ Custom payment forms (use Stripe Elements)

## 5-Minute Setup

### 1. Environment Variables

```bash
# Add to .env.local
STRIPE_SECRET_KEY="sk_test_..."  # From Stripe Dashboard → API Keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."  # From webhook setup below
```

### 2. Create Stripe Products

In Stripe Dashboard → Products:

1. Create a subscription product (e.g., "Pro Plan - $10/month")
2. Create a one-time product (e.g., "100 Credits - $5")
3. Copy the price IDs

### 3. Update Test Page

Edit `app/billing-test/page.tsx` and replace:

- `price_test_subscription` → Your subscription price ID
- `price_test_one_time` → Your one-time payment price ID

### 4. Webhook Setup

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login and forward webhooks
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Copy the webhook secret to .env.local
```

### 5. Test the Flow

1. Visit `/billing-test`
2. Click "Subscribe" → Complete with test card `4242 4242 4242 4242`
3. Return → Click "Refresh Status" → Verify subscription active
4. Click "Manage Billing" → Test Stripe Portal

**That's it!** Your billing system is ready.

## Architecture

### Database (Minimal)

```sql
-- users table has only:
billing_customer_id TEXT UNIQUE  -- Stripe customer ID

-- webhook_events table for idempotency
id TEXT PRIMARY KEY           -- Stripe event ID
provider TEXT                 -- 'stripe'
event_type TEXT              -- 'checkout.completed', etc.
processed_at TIMESTAMP       -- When processed
```

### API Routes (Already Built)

- `POST /api/billing/checkout/session` - Create checkout sessions
- `POST /api/billing/portal` - Customer portal access
- `POST /api/webhooks/stripe` - Webhook processor
- `GET /api/test/billing-status` - Check status (test only)
- `POST /api/test/reset-user` - Reset billing data (test only)

### Service Layer (Provider Agnostic)

```typescript
// lib/billing/service.ts - Factory creates Stripe or Mock service
export const billingService = createBillingService();

// Easy to switch providers later:
// return new PaddleBillingService(apiKey, webhookSecret);
```

## Access Control Pattern

Query Stripe directly for real-time status:

```typescript
// lib/billing/access-control.ts
export async function hasActiveSubscription(userId: string) {
  const user = await getUser(userId);
  if (!user.billingCustomerId) return false;

  const subscriptions = await stripe.subscriptions.list({
    customer: user.billingCustomerId,
    status: 'active',
    limit: 1,
  });

  return subscriptions.data.length > 0;
}
```

## Webhook Processing

Handles only critical events:

- `checkout.session.completed` - Store customer ID, send emails
- `customer.subscription.deleted` - Log for audit
- `payment_intent.payment_failed` - Send failure email

Uses idempotency table to prevent duplicate processing.

## Email Integration

Automatic emails on webhook events:

- Payment success confirmation
- Payment failure notification
- Subscription change alerts

Templates in `emails/` directory using React Email.

## Testing Strategy

**Manual Testing Only** - Use the test page:

1. Reset user → Subscribe → Verify webhook
2. Test portal access → Modify subscription
3. Test one-time payments → Verify completion

The billing-test page provides complete testing interface with:

- Status display (customer ID, subscription status)
- Action buttons (subscribe, one-time payment, manage billing)
- Test instructions and card details

## Production Deployment

1. Switch to live Stripe keys
2. Set up production webhook endpoint in Stripe Dashboard
3. Point to your domain: `https://yourdomain.com/api/webhooks/stripe`
4. Select events: `checkout.session.completed`, `customer.subscription.deleted`, `payment_intent.payment_failed`

## File Structure

```
lib/billing/           # Service layer
├── types.ts          # Interfaces
├── stripe.ts         # Stripe implementation
├── mock.ts           # Test implementation
├── service.ts        # Factory
└── access-control.ts # Subscription queries

app/api/billing/      # API routes
├── checkout/session/ # Checkout creation
└── portal/           # Customer portal

app/api/webhooks/
└── stripe/           # Webhook handler

app/billing-test/     # Test interface
└── page.tsx

emails/               # Email templates
├── payment-success.tsx
└── payment-failed.tsx
```

## Success Criteria

✅ User can subscribe via Stripe Checkout  
✅ User can access Stripe Customer Portal  
✅ Webhooks process payment events  
✅ Emails send automatically  
✅ Access control works via Stripe queries  
✅ Easy to switch payment providers  
✅ Total implementation < 100 lines of business logic

## What's Already Done

Everything! The implementation is complete and tested. You just need to:

1. Set environment variables
2. Create Stripe products
3. Update price IDs in test page
4. Set up webhook forwarding
5. Test the flow

This boilerplate prioritizes **simplicity over customization** - perfect for getting billing working quickly while maintaining the ability to customize later.
