# SaaS Template - Development Sections

## Overview

7 development sections that demonstrate all essential SaaS functionality with mock-first, real-when-ready approach.

## Section 1: Configuration

**Purpose:** API key management + secure database storage testing
**Route:** `/dev/config`
**Features:**

- User API key management (OpenAI, Stripe, etc.)
- Secure database storage testing (encryption, hashing)
- Real-time connection testing
- Service status indicators (✅ Connected, ❌ Invalid, ⚠️ Not configured)
- Database CRUD for API keys (create, read, update, delete)
- Integration health dashboard

**Database Tables:** `user_api_keys`

## Section 2: Authentication & User Management

**Purpose:** Auth.js + user CRUD + file uploads + Google/GitHub OAuth
**Route:** `/dev/auth`
**Features:**

- Auth.js v5 implementation with abstracted service layer
- Login/signup flow testing (email/password)
- Google OAuth integration testing
- GitHub OAuth integration testing
- Session management validation
- User profile CRUD operations (create, read, update, delete)
- User profile form (validation, avatar upload, email validation)
- File upload testing (avatar images to R2/Vercel Blob)
- Password reset flow testing
- Form validation patterns (Zod + React Hook Form)

**Database Tables:** `users`, `accounts`, `sessions`, `verification_tokens`

## Section 3: Payments & Billing (Stripe-First Approach)

**Purpose:** Minimal Stripe integration leveraging Stripe's built-in features
**Route:** `/payments`

**Database Tables:**

- Users table: Add `stripe_customer_id` field
- Subscriptions table: Just `user_id`, `stripe_subscription_id`, `status`, `current_period_end`
- Plans table: `name`, `stripe_price_id`, `features` (JSON for feature flags)

### Core Implementation:

**Stripe Setup:**

- Environment-based keys (test/live)
- Webhook endpoint configuration
- Product & price creation (via Stripe Dashboard)

**Minimal Flows:**

1. **Checkout:** Redirect to Stripe Checkout (one line of code)
2. **Portal:** Redirect to Customer Portal (one line of code)
3. **Subscription Status:** Check via webhook or Stripe API

**Webhook Handlers (the only complex part):**

- `checkout.session.completed` - Create user account/subscription record
- `customer.subscription.updated` - Update local subscription status
- `customer.subscription.deleted` - Mark subscription as cancelled

**Webhook Security:**

- Use `stripe.webhooks.constructEvent()` to verify the Stripe signature.
- Ensure handlers are idempotent (avoid duplicate processing).
- Only respond to known `event.type` values.
- Always return `200 OK` after successful processing to prevent retries.

**Feature Access:**

- Simple middleware: Check subscription status + plan features
- Plan-based feature flags from your plans table

**UI Components:**

- Pricing cards with "Subscribe" buttons → Stripe Checkout
- "Manage Billing" button → Customer Portal
- Current plan badge (from local subscription status)

### What We're NOT Building:

- ❌ Payment forms (use Stripe Checkout)
- ❌ Invoice pages (use Customer Portal)
- ❌ Subscription management UI (use Customer Portal)
- ❌ Payment method management (use Customer Portal)
- ❌ Email notifications (Stripe sends these)

## Section 4: Email System

**Purpose:** Resend + React Email templates + transactional email flows  
**Route:** `/emails`

### Core Features:

**Email Service:**

- Resend implementation with abstracted service layer (e.g. `sendEmail(to, template, data)`)
- Environment-based API keys (`RESEND_API_KEY`) for dev and prod

**Supported Emails:**

- Welcome email (on signup)
- Email verification (with token link)
- Password reset (with token link)
- Subscription confirmation (on successful payment)
- Subscription ending notice (on cancelation/failed payment)
- Marketing unsubscribe/resubscribe

**React Email Templates:**

- Welcome
- Verification
- Password reset
- Subscription confirmation
- Subscription ending

**Email Triggers:**

- On signup → send welcome + verification
- On password reset request → send reset email
- On Stripe webhook → send subscription confirmation or cancelation email
- Manual test sends in `/emails`

