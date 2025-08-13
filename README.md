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

## Git Hooks & Commit Standards

This project uses **Conventional Commits** with automated enforcement via commitlint and Husky.

### Git Hooks Setup

Git hooks are automatically set up when you run `npm install`. If you need to manually set them up:

```bash
npm run prepare
```

### Commit Message Format

All commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Examples:**

```bash
feat(auth): add Google OAuth integration
fix(api): resolve rate limiting issues
docs(readme): update installation guide
test(billing): add Stripe webhook tests
```

**Available Types:**

- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code formatting (no logic changes)
- `refactor`: Code changes that neither fix bugs nor add features
- `perf`: Performance improvements
- `test`: Adding or modifying tests
- `build`: Build system changes
- `ci`: CI/CD changes
- `chore`: Other changes (deps, config, etc.)

### Pre-commit Hooks

The pre-commit hook automatically:

- **Lints code** with ESLint
- **Formats code** with Prettier
- **Runs unit tests** with Jest
- **Blocks commits** if any step fails

### Commit-msg Hook

The commit-msg hook automatically:

- **Validates commit messages** against conventional commit format
- **Rejects non-compliant** commit messages
- **Provides helpful error messages** for fixes

This ensures consistent commit history and enables automated changelog generation.

## Testing

### Running Tests

```bash
npm test              # Run unit tests
npm run test:coverage # Run tests with coverage
npm run test:e2e      # Run E2E tests
npm run test:e2e:ui   # Run E2E tests with Playwright UI
npm run test:e2e:debug # Run E2E tests in debug mode
```

### E2E Testing with Clerk Authentication

E2E tests use real Clerk test keys but bypass email verification using Clerk's test mode:

**Key Features:**

- Uses `NODE_ENV=test` environment
- Test database isolation (`saas_template_test` instead of local database)
- Real Clerk test keys for proper authentication flow
- Mock keys for external services (Stripe, Resend, etc.)

**Clerk Test Email Bypass:**

- **Test Email Format**: Use emails with `+clerk_test` suffix
  - Example: `user+clerk_test@example.com`
- **Verification Code**: Always `424242` for test emails
- **No Real Emails**: Clerk automatically handles verification without sending emails

**Environment Configuration:**

```bash
# .env.test uses real Clerk test keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."  # Real Clerk test key
CLERK_SECRET_KEY="sk_test_..."                   # Real Clerk test key
CLERK_WEBHOOK_SECRET="whsec_..."                 # Same as development
# Clerk webhook dashboard: https://dashboard.clerk.com/apps (Configure tab)

# Other services use mocks in testing
STRIPE_SECRET_KEY="sk_test_mock"
RESEND_API_KEY="re_mock_key"
```

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

### Testing Stripe Integration Locally

Before testing the billing system, verify your Stripe configuration is correct:

#### 1. **Verify Environment Variables**

