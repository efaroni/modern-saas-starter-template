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
   - Create a one-time product (e.g., "100 Credits - $5")
   - Copy the price IDs

3. **Update Test Page** (`app/billing-test/page.tsx`):
   - Replace `price_test_subscription` with your subscription price ID
   - Replace `price_test_credits` with your one-time price ID

4. **Set Up Webhooks** (for local development):

   ```bash
   # Install Stripe CLI
   brew install stripe/stripe-cli/stripe

   # Login and forward webhooks
   stripe login
   stripe listen --forward-to localhost:3000/api/webhooks/stripe

   # Copy the webhook secret (whsec_...) to your .env.local
   ```

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
5. Click "Buy Credits" → Test one-time payment flow

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
