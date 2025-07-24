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

Potential wishlist for this app:

Core Infrastructure

- Authentication & Authorization: Email/password, OAuth providers (Google, GitHub), JWT tokens, refresh token rotation, role-based access control (RBAC)
- Multi-tenancy: Organization/workspace management, user invitations, team member roles
- Database setup: PostgreSQL with migrations, connection pooling, and ORM configuration
- API structure: RESTful endpoints with consistent error handling, rate limiting, and API versioning
  User Management
- User profiles: Avatar uploads, profile settings, email verification
- Password management: Secure reset flows, password strength requirements
- Session management: Device tracking, "remember me" functionality, session invalidation
  Billing & Payments
- Stripe integration: Subscription management, payment method handling, webhooks
- Pricing tiers: Free/trial/paid plans with feature flags
- Usage tracking: Metering for usage-based billing
- Invoice generation: Downloadable receipts and billing history
  Developer Experience
- TypeScript: Full type safety across frontend and backend
- Environment management: .env files with validation, separate configs for dev/staging/prod
- Error tracking: Sentry or similar integration with proper error boundaries
- Logging: Structured logging with correlation IDs for request tracing
  Frontend Foundation
- Component library: Shadcn/ui or similar for consistent UI components
- Form handling: React Hook Form with Zod validation
- State management: Zustand or Context API for global state
- Data fetching: TanStack Query with optimistic updates
  Backend Essentials
- Background jobs: Queue system for email sending, data processing
- Email service: Transactional emails with templates (welcome, password reset, notifications)
- File uploads: S3 or similar with presigned URLs
- Webhooks: Outgoing webhook system for integrations
  DevOps & Deployment
- Docker setup: Containerized development environment
- CI/CD pipeline: GitHub Actions for testing and deployment
- Database migrations: Automated migration running
- Health checks: Monitoring endpoints for uptime tracking
  Security
- CORS configuration: Proper cross-origin settings
- CSP headers: Content Security Policy setup
- Input sanitization: XSS and SQL injection prevention
- 2FA support: TOTP-based two-factor authentication
  Analytics & Monitoring
- User analytics: Basic event tracking (page views, feature usage)
- Performance monitoring: Web vitals tracking
- A/B testing: Feature flag system for gradual rollouts
  Legal & Compliance
- GDPR tools: Data export, account deletion
- Cookie consent: Banner and preference management
- Terms & Privacy: Basic legal page templates
  Nice-to-Haves (Consider Based on Needs)
- Admin dashboard: User management, metrics viewing
- API documentation: Auto-generated API docs
- Notification system: In-app notifications with bell icon
- Search functionality: Basic full-text search
- Internationalization: i18n setup for multi-language support
- Dark mode: Theme switching capability
