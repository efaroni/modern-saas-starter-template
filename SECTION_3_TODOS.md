# Minimal SaaS Billing Test Plan with Abstraction

## Overview

This test plan focuses ONLY on what you need to implement for a minimal SaaS billing integration with Stripe. Stripe handles most of the heavy lifting through Checkout, Customer Portal, and automatic features. Your code only needs to handle the integration points. The stripe docs are located at https://docs.stripe.com/.

**Important**: The implementation should include a thin abstraction layer so that switching from Stripe to another payment processor (Paddle, LemonSqueezy, etc.) requires minimal refactoring.

## What You Actually Need to Build

1. **Initial Setup Flow**
   - Create Stripe Customer when user signs up
   - Redirect to Checkout for subscription creation
   - Redirect to Checkout for one-time payments
   - Handle success/cancel URLs from Checkout

2. **Access Control**
   - Store subscription status in your database
   - Track one-time purchases
   - Grant/revoke access based on subscription status or purchases

3. **Customer Portal Access**
   - Generate portal session URL
   - Redirect authenticated users to portal

4. **Webhook Processing**
   - Verify webhook signatures
   - Process 3-4 critical events (including one-time payments)
   - Update user access accordingly

## Abstraction Layer

### Simple Service Interface

```typescript
// lib/billing/types.ts
export interface BillingService {
  createCustomer(email: string): Promise<{ customerId: string }>;

  createCheckoutSession(params: {
    customerId: string;
    priceId: string;
    mode: 'subscription' | 'payment';
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }): Promise<{ url: string }>;

  createPortalSession(
    customerId: string,
    returnUrl: string,
  ): Promise<{ url: string }>;

  verifyWebhookSignature(payload: string, signature: string): boolean;
  parseWebhookEvent(payload: string): BillingEvent;
}

export interface BillingEvent {
  type:
    | 'checkout.completed'
    | 'subscription.updated'
    | 'subscription.deleted'
    | 'payment.succeeded';
  data: any; // Provider-specific data
}

export interface BillingResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
```

### Stripe Implementation

```typescript
// lib/billing/stripe.ts
import Stripe from 'stripe';
import { BillingService, BillingEvent } from './types';

export class StripeBillingService implements BillingService {
  private stripe: Stripe;

  constructor(apiKey: string, webhookSecret: string) {
    this.stripe = new Stripe(apiKey, {
      apiVersion: '2024-11-20.acacia',
      typescript: true,
    });
    this.webhookSecret = webhookSecret;
  }

  private webhookSecret: string;

  async createCustomer(email: string) {
    const customer = await this.stripe.customers.create({ email });
    return { customerId: customer.id };
  }

  async createCheckoutSession(params: {
    customerId: string;
    priceId: string;
    mode: 'subscription' | 'payment';
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }) {
    const session = await this.stripe.checkout.sessions.create({
      customer: params.customerId,
      mode: params.mode,
      line_items: [
        {
          price: params.priceId,
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata,
      payment_method_types: ['card'],
    });

    return { url: session.url! };
  }

  async createPortalSession(customerId: string, returnUrl: string) {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return { url: session.url };
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret,
      );
      return true;
    } catch {
      return false;
    }
  }

  parseWebhookEvent(payload: string): BillingEvent {
    const stripeEvent = JSON.parse(payload);

    // Map Stripe events to generic events
    const eventMap: Record<string, BillingEvent['type']> = {
      'checkout.session.completed': 'checkout.completed',
      'customer.subscription.updated': 'subscription.updated',
      'customer.subscription.deleted': 'subscription.deleted',
      'payment_intent.succeeded': 'payment.succeeded',
    };

    return {
      type: eventMap[stripeEvent.type] || stripeEvent.type,
      data: stripeEvent.data.object,
    };
  }
}
```

### Mock Implementation

```typescript
// lib/billing/mock.ts
import { BillingService, BillingEvent } from './types';

export class MockBillingService implements BillingService {
  async createCustomer(email: string) {
    return { customerId: `cus_mock_${Date.now()}` };
  }

  async createCheckoutSession(params: any) {
    return { url: `https://checkout.stripe.com/mock/${Date.now()}` };
  }

  async createPortalSession(customerId: string, returnUrl: string) {
    return { url: `https://billing.stripe.com/mock/${Date.now()}` };
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    return signature === 'mock_valid_signature';
  }

  parseWebhookEvent(payload: string): BillingEvent {
    const data = JSON.parse(payload);
    return {
      type: data.type || 'checkout.completed',
      data: data.data || { id: 'mock_event', customer: 'cus_mock' },
    };
  }
}
```

### Service Factory

```typescript
// lib/billing/service.ts
import { MockBillingService } from './mock';
import { StripeBillingService } from './stripe';
import { type BillingService } from './types';

