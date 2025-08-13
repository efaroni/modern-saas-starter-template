# Claude Code Development Guide

Quick reference for building features correctly in this Next.js SaaS template.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript 5.0+, Tailwind CSS v4, React 19
- **Backend**: PostgreSQL + Drizzle ORM, Redis
- **Auth**: Clerk (webhook sync to local DB)
- **Payments**: Stripe (abstracted service layer)
- **Email**: Resend + React Email templates
- **AI**: OpenAI with Vercel AI SDK

## Architecture Principles

- Service layer abstraction for all external dependencies
- Factory pattern for provider instantiation
- Dependency injection for testability
- Mock-first development approach
- Comprehensive error handling

## Critical Paths (Must Not Break)

1. **Clerk Webhook**: User sync via `/api/webhooks/clerk`
2. **Auth Flow**: Registration → Login → Session → User sync
3. **Database Operations**: User CRUD, relationships
4. **Payments**: Stripe webhook processing

## Key Code Patterns

### API Routes

```typescript
// app/api/[resource]/route.ts
export async function POST(request: NextRequest) {
  try {
    const validated = schema.parse(await request.json());
    // Business logic
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
```

### Database Operations (Drizzle)

```typescript
// Simple query
const user = await db.query.users.findFirst({
  where: eq(users.email, email),
});

// Transaction
const result = await db.transaction(async tx => {
  const user = await tx.insert(users).values(userData).returning();
  await tx.insert(profiles).values({ userId: user[0].id });
  return user[0];
});
```

### Service Pattern

```typescript
export class UserService {
  constructor(
    private db: Database,
    private emailService: EmailService,
  ) {}

  async createUser(data: CreateUserData): Promise<User> {
    const user = await this.db.transaction(async tx => {
      // Create user logic
    });
    await this.emailService.sendWelcomeEmail(user.email);
    return user;
  }
}
```

### Component Pattern

```typescript
'use client';

interface Props {
  onSubmit: (data: FormData) => Promise<void>;
  initialData?: Partial<FormData>;
}

export function MyForm({ onSubmit, initialData }: Props) {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initialData,
  });
  // Component logic
}
```

## File Structure

```
/app/                    # Next.js App Router
├── api/                # API routes
│   └── webhooks/      # Webhook handlers
├── (auth)/            # Auth pages
├── (dashboard)/       # Protected areas
└── actions/           # Server actions

/lib/                   # Business logic
├── auth/              # Authentication
├── db/                # Database (schema, config)
├── email/             # Email service
├── payments/          # Payment service
└── services/          # Business services

/components/           # React components
├── ui/               # Base UI components
└── forms/            # Form components

/tests/               # Tests
├── integration/      # Integration tests
└── helpers/         # Test utilities
```

## DO's and DON'Ts

### ✅ DO

- Use Zod for validation
- Handle errors with try-catch
- Use transactions for multi-table operations
- Use dependency injection
- Follow existing patterns
- Set NODE_ENV explicitly in all environments
- Use standardized variable names (DB_HOST, DB_PORT, etc.) across all environments

### ❌ DON'T

- Use console.log (use logger service)
- Skip input validation
- Use `any` type unless necessary
- Query DB directly in components
- Modify auth flow without updating tests
- Access `process.env.DATABASE_URL` directly (use `getDatabaseUrl()`)
- **NEVER create fallbacks for `CLERK_WEBHOOK_URL` - this must always come from environment variables**
- **NEVER create fallbacks for `STRIPE_WEBHOOK_URL` - this must always come from environment variables**
- **NEVER change webhook URLs when coding - these are configured for external services**
- **NEVER use fallbacks for NODE_ENV or critical config - let code fail explicitly to identify missing configuration**
- **NEVER add test database variables to `.env.local` - tests ONLY use `.env.test`**

## Environment Variable Rules

**CRITICAL: Tests NEVER use `.env.local` - they ALWAYS use `.env.test`**

