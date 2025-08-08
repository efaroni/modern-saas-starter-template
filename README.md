This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, install dependencies and set up git hooks:

```bash
npm install
# This will automatically set up pre-commit hooks that run tests
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Git Hooks

This project includes a pre-commit hook that automatically runs unit tests before each commit. This ensures code quality by preventing commits with failing tests.

To manually set up git hooks (if they weren't set up during `npm install`):

```bash
# First make the setup script executable
chmod +x setup-git-hooks.sh

# Then run it
./setup-git-hooks.sh
# or
npm run prepare
```

If you get a warning about the hook not being executable, run:

```bash
chmod +x .git/hooks/pre-commit
```

The pre-commit hook will:

- Run all unit tests with `npm test`
- Block the commit if any tests fail
- Show a success message if all tests pass

## Stripe Integration

This project includes a minimal, production-ready billing system using Stripe. The implementation follows a **boilerplate philosophy** - maximum functionality with minimal code.

### Features

- ✅ **Stripe Checkout** - Secure payment processing for subscriptions and one-time purchases
- ✅ **Customer Portal** - Self-service billing management (powered by Stripe)
- ✅ **Webhook Processing** - Real-time payment event handling with email notifications
- ✅ **Access Control** - Subscription status checks via direct Stripe API queries
- ✅ **Provider Abstraction** - Easy switching between payment providers
- ✅ **Test Interface** - Complete billing test page at `/billing-test`

### Quick Setup

1. **Add Stripe Keys** to your `.env.local`:

   ```bash
   STRIPE_SECRET_KEY="sk_test_..."
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
   STRIPE_WEBHOOK_SECRET="whsec_..."  # See webhook setup below
   ```

2. **Create Products in Stripe Dashboard**:
   - Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
   - Create a subscription (e.g., "Pro Plan - $10/month")
   - Create a one-time product (e.g., "Pro Access - $50")
   - Copy the price IDs

3. **Add Price IDs** to your `.env.local`:

   ```bash
   NEXT_PUBLIC_STRIPE_SUBSCRIPTION_PRICE_ID="price_your_subscription_price_here"
   NEXT_PUBLIC_STRIPE_ONE_TIME_PRICE_ID="price_your_one_time_price_here"
   ```

4. **Set Up Webhooks** (for local development):

   ```bash
   # Install Stripe CLI
   brew install stripe/stripe-cli/stripe

   # Login and forward webhooks
   stripe login
   stripe listen --forward-to localhost:3000/api/webhooks/stripe

   # Copy the webhook secret (whsec_...) to your .env.local
   ```

### Webhook Configuration

#### Required Webhook Events

When setting up webhooks in the [Stripe Dashboard](https://dashboard.stripe.com/webhooks), select these events:

**Essential Events (Required):**

- `checkout.session.completed` - Updates user's billing customer ID after successful checkout
- `customer.created` - Syncs customer ID when customers are created (for lazy customer creation)

**Subscription Management (Recommended):**

- `customer.subscription.created` - Track new subscriptions
- `customer.subscription.updated` - Handle plan changes and renewals
- `customer.subscription.deleted` - Handle cancellations

**Payment Events (Optional but useful):**

- `payment_intent.succeeded` - Track successful payments
- `payment_intent.payment_failed` - Handle failed payments
- `invoice.payment_succeeded` - Track successful invoice payments
- `invoice.payment_failed` - Handle failed invoice payments

#### Webhook Setup Options

**Option 1: Local Development with Stripe CLI**

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

**Option 2: Local Development with Ngrok**

```bash
# If using ngrok with custom domain (see package.json)
npm run dev:tunnel

# Then add webhook endpoint in Stripe Dashboard:
# https://gostealthiq-dev.sa.ngrok.io/api/webhooks/stripe
```

**Option 3: Production**

1. Add endpoint in Stripe Dashboard: `https://yourdomain.com/api/webhooks/stripe`
2. Select the events listed above
3. Copy the signing secret to your production environment variables

#### Webhook Security

The webhook handler (`/api/webhooks/stripe`) includes:

- ✅ Signature verification (prevents replay attacks)
- ✅ Idempotency handling (prevents duplicate processing)
- ✅ Retry logic for database operations
- ✅ Comprehensive error logging

#### ⚠️ Important: Webhook Monitoring

**Stripe automatically disables webhooks that fail repeatedly.** This is a common issue during development.

To monitor and troubleshoot webhooks:

1. Visit [Stripe Webhook Workbench](https://dashboard.stripe.com/test/workbench/webhooks)
2. Check the status of your endpoints
3. View recent webhook attempts and their responses
4. Re-enable disabled endpoints if needed

Common reasons for webhook failures:

- 🔴 **Incorrect signing secret** - Make sure `STRIPE_WEBHOOK_SECRET` matches your endpoint's secret
- 🔴 **Endpoint unreachable** - Ensure ngrok/tunnel is running for local development
- 🔴 **500 errors** - Check your server logs for database or code errors
- 🔴 **Timeout** - Webhook must respond within 20 seconds

If your webhook endpoint gets disabled:

1. Fix the underlying issue
2. Go to [Webhooks](https://dashboard.stripe.com/test/webhooks)
3. Click on your endpoint
4. Click "Enable endpoint" to reactivate it

### Testing the Integration

**Automated Tests:**

```bash
npm test  # Runs integration tests for API routes and webhook processing
```

**Manual E2E Testing:**

1. Visit [`http://localhost:3000/billing-test`](http://localhost:3000/billing-test)
2. Click "Subscribe" → Complete checkout with test card `4242 4242 4242 4242`
3. Return to test page → Click "Refresh Status" → Verify subscription active
4. Click "Manage Billing" → Test Stripe Customer Portal
5. Click "One-Time Payment" → Test one-time payment flow

**Test Cards:**

- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Expiry: Any future date, CVC: Any 3 digits

### Architecture Decisions

- **Stripe as Source of Truth**: No local subscription tracking - query Stripe directly
- **Minimal Database**: Only stores Stripe customer ID (`users.billingCustomerId`)
- **Webhook Idempotency**: Prevents duplicate processing via `webhook_events` table
- **Email Integration**: Automatic payment notifications via React Email templates
- **Mock-First**: Tests use mocks, production uses real Stripe

### Production Deployment

1. **Switch to Live Keys**: Update environment variables with `sk_live_` and `pk_live_` keys
2. **Set Up Production Webhook**:
   - Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
   - Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
   - Select events: `checkout.session.completed`, `customer.subscription.deleted`, `payment_intent.payment_failed`
3. **Update Webhook Secret**: Copy the signing secret to production environment

### API Endpoints

- `POST /api/billing/checkout/session` - Create checkout sessions
- `POST /api/billing/portal` - Customer portal access
- `GET /api/billing/subscription/status` - Check subscription status
- `POST /api/webhooks/stripe` - Process Stripe events
- `GET /api/test/billing-status` - Test endpoint for status checking
- `POST /api/test/reset-user` - Reset user billing data (development only)

### File Structure

```
lib/billing/              # Service layer
├── stripe.ts            # Stripe implementation
├── mock.ts             # Test implementation
├── service.ts          # Factory pattern
├── access-control.ts   # Subscription queries
└── types.ts           # Interfaces

app/api/billing/        # API routes
app/api/webhooks/stripe/ # Webhook handler
app/billing-test/       # Test interface
emails/                 # React Email templates
```

For detailed implementation guide, see [`SECTION_3_TODOS.md`](./SECTION_3_TODOS.md).