function createBillingService(): BillingService {
  // Use mock service in test environment
  if (process.env.NODE_ENV === 'test') {
    return new MockBillingService();
  }

  // Check for required environment variables
  const apiKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!apiKey || !webhookSecret) {
    console.warn('Stripe configuration missing, using mock billing service');
    return new MockBillingService();
  }

  return new StripeBillingService(apiKey, webhookSecret);
}

export const billingService = createBillingService();
```

## Integration Test Plan

### 1. User Signup & Checkout Flow

```typescript
describe('User Signup Flow', () => {
  test('Should create billing customer on user registration', async () => {
    // Given: New user signs up
    // When: User is created in database
    // Then: billingService.createCustomer() is called with user email
    // And: billingCustomerId is stored in user record
  });

  test('Should create Checkout session for subscription', async () => {
    // Given: User wants to subscribe
    // When: User clicks subscribe button
    // Then: billingService.createCheckoutSession() is called with:
    //   - customer: user's billingCustomerId
    //   - success_url: /subscription/success
    //   - cancel_url: /subscription/cancel
    //   - mode: 'subscription'
    // And: User is redirected to checkout URL
  });

  test('Should create Checkout session for one-time payment', async () => {
    // Given: User wants to purchase credits/feature
    // When: User clicks purchase button
    // Then: billingService.createCheckoutSession() is called with:
    //   - customer: user's billingCustomerId
    //   - success_url: /purchase/success
    //   - cancel_url: /purchase/cancel
    //   - mode: 'payment'
    //   - metadata: { purchaseType: 'credits', quantity: '100' }
    // And: User is redirected to checkout URL
  });

  test('Should handle Checkout success', async () => {
    // Given: User completes Checkout
    // When: Redirected to success_url with session_id
    // Then: Display success message
    // Note: Actual provisioning happens via webhook
  });
});
```

### 2. Customer Portal Integration

```typescript
describe('Customer Portal Access', () => {
  test('Should create portal session for authenticated user', async () => {
    // Given: Authenticated user with subscription
    // When: User clicks "Manage Billing"
    // Then: billingService.createPortalSession() is called with:
    //   - customer: user's billingCustomerId
    //   - return_url: /dashboard
    // And: User redirected to portal URL
  });

  test('Should require authentication for portal access', async () => {
    // Given: Unauthenticated request
    // When: Portal session requested
    // Then: 401 Unauthorized returned
  });
});
```

### 3. Webhook Processing

```typescript
describe('Critical Webhook Events', () => {
  test('Should verify webhook signatures', async () => {
    // Given: Incoming webhook request
    // When: billingService.verifyWebhookSignature() called
    // Then: Valid signatures accepted (200)
    // And: Invalid signatures rejected (400)
  });

  test('Should handle checkout.completed for subscriptions', async () => {
    // Given: Successful subscription checkout webhook
    // When: Event processed
    // Then: User subscription status updated to 'active'
    // And: User gains access to paid features
  });

  test('Should handle checkout.completed for one-time payments', async () => {
    // Given: Successful payment checkout webhook
    // When: Event processed with mode='payment'
    // Then: Purchase record created with status 'completed'
    // And: User granted credits/feature based on metadata
  });

  test('Should handle subscription.updated', async () => {
    // Given: Subscription status change webhook
    // When: Event processed with status change
    // Then: User access updated based on new status:
    //   - 'active' or 'trialing' → access granted
    //   - 'past_due', 'canceled', 'unpaid' → access revoked
  });

  test('Should handle subscription.deleted', async () => {
    // Given: Subscription ended webhook
    // When: Event processed
    // Then: User subscription status updated to 'canceled'
    // And: User access to paid features removed
  });
});
```

## Unit Test Plan

### 1. Billing Service Layer

```typescript
describe('BillingService', () => {
  test('Should create customer with minimal data', () => {
    // Test creates customer with just email
    // Mock: Provider API call
    // Verify: Returns customer ID
  });

  test('Should create checkout session for subscription', () => {
    // Test creates session for subscription
    // Mock: Provider checkout session creation
    // Verify: Includes all required parameters
  });

  test('Should create checkout session for one-time payment', () => {
    // Test creates session for payment
    // Mock: Provider checkout session creation
    // Verify: mode='payment' and metadata included
  });

  test('Should create portal session', () => {
    // Test creates portal session
    // Mock: Provider portal session creation
    // Verify: Returns portal URL
  });
});
```

### 2. Access Control Logic

```typescript
describe('User Access Control', () => {
  test('Should grant access for active subscriptions', () => {
    // Given: User with subscription_status = 'active'
    // When: hasAccess() called
    // Then: Returns true
  });

  test('Should grant access during trial', () => {
    // Given: User with subscription_status = 'trialing'
    // When: hasAccess() called
    // Then: Returns true
  });

  test('Should grant access for completed purchases', () => {
    // Given: User with completed purchase of 'premium_feature'
    // When: hasAccessToFeature('premium_feature') called
    // Then: Returns true
  });

  test('Should deny access for inactive subscriptions', () => {
    // Given: User with subscription_status in ['past_due', 'canceled', 'unpaid']
    // When: hasAccess() called
    // Then: Returns false
  });
});
```

### 3. Webhook Handler

```typescript
describe('Webhook Handler', () => {
  test('Should route events to correct handlers', () => {
    // Test event type routing
    // Verify: Each event type calls appropriate handler
  });

  test('Should be idempotent', () => {
    // Given: Same event processed twice
    // When: Second processing occurs
    // Then: No duplicate side effects
  });

  test('Should handle both subscription and payment events', () => {
    // Test: checkout.completed differentiates between modes
    // Test: payment.succeeded creates purchase records
    // Verify: Correct data stored for each type
  });
});
```

## E2E Test Plan

### 1. Complete Subscription Journey

```typescript
describe('Full Subscription Flow E2E', () => {
  test('New user subscribes successfully', async () => {
    // 1. User signs up (billing customer created)
    // 2. User clicks subscribe
    // 3. Redirected to Checkout (provider-agnostic)
    // 4. Completes payment
    // 5. Redirected to success page
    // 6. Webhook updates access
    // 7. User can access paid features
  });

  test('User makes one-time purchase', async () => {
    // 1. User selects credit pack
    // 2. Checkout session created with mode='payment'
    // 3. Redirected to Checkout
    // 4. Completes payment
    // 5. Webhook grants credits
    // 6. Credits available immediately
  });

  test('User manages subscription via portal', async () => {
    // 1. Subscribed user clicks "Manage Billing"
    // 2. Redirected to Customer Portal
    // 3. User makes changes (handled by provider)
    // 4. Webhook updates local status
    // 5. Access updated accordingly
  });
});
```

## Database Schema

```typescript
// Add to lib/db/schema.ts