### Environment Separation Rules

- **Development**: Uses `.env.local` with `NODE_ENV=development`
- **Testing**: Uses `.env.test` with `NODE_ENV=test`
- **Production**: Uses production environment variables with `NODE_ENV=production`

### Variable Naming Standards

- **Same variable names across all environments**: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- **NO environment prefixes**: Never use `DEV_DB_*`, `TEST_DB_*`, `PROD_DB_*`
- **Environment differentiation**: Through different `.env` files, not variable names

### Configuration Principles

- **No fallbacks for critical config**: Let code fail explicitly to identify missing configuration
- **Explicit NODE_ENV**: Must be set explicitly (development, test, or production)
- **Test database safety**: Database name must contain "test" when NODE_ENV=test
- **Test cleanup responsibility**: Individual tests handle their own cleanup for data lifecycle control
- **Suite-level isolation**: Global cleanup only occurs between test suites (beforeAll/afterAll)
- **Protected development data**: Development database is never auto-wiped

## Database Configuration

Always use centralized functions from `lib/db/config.ts`:

- `getDatabaseUrl()` - Get environment-appropriate database URL
- `getDatabaseConfig()` - Get full configuration with pool settings
- `isRealDatabase()` - Check if real database is configured

### Component-Based Config (Preferred)

```bash
# Development (.env.local)
# DO NOT add test variables here - tests use .env.test
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="postgres"
DB_PASSWORD="postgres"
DB_NAME="saas_template"

# Test (.env.test)
NODE_ENV=test
DB_HOST="localhost"
DB_PORT="5433"
DB_USER="test_user"
DB_PASSWORD="test_pass"
DB_NAME="saas_template_test"
```

## Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run db:migrate       # Run migrations
npm run db:studio        # Open database UI

# Testing
npm run test             # Run all tests
npm run test:coverage    # With coverage
npm run test:load        # Load tests (separate)

# Production
npm run build            # Build for production
npm run lint             # Lint code
npm run type-check       # Type checking
```

## Environment Variables

### Test Environment Setup

**IMPORTANT**: All tests (unit, integration, E2E) should use `.env.test` for configuration:

- The test server script (`scripts/test-server.js`) explicitly loads `.env.test`
- Jest setup (`jest.setup.js`) explicitly loads `.env.test`
- This ensures proper test database isolation and prevents accidental use of development data
- Individual tests handle their own cleanup to maintain control over data lifecycle
- Global cleanup only occurs between test suites for proper isolation
- E2E tests use `npm run test:tunnel` which starts ngrok for webhook testing

```bash
# Test Configuration (.env.test)
NODE_ENV=test
DB_HOST="localhost"
DB_PORT="5433"
DB_USER="test_user"
DB_PASSWORD="test_pass"
DB_NAME="saas_template_test"

# Clerk Auth (Real test keys required for webhook testing)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
CLERK_WEBHOOK_SECRET="whsec_..."
# CRITICAL: DO NOT CHANGE THESE URLs - REQUIRED FOR WEBHOOK FUNCTIONALITY
CLERK_WEBHOOK_URL="https://gostealthiq-dev.sa.ngrok.io/api/webhooks/clerk"
STRIPE_WEBHOOK_URL="https://gostealthiq-dev.sa.ngrok.io/api/webhooks/stripe"
```

### Development Environment (.env.local)

```bash
# Database (Component-based)
# DO NOT add test variables here - tests use .env.test
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="postgres"
DB_PASSWORD="postgres"
DB_NAME="saas_template"

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
CLERK_WEBHOOK_SECRET="whsec_..."
# CRITICAL: DO NOT CHANGE THESE URLs - REQUIRED FOR WEBHOOK FUNCTIONALITY
CLERK_WEBHOOK_URL="https://gostealthiq-dev.sa.ngrok.io/api/webhooks/clerk"
STRIPE_WEBHOOK_URL="https://gostealthiq-dev.sa.ngrok.io/api/webhooks/stripe"