**Notes:**

- Verification & reset emails use short-lived, secure tokens from your auth system
- Resend handles delivery, open tracking, bounce handling, and logs — do not rebuild these
- Transactional emails are always sent; marketing emails are optional and depend on `marketing_emails` opt-in
- Use an idempotency key (e.g., `stripe_event_id + template_type`) for webhook-driven emails to prevent duplicate sends (store in `email_logs`)

**Database Tables (optional):**

- `email_logs` (
  id,  
   to_email,  
   template_type,  
   status, -- "sent", "failed"  
   sent_at,  
   resend_id -- for lookup in Resend dashboard  
   event_id -- for idempotency (optional)
  )
- `email_preferences` (
  user_id,  
   marketing_emails BOOLEAN DEFAULT true  
   -- Transactional emails are not affected by this setting
  )

## Section 5: AI Styling System

**Purpose:** Screenshot analysis → AI-optimized style system for custom UI generation and to avoid the generic ShadCN look that most AI apps have
**Route:** `/styling`

### Core Features:

**Input & Analysis:**

- Screenshot upload (1-3 inspiration images)
- Hybrid analysis approach:
- OpenAI Vision API for design patterns, typography, spacing, component styles
- Color.js library for precise color palette extraction
- Combines AI understanding with accurate hex values

**Analysis Extracts:**

- Exact color palettes (6-8 dominant colors with hex values)
- Typography patterns (font families, sizes, weights, line heights)
- Spacing/sizing patterns (padding, margins, gaps)
- Border radius preferences (none, sm, md, lg, full)
- Shadow styles (none, subtle, strong, layered)
- Component patterns (buttons, cards, inputs, navigation)
- Special effects (gradients, glassmorphism, animations)

**Three-File Output System:**

- Should play off of Tailwind CSS and other modern UI mentioned in the tech stack markdown file

1. **STYLE_GUIDE.md** - AI instruction manual with brand personality, color usage rules, component patterns, and code snippets
2. **tailwind.config.js** - Extended theme with custom colors, fonts, animations
3. **globals.css** - CSS variables and utility classes

**Developer Experience:**

- Copy buttons for each file
- "Apply to Demo" button - instantly preview on sample components
- Cost estimate display (~$0.03 per analysis)

**AI Optimization Features:**

- Include specific className examples in STYLE_GUIDE.md
- Add "common patterns" section for AI to reference
- Include "avoid these" anti-patterns
- Component-specific guidance (forms, navigation, cards)
- Exact measurements and values (no ambiguity)

**Implementation:**

- OpenAI Vision API for design understanding
- Color.js for accurate palette extraction
- Merge results for comprehensive style system

## Section 6: AI Site Assistant

**Purpose:** AI provider abstraction + context system + function calling foundation
**Route:** `/dev/ai`
**Features:**

- AI provider abstraction layer (easy to swap OpenAI → Anthropic → specialized models)
- Vercel AI SDK integration (streaming chat, function calling, context injection)
- Extensible context system (app info, navigation, user state)
- Function calling foundation (framework for AI actions)
- Template test queries ("Tell me about this app", "What can I do here?")
- Easy customization framework (forks can add app-specific context)
- Multi-model support ready (different AI for different tasks)
- Usage tracking and rate limiting (provider-agnostic billing)
- Foundation for AI agents (structure for future AI actions)

**Database Tables:** `ai_conversations`, `ai_usage_logs`

## Section 7: Deployment & CI/CD

**Purpose:** GitHub Actions + Vercel + database migration + production readiness
**Route:** `/dev/deployment`
**Features:**

- GitHub Actions workflow templates (test + deploy on branch push)
- Vercel configuration with environment-specific settings
- Database migration strategy (Neon dev → Neon prod scaling)
- Environment validation (connectivity testing for all services)
- Branch-based deployment (dev → staging → production)
- CI/CD abstraction layer (easy to swap GitHub Actions → GitLab CI)
- Deployment readiness checklist (pre-deploy validation)
- Configuration artifact generator (copy/paste deployment configs)