// Additional fields for users table (already exists)
// Add these fields to your existing users table:
export const users = pgTable('users', {
  // ... existing fields ...

  // Billing fields
  billingCustomerId: text('billing_customer_id').unique(),
  subscriptionId: text('subscription_id'),
  subscriptionStatus: text('subscription_status'), // 'active', 'trialing', 'past_due', 'canceled', etc.
  subscriptionCurrentPeriodEnd: timestamp('subscription_current_period_end', {
    mode: 'date',
  }),

  // ... rest of existing fields ...
});

// New table for one-time purchases
export const purchases = pgTable('purchases', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  billingSessionId: text('billing_session_id').unique(),
  amount: integer('amount').notNull(), // in cents
  currency: text('currency').default('USD').notNull(),
  status: text('status').notNull(), // 'pending', 'completed', 'failed'
  purchaseType: text('purchase_type'), // 'credits', 'feature', etc.
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Track webhook events for idempotency
export const webhookEvents = pgTable('webhook_events', {
  id: text('id').primaryKey(), // Provider event ID
  provider: text('provider').default('stripe').notNull(),
  processedAt: timestamp('processed_at').defaultNow().notNull(),
});

// Create Zod schemas for validation
export const insertPurchaseSchema = createInsertSchema(purchases);
export const selectPurchaseSchema = createSelectSchema(purchases);
export const insertWebhookEventSchema = createInsertSchema(webhookEvents);
export const selectWebhookEventSchema = createSelectSchema(webhookEvents);

// Export types
export type Purchase = typeof purchases.$inferSelect;
export type NewPurchase = typeof purchases.$inferInsert;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;
```

## API Endpoints You Need

```typescript
// 1. Create checkout session (handles both subscription and one-time)
POST /api/billing/checkout/session
{
  priceId: string,  // Which plan/product to purchase
  mode: 'subscription' | 'payment',
  metadata?: {      // For one-time purchases
    purchaseType: string,
    quantity?: number
  }
}
// Returns: { checkoutUrl: string }

// 2. Create portal session
POST /api/billing/portal
// Returns: { portalUrl: string }

// 3. Webhook endpoint
POST /api/webhooks/stripe
// Processes billing provider events

// 4. Check subscription status (for frontend)
GET /api/billing/subscription/status
// Returns: { hasAccess: boolean, status: string }

// 5. Check purchases (for frontend)
GET /api/billing/purchases
// Returns: { purchases: Array<Purchase> }
```

## Environment Variables

```bash
# Required Stripe configuration
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Your product/price IDs from Stripe Dashboard
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_YEARLY=price_...
STRIPE_PRICE_CREDIT_PACK=price_...  # One-time purchase
STRIPE_PRICE_PREMIUM_FEATURE=price_... # One-time purchase

# URLs for Checkout redirect
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Critical Webhooks Only

You only need to handle these events:

1. **`checkout.session.completed`** - Initial subscription creation AND one-time payments
2. **`customer.subscription.updated`** - Status changes (trial end, payment failure, reactivation)
3. **`customer.subscription.deleted`** - Subscription ended
4. **`payment_intent.succeeded`** - Alternative for one-time payment confirmation

That's it! All other events can be ignored for MVP.

## Testing with Stripe CLI

```bash
# Forward webhooks to local dev
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger payment_intent.succeeded

# Test with specific scenarios
stripe trigger customer.subscription.updated \
  --override subscription:status=past_due
```

## What You DON'T Need to Test/Build

- ❌ Payment method management (Customer Portal)
- ❌ Subscription plan changes (Customer Portal)
- ❌ Cancellation flow (Customer Portal)
- ❌ Invoice downloads (Customer Portal)
- ❌ Payment retry logic (Stripe Smart Retries)
- ❌ Proration calculations (Automatic)
- ❌ Tax calculations (Stripe Tax if enabled)
- ❌ Email notifications (Stripe handles)
- ❌ 3D Secure flows (Stripe Checkout)
- ❌ PCI compliance (Stripe hosted pages)

## Success Metrics for MVP

- ✅ Users can subscribe via Checkout
- ✅ Users can make one-time purchases
- ✅ Users can access Customer Portal
- ✅ Subscription status syncs via webhooks
- ✅ Purchase status syncs via webhooks
- ✅ Access control based on subscription status or purchases
- ✅ No payment data stored locally
- ✅ Aim for < 300 lines of billing code if you can
- ✅ Easy to switch payment providers (change ~50 lines)

## Code Examples

### Creating a Checkout Session (Abstracted)

```typescript
// app/api/billing/checkout/session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { billingService } from '@/lib/billing/service';
import { db } from '@/lib/db';
import { purchases } from '@/lib/db/schema';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const { priceId, mode = 'subscription', metadata } = await request.json();
    const userId = session.user.id;

    // Get user with billing info
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user?.billingCustomerId) {
      // Create customer if doesn't exist
      const { customerId } = await billingService.createCustomer(user.email);
      await db
        .update(users)
        .set({ billingCustomerId: customerId })
        .where(eq(users.id, userId));
      user.billingCustomerId = customerId;
    }

    // For one-time payments, create pending purchase record
    if (mode === 'payment') {
      await db.insert(purchases).values({
        userId,
        status: 'pending',
        purchaseType: metadata?.purchaseType,
        metadata,
        amount: 0, // Will be updated by webhook
        currency: 'USD',
      });
    }

    const { url } = await billingService.createCheckoutSession({
      customerId: user.billingCustomerId,
      priceId,
      mode,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/${mode === 'payment' ? 'purchase' : 'subscription'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/${mode === 'payment' ? 'purchase' : 'subscription'}/cancel`,
      metadata: {
        userId,
        ...metadata,
      },
    });

    return NextResponse.json({
      success: true,
      data: { checkoutUrl: url },
    });
  } catch (error) {
    console.error('Checkout session error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create checkout session' },
      { status: 500 },
    );
  }
}
```

### Creating Portal Session (Abstracted)

```typescript
// app/api/billing/portal/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { billingService } from '@/lib/billing/service';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { users } from '@/lib/db/schema';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });

    if (!user?.billingCustomerId) {
      return NextResponse.json(
        { success: false, error: 'No billing account found' },
        { status: 400 },
      );
    }

    const { url } = await billingService.createPortalSession(
      user.billingCustomerId,
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    );

    return NextResponse.json({
      success: true,
      data: { portalUrl: url },
    });
  } catch (error) {
    console.error('Portal session error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create portal session' },
      { status: 500 },
    );
  }
}
```

### Minimal Webhook Handler (Abstracted)

```typescript
// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { billingService } from '@/lib/billing/service';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { users, purchases, webhookEvents } from '@/lib/db/schema';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = headers();
  const sig = headersList.get('stripe-signature');

  if (!sig) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 },
    );
  }

  // Verify signature
  if (!billingService.verifyWebhookSignature(body, sig)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Parse event
  const event = billingService.parseWebhookEvent(body);
  const data = event.data;

  // Check for idempotency
  const existingEvent = await db.query.webhookEvents.findFirst({
    where: eq(webhookEvents.id, data.id),
  });

  if (existingEvent) {
    return NextResponse.json({ received: true });
  }

  // Store event for idempotency
  await db.insert(webhookEvents).values({
    id: data.id,
    provider: 'stripe',
  });

  // Handle only the critical events
  switch (event.type) {
    case 'checkout.completed':
      if (data.mode === 'subscription') {
        await db
          .update(users)
          .set({
            subscriptionId: data.subscription,
            subscriptionStatus: 'active',
          })
          .where(eq(users.billingCustomerId, data.customer));
      } else if (data.mode === 'payment') {
        await db
          .update(purchases)
          .set({
            status: 'completed',
            billingSessionId: data.id,
            amount: data.amount_total,
          })
          .where(eq(purchases.billingSessionId, data.id));

        // Grant access based on purchase metadata
        if (data.metadata?.purchaseType === 'credits') {
          // Implement your credit granting logic here
          // await grantCredits(data.metadata.userId, data.metadata.quantity);
        }
      }
      break;

    case 'subscription.updated':
    case 'subscription.deleted':
      await db
        .update(users)
        .set({
          subscriptionStatus: data.status,
          subscriptionCurrentPeriodEnd: new Date(
            data.current_period_end * 1000,
          ),
        })
        .where(eq(users.subscriptionId, data.id));
      break;
  }

  return NextResponse.json({ received: true });
}
```

### Switching Providers

To switch from Stripe to another provider:

1. Create new implementation of `BillingService` interface in `lib/billing/paddle.ts` (or other provider)
2. Update the factory in `lib/billing/service.ts`:
   ```typescript
   // Change from:
   return new StripeBillingService(apiKey, webhookSecret);
   // To:
   return new PaddleBillingService(apiKey, webhookSecret);
   ```
3. Update environment variables
4. Update webhook endpoint URL if needed
5. Map new provider's event types in the implementation

That's it! This minimal implementation gives you a fully functional SaaS billing system with both subscriptions and one-time payments, while being easy to switch providers later.

## File Structure Summary

```
lib/
├── billing/
│   ├── types.ts       # BillingService interface & types
│   ├── stripe.ts      # Stripe implementation
│   ├── mock.ts        # Mock implementation for tests
│   └── service.ts     # Factory function

app/
├── api/
│   ├── billing/
│   │   ├── checkout/
│   │   │   └── session/
│   │   │       └── route.ts    # Create checkout sessions
│   │   ├── portal/
│   │   │   └── route.ts        # Customer portal access
│   │   ├── subscription/
│   │   │   └── status/
│   │   │       └── route.ts    # Check subscription status
│   │   └── purchases/
│   │       └── route.ts        # List purchases
│   └── webhooks/
│       └── stripe/
│           └── route.ts        # Webhook handler

components/
└── billing/
    ├── subscription-button.tsx
    ├── manage-billing-button.tsx
    ├── purchase-button.tsx
    └── subscription-status.tsx

tests/
├── lib/
│   └── billing/
│       ├── stripe.test.ts      # Unit tests for Stripe implementation
│       └── mock.test.ts        # Unit tests for mock
├── integration/
│   └── billing/
│       ├── checkout-flow.test.ts
│       ├── portal-access.test.ts
│       └── webhook-processing.test.ts
└── e2e/
    └── billing-flows.test.ts   # Full user journey tests
```