# Services
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
RESEND_API_KEY="re_..."
OPENAI_API_KEY="sk-..."
REDIS_URL="redis://..."
```

## Clerk Testing & Email Bypass

### E2E Testing with Clerk Test Emails

For E2E tests, use Clerk's test mode to bypass real email verification:

- **Test Email Format**: Any email with `+clerk_test` suffix (e.g., `user+clerk_test@example.com`)
- **Verification Code**: Always `424242` for test emails
- **No Real Emails**: Clerk automatically handles verification without sending actual emails

```typescript
// E2E Test Example
await page.fill('input[name="emailAddress"]', 'test+clerk_test@example.com');
// ... continue with signup flow
await page.fill('input[name="code"]', '424242'); // Fixed verification code
```

### Environment Setup

- **Development (.env.local)**: Real Clerk test keys for full functionality
- **Testing (.env.test)**: Same real Clerk test keys, mock keys for other services
- **E2E Tests**: Use NODE_ENV=test, which loads .env.test configuration

## Quick Code Templates

### Protected Route

```typescript
// app/(dashboard)/protected/page.tsx
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function ProtectedPage() {
  const session = await auth();
  if (!session) redirect('/login');
  // Page content
}
```

### Server Action

```typescript
// app/actions/user.ts
'use server';

import { auth } from '@/lib/auth';
import { userSchema } from '@/lib/schemas';

export async function updateUser(data: unknown) {
  const session = await auth();
  if (!session) throw new Error('Unauthorized');

  const validated = userSchema.parse(data);
  // Update logic
}
```

### Send Email

```typescript
import { emailService } from '@/lib/email/service';

await emailService.sendWelcomeEmail(user.email, {
  user: { email: user.email, name: user.name },
  dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
});
```

## Key Files Reference

- **Auth**: `lib/auth/` (providers, session management)
- **Database Schema**: `lib/db/schema.ts`
- **API Routes**: `app/api/[resource]/route.ts`
- **Email Templates**: `emails/[template-name].tsx`
- **Webhooks**: `app/api/webhooks/[provider]/route.ts`
- **Config**: `.env.local`, `tsconfig.json`, `tailwind.config.js`

## Service Interfaces

```typescript
// Authentication
interface AuthProvider {
  createUser(data: CreateUserData): Promise<User>;
  authenticateUser(email: string, password: string): Promise<User>;
  deleteUser(userId: string): Promise<void>;
}

// Email
interface EmailService {
  sendWelcomeEmail(email: string, data: WelcomeData): Promise<void>;
  sendPasswordResetEmail(email: string, token: string): Promise<void>;
}

// Payment
interface PaymentService {
  createCustomer(email: string): Promise<Customer>;
  createSubscription(
    customerId: string,
    priceId: string,
  ): Promise<Subscription>;
  cancelSubscription(subscriptionId: string): Promise<void>;
}
```

## Testing Structure

Directory-specific testing guides for optimal context loading:

```
tests/
├── unit/
│   └── UNIT_TESTING.md      # Loaded when writing unit tests
├── integration/
│   └── INTEGRATION_TESTING.md   # Loaded when writing integration tests
└── e2e/
    └── E2E_TESTING.md       # Loaded when writing E2E tests
```

Quick test commands:

```bash
npm run test              # All tests
npm run test:coverage     # With coverage
npm run test:e2e         # E2E tests
```

## Important Implementation Details

- **Password History**: Tracks last 5 passwords
- **Rate Limiting**: 5 attempts per 15 minutes
- **Token Expiration**: 1 hour email verification, 24 hours password reset
- **Session Security**: HTTP-only cookies, strict same-site

---

# Important Reminders

- Do what's asked; nothing more, nothing less
- Never create files unless absolutely necessary
- Always prefer editing existing files
- Never proactively create documentation files