Visit [Stripe Dashboard (Test Mode)](https://dashboard.stripe.com/test) and ensure your `.env.local` contains:

```bash
# Stripe API Keys (from https://dashboard.stripe.com/test/apikeys)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."  # Publishable key
STRIPE_SECRET_KEY="sk_test_..."                   # Secret key

# Product Price IDs (from https://dashboard.stripe.com/test/products)
NEXT_PUBLIC_STRIPE_SUBSCRIPTION_PRICE_ID="price_..." # Monthly subscription price
NEXT_PUBLIC_STRIPE_ONE_TIME_PRICE_ID="price_..."     # One-time payment price

# Webhook Secret (from your webhook endpoint)
STRIPE_WEBHOOK_SECRET="whsec_..."                    # Webhook signing secret
```

#### 2. **Verify Products and Prices**

In [Stripe Dashboard → Products](https://dashboard.stripe.com/test/products):

1. **Check Subscription Product exists:**
   - Product should be set to "Recurring"
   - Price should match your `NEXT_PUBLIC_STRIPE_SUBSCRIPTION_PRICE_ID`
   - Billing period should be "Monthly" or "Yearly"

2. **Check One-Time Product exists:**
   - Product should be set to "One-time"
   - Price should match your `NEXT_PUBLIC_STRIPE_ONE_TIME_PRICE_ID`

#### 3. **Verify Webhook Configuration**

In [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/test/webhooks):

1. **Check endpoint exists** with your local URL (ngrok or Stripe CLI)
2. **Verify events are selected** (at minimum: `checkout.session.completed`, `customer.created`)
3. **Copy signing secret** matches your `STRIPE_WEBHOOK_SECRET`
4. **Check endpoint status** is "Enabled" (not disabled due to failures)

⚠️ **Important:** If you're using ngrok tunnels, you **MUST run `npm run dev:tunnel`** to start the tunnel before testing. The webhook secret may need to be recreated if your ngrok URL changes.

#### 4. **Test the Integration**

Once verified, test the complete flow:

1. **Start development environment:**

   ```bash
   # Terminal 1: Start tunnel (if using ngrok)
   npm run dev:tunnel

   # Terminal 2: Start development server
   npm run dev
   ```

2. **Visit the test page:** `http://localhost:3000/billing-test`
3. **Check initial status:** Should show your email with no customer ID
4. **Test subscription flow:**
   - Click "Subscribe" → Should redirect to Stripe Checkout
   - Use test card: `4242 4242 4242 4242`
   - Complete payment → Should redirect back to test page
   - Click "Refresh Status" → Should show customer ID and active subscription

#### 5. **Common Issues and Solutions**

**❌ "Invalid price ID" errors:**

- Price IDs are case-sensitive and must match exactly
- Ensure you're using Test mode price IDs (not Live mode)

**❌ Webhook failures:**

- Check [Webhook Workbench](https://dashboard.stripe.com/test/workbench/webhooks) for errors
- Ensure your local server is running and accessible
- **Recreate webhook secret** if ngrok URL changed
- Verify webhook secret matches exactly in `.env.local`

**❌ "User already has active subscription" error:**

- This is expected behavior to prevent duplicate subscriptions
- Use "Reset User" button to clear billing data for testing

**❌ Ngrok tunnel issues:**

- **Always run `npm run dev:tunnel`** before testing webhooks
- If URL changes, update webhook endpoint in Stripe Dashboard
- Recreate webhook secret after URL changes

**❌ "Customer portal not configured" error:**

- Customer Portal must be configured in Stripe Dashboard before use
- See Customer Portal Configuration section below

#### Customer Portal Configuration

⚠️ **Critical Setup Required**: The "Manage Billing" button will fail with a 500 error if the Customer Portal is not configured in Stripe.

**Steps to configure:**

1. **Visit [Stripe Dashboard → Customer Portal](https://dashboard.stripe.com/test/settings/billing/portal)**

2. **Activate the Customer Portal:**
   - Click on the **"Customer Portal"** tab if not already selected
   - The portal is inactive by default - you must make at least one change to activate it
   - **Example setup:**
     - Go to **"Subscriptions"** section
     - Click **"Add product"** and select one of your created product IDs
     - Or go to **"Business information"** and add your business name
     - **Important:** Click **"Save changes"** - this activates the portal

3. **Configure Portal Settings:**
   - **Business information**: Add your business name and support email
   - **Features**: Enable the features you want customers to access:
     - ✅ **Update payment method** (recommended)
     - ✅ **Download invoices** (recommended)
     - ✅ **Cancel subscriptions** (recommended)
     - ✅ **Update billing address** (optional)
     - ✅ **Invoice history** (recommended)

4. **Set Default Return URL:**
   - **For local development:** `http://localhost:3000/dashboard`
   - **For production:** `https://yourdomain.com/dashboard`

5. **Save Configuration** (Critical - portal won't work without this step)

6. **Test Portal Access:**
   - The "Manage Billing" button should now work
   - Users will be redirected to Stripe's hosted portal
   - They can manage their subscription and billing settings
   - After making changes, they'll return to your specified URL

**Portal Features Available to Users:**

- View and download invoices
- Update payment methods (credit cards)
- View upcoming charges
- Cancel subscriptions
- Update billing address and tax information
- View billing history

**Security Notes:**

- Portal sessions are temporary and secure
- Users can only access their own billing data
- All changes sync back to your system via webhooks
- Stripe handles all security and PCI compliance

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

> 💡 **Recommendation**: Consider upgrading to ngrok's paid plan for a static domain (like `yourapp-dev.sa.ngrok.io`). This prevents having to reconfigure webhook URLs every time you restart ngrok.

```bash
# If using ngrok with custom domain (see package.json)
npm run dev:tunnel

# Then add webhook endpoint in Stripe Dashboard:
# Use STRIPE_WEBHOOK_URL from your environment variables
# Dashboard: https://dashboard.stripe.com/test/workbench/webhooks
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

## Email Service Configuration

This project includes a comprehensive email system using Resend and React Email templates for transactional emails, user notifications, and test email functionality.

### Email Setup Requirements

#### 1. Get Resend API Key

1. Visit [resend.com/api-keys](https://resend.com/api-keys)
2. Create a new API key
3. Add it to your `.env.local`:

   ```bash
   RESEND_API_KEY="re_YourApiKeyHere_1234567890abcdef"
   ```

#### 2. Configure App URL for Unsubscribe Links

**⚠️ Critical for Mobile and Cross-Device Access:** Unsubscribe links in emails use the `NEXT_PUBLIC_APP_URL` environment variable. If not properly configured, unsubscribe links will not work on mobile devices or other computers.

**Development Environment:**

```bash
# Option 1: Use your local network IP (recommended for mobile testing)
NEXT_PUBLIC_APP_URL="http://192.168.1.100:3000"

# Option 2: Use localhost (only works on the same machine)
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Production Environment:**

```bash
# Must be your actual domain
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
```

**Finding Your Local IP for Development:**

```bash
# On macOS/Linux
hostname -I | awk '{print $1}'

# On Windows
ipconfig | findstr IPv4
```

**⚠️ Important Notes:**

- Without `NEXT_PUBLIC_APP_URL` set, unsubscribe links default to `localhost:3000`
- Localhost URLs cannot be accessed from mobile devices or other computers
- The development server warns you if this variable is not set
- In production, failing to set this will break all unsubscribe functionality

#### 3. Domain Verification (Required for Production)

**⚠️ Critical:** You must verify your sending domain in Resend to send emails. Unverified domains will cause emails to fail silently.

1. **Add Your Domain**: Visit [resend.com/domains](https://resend.com/domains) and add your domain
2. **Configure DNS Records**: Add the following DNS records to your domain (values are examples - use your actual records from Resend):

**MX Record (Required for email delivery):**

```
Host: send
Type: MX
Priority: 10
Data: feedback-smtp.us-east-1.amazonses.com
TTL: Auto
```

**SPF Record (Required - prevents spam filtering):**

```
Host: send
Type: TXT
Data: v=spf1 include:amazonses.com ~all
TTL: Auto
```

**DKIM Record (Required for email signing):**

```
Host: resend._domainkey
Type: TXT
Data: p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC8kfXx9BmQNy8fVjRMzc1x+8+L5wnD9hRw2izUR0v7HmXGvL2pYyDuPLRNZqpWV6Hx77gqJL60p/uedtrWPH3+IoxBM6sjweLYBISYLlVfO8OBKBRuuqNEuGKCpYxpwoEbUft7n7/x9ylRVpqioQIDAQAB
TTL: Auto
```

**DMARC Record (Recommended for security):**

```
Host: _dmarc
Type: TXT
Data: v=DMARC1; p=none;
TTL: Auto
```

#### 4. Configure From Email

Set your verified domain email in `.env.local`:

```bash
RESEND_FROM_EMAIL="your-app@yourdomain.com"
```

**For Testing Only:** You can use `onboarding@resend.dev` for testing without domain verification, but this should never be used in production.

#### 5. Test Your Configuration

1. Start your development server: `npm run dev`
2. Navigate to `/emails` in your app
3. Use the "Test Email Service" section to send a test email
4. Check the browser console and server logs for any errors

### Email Features

- ✅ **Welcome Emails** - Automatically sent when users sign up via Clerk webhook
- ✅ **Test Email Service** - Send test emails with rate limiting (5 emails max, then 2-minute cooldown)
- ✅ **Email Preferences** - User-controlled settings for marketing, product updates, and security alerts
- ✅ **Payment Notifications** - Automatic emails for successful payments, failed payments, and subscription changes
- ✅ **Unsubscribe System** - One-click unsubscribe with re-subscribe option
- ✅ **React Email Templates** - Professional, responsive email templates

### Email Management Interface

Visit `/emails` to access:

- Send test emails to any address
- Manage email preferences (marketing, product updates)
- View and test unsubscribe links
- See important notices about critical emails (security, billing)

### Common Issues

**❌ Emails not sending:**

- Verify your domain is added and verified in Resend dashboard
- Check that DNS records are correctly configured (can take up to 48 hours to propagate)
- Ensure `RESEND_API_KEY` is valid and not expired

**❌ "Button stays disabled" after sending test email:**

- This is expected behavior - there's a 5-second cooldown between test emails
- After 5 test emails, there's a 2-minute timeout period

**❌ Domain verification fails:**

- DNS changes can take 24-48 hours to propagate globally
- Use DNS checker tools to verify your records are correctly set
- Contact Resend support if issues persist after 48 hours

For detailed email implementation guide, see [`SECTION_4_TODOS.md`](./SECTION_4_TODOS.md).
