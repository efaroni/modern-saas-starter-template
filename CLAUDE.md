# Claude Code Development Guide

Quick reference for building features correctly in this Next.js SaaS template.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript 5.0+, Tailwind CSS v4, React 19
- **Backend**: PostgreSQL + Drizzle ORM, Redis
- **Auth**: Clerk for authentication (webhook sync to local DB)
- **Payments**: Stripe for payments (abstracted service layer)
- **Email**: Resend + React Email templates
- **AI**: OpenAI with Vercel AI SDK

## Environment Configuration

- **Local Development**: Uses local database configured in `.env.local`
- **Testing**: Uses isolated test database via `.env.test` - tests wipe database after each run
- **Database Isolation**: Test and local databases are completely separate to prevent data conflicts

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
- Clean up test data in afterEach hooks
- Use dependency injection
- Follow existing patterns

### ❌ DON'T

- Use console.log (use logger service)
- Skip input validation
- Use `any` type unless necessary
- Query DB directly in components
- Modify auth flow without updating tests
- Access `process.env.DATABASE_URL` directly (use `getDatabaseUrl()`)

## Database Configuration

Always use centralized functions from `lib/db/config.ts`:

- `getDatabaseUrl()` - Get environment-appropriate database URL
- `getDatabaseConfig()` - Get full configuration with pool settings
- `isRealDatabase()` - Check if real database is configured

### Component-Based Config (Preferred)

```bash
# Development (.env.local)
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="postgres"
DB_PASSWORD="postgres"
DB_NAME="saas_template"

# Test (.env.test)
TEST_DB_HOST="localhost"
TEST_DB_PORT="5433"
TEST_DB_USER="test_user"
TEST_DB_PASSWORD="test_pass"
TEST_DB_NAME="saas_template_test"
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

```bash
# Database (Component-based)
DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
TEST_DB_HOST, TEST_DB_PORT, TEST_DB_USER, TEST_DB_PASSWORD, TEST_DB_NAME

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
CLERK_WEBHOOK_SECRET="whsec_..."

# Services
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
RESEND_API_KEY="re_..."
OPENAI_API_KEY="sk-..."
REDIS_URL="redis://..."
```

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

## Git Commit Standards

This project uses **Conventional Commits** with commitlint and Husky. Use format: `type(scope): description`

Examples: `feat(auth): add oauth`, `fix(api): handle errors`, `docs: update readme`

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