**Files Generated:** `.github/workflows/deploy.yml`, `vercel.json`, migration scripts

## Development Order

1. **Foundation:** Database setup, basic app structure, routing
2. **Core Sections:** Configuration → Auth → Payments
3. **Advanced Features:** Email → AI Styling → AI Assistant
4. **Production:** Deployment setup and testing

## Mock-First Approach

Every section works immediately without API keys:

- Mock responses for all external services
- Real functionality when proper credentials added
- Clear status indicators showing mock vs real mode
- Seamless upgrade path from testing to production

## File Structure

```
app/
├── dev/
│   ├── config/          # Section 1
│   ├── auth/            # Section 2
│   ├── payments/        # Section 3
│   ├── emails/          # Section 4
│   ├── styling/         # Section 5
│   ├── ai/              # Section 6
│   └── deployment/      # Section 7
├── (dashboard)/         # Main app area
├── (auth)/              # Auth flow pages
└── api/                 # API routes
```

## Critical Improvements To Consider

### Security & Production

- **Security headers middleware** - Add security headers (HSTS, CSP, etc.)
- **Input sanitization** - XSS protection for user inputs
- **SQL injection prevention** - Parameterized queries audit
- **Environment variable validation** - Startup validation for required env vars
- **Secrets management** - Vault integration for production secrets
- **CORS configuration** - Proper CORS setup for production

### Performance & Optimization

- **Image optimization** - Next.js Image component optimization
- **Bundle analysis** - Webpack bundle analyzer integration
- **Caching strategy** - Redis/memory caching for API responses
- **Database query optimization** - Query performance monitoring
- **CDN integration** - Cloudflare/Vercel edge caching
- **Lazy loading** - Component and route lazy loading

### Monitoring & Observability

- **Error tracking** - Sentry/Bugsnag integration
- **Application logs** - Structured logging with Winston/Pino
- **Metrics collection** - Application metrics dashboard
- **Health checks** - Deep health checks for all services
- **Uptime monitoring** - External uptime monitoring
- **Database monitoring** - Query performance and connection pooling

### Testing & Quality

- **E2E testing** - Playwright test suite expansion
- **Visual regression testing** - Screenshot comparison tests
- **Load testing** - Performance testing with k6/Artillery
- **Security testing** - OWASP security scan integration
- **Code quality gates** - ESLint, Prettier, TypeScript strict mode
- **Test coverage enforcement** - Coverage thresholds

### Developer Experience

- **Docker development** - Containerized development environment
- **API documentation** - OpenAPI/Swagger documentation
- **Database migrations** - Proper migration system
- **Development scripts** - Automated setup and teardown scripts
- **IDE configuration** - VSCode settings and extensions
- **Git hooks** - Pre-commit hooks for code quality

### Scalability & Infrastructure

- **Database scaling** - Read replicas and connection pooling
- **Queue system** - Redis/BullMQ for background jobs
- **Microservices preparation** - Service boundaries and API contracts
- **Multi-tenant support** - Tenant isolation and data segregation
- **Internationalization** - i18n support framework
- **Feature flags** - Feature toggle system

### Compliance & Legal

- **GDPR compliance** - Data privacy and user consent
- **Audit logging** - Comprehensive audit trail
- **Data retention policies** - Automated data cleanup
- **Terms of service** - Legal pages and acceptance tracking
- **Cookie management** - Cookie consent and management
- **Data export** - User data export functionality

### Advanced Features

- **Real-time features** - WebSocket/SSE implementation
- **Notification system** - Push notifications and email alerts
- **Search functionality** - Full-text search implementation
- **File management** - Advanced file upload and processing
- **Workflow automation** - Business process automation
- **Analytics integration** - Google Analytics/Mixpanel integration

_Note: These improvements were skipped during the initial enhancement phase to avoid over-engineering. Consider implementing based on specific project needs and scale requirements._
