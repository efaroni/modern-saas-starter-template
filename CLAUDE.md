# Claude Code Development Guide

Comprehensive guide for rapid SaaS development with this modern Next.js template. This file provides context, patterns, and conventions to help Claude Code build features correctly the first time.

## Project Overview

### Application Purpose
A production-ready SaaS starter template designed for rapid deployment of modern web applications. Features complete authentication, payments, email, AI integration, and deployment pipelines.

### Tech Stack Summary
- **Frontend**: Next.js 15 (App Router), TypeScript 5.0+, Tailwind CSS v4, React 19
- **Backend**: PostgreSQL with Drizzle ORM, Redis for caching
- **Auth**: Custom DatabaseAuthProvider with Auth.js v5 abstraction
- **Payments**: Stripe (abstracted service layer)
- **Email**: Resend + React Email templates
- **AI**: OpenAI with Vercel AI SDK
- **Deployment**: Vercel + Neon PostgreSQL

### Architecture Principles
- Service layer abstraction for all external dependencies
- Factory pattern for provider instantiation
- Dependency injection for testability
- Mock-first development approach
- Comprehensive error handling and logging

## Current Sprint / Active Development

### Recent Architectural Decisions
- Implemented custom DatabaseAuthProvider replacing default Auth.js adapter
- Added comprehensive password history tracking
- Enhanced session management with Redis caching
- Standardized error response format across API routes

### Active Features
- [ ] Completing Section 7: Deployment & CI/CD
- [ ] Implementing AI styling system (Section 5)
- [ ] Enhancing email template system

### Known Issues & Blockers
- Parallel test execution requires careful data isolation
- Rate limiting tests need retry logic for stability
- Some Auth.js edge cases with custom provider

## Code Patterns & Conventions

### TypeScript Patterns
```typescript
// Always use explicit types for function parameters
export async function createUser(data: CreateUserData): Promise<User> {
  // Implementation
}

// Use Zod for runtime validation
const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

// Type inference from schemas
type UserInput = z.infer<typeof userSchema>;
```

### Component Structure
```typescript
// Client Component Pattern
'use client';

interface UserFormProps {
  onSubmit: (data: UserData) => Promise<void>;
  initialData?: Partial<UserData>;
}

export function UserForm({ onSubmit, initialData }: UserFormProps) {
  const form = useForm<UserData>({
    resolver: zodResolver(userSchema),
    defaultValues: initialData
  });
  
  // Component logic
}
```

### API Route Pattern
```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = userSchema.parse(body);
    
    // Business logic
    
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}
```

### Database Query Patterns
```typescript
// Using Drizzle ORM
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

// Simple query
const user = await db.query.users.findFirst({
  where: eq(users.email, email)
});

// Transaction pattern
const result = await db.transaction(async (tx) => {
  const user = await tx.insert(users).values(userData).returning();
  await tx.insert(profiles).values({ userId: user[0].id });
  return user[0];
});
```

### Service Layer Pattern
```typescript
// lib/services/user.service.ts
export class UserService {
  constructor(
    private db: Database,
    private emailService: EmailService
  ) {}
  
  async createUser(data: CreateUserData): Promise<User> {
    const user = await this.db.transaction(async (tx) => {
      // Create user logic
    });
    
    await this.emailService.sendWelcomeEmail(user.email);
    return user;
  }
}
```

### Error Handling Pattern
```typescript
// Custom error classes
export class AuthenticationError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

// Usage
if (!isValidPassword) {
  throw new AuthenticationError('Invalid credentials', 'INVALID_CREDENTIALS');
}
```

## API & Data Models

### Core Database Schema
```typescript
// Users table
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password'),
  emailVerified: timestamp('email_verified'),
  createdAt: timestamp('created_at').defaultNow()
});

// Sessions table
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  sessionToken: text('session_token').unique(),
  expires: timestamp('expires')
});
```

### Authentication Flow
1. **Registration**: `/api/auth/register` → `DatabaseAuthProvider.createUser()`
2. **Login**: `/api/auth/login` → `DatabaseAuthProvider.authenticateUser()`
3. **Session**: Cookie-based with Redis caching
4. **Password Reset**: Token-based with 24h expiration
5. **Email Verification**: Token-based with 1h expiration

### API Endpoint Structure
```
/api/
├── auth/
│   ├── login/          POST   - User login
│   ├── register/       POST   - User registration
│   ├── logout/         POST   - User logout
│   ├── reset-password/ POST   - Initiate password reset
│   └── verify-email/   POST   - Verify email token
├── users/
│   ├── profile/        GET/PUT - User profile
│   └── settings/       GET/PUT - User settings
├── billing/
│   ├── subscription/   GET/POST/DELETE - Manage subscription
│   └── webhook/        POST   - Stripe webhooks
└── admin/
    └── users/          GET    - List users (admin only)
```

### Service Abstractions
```typescript
// Authentication Provider Interface
interface AuthProvider {
  createUser(data: CreateUserData): Promise<User>;
  authenticateUser(email: string, password: string): Promise<User>;
  deleteUser(userId: string): Promise<void>;
}

// Email Service Interface  
interface EmailService {
  sendEmail(to: string, subject: string, html: string): Promise<void>;
  sendWelcomeEmail(email: string): Promise<void>;
  sendPasswordResetEmail(email: string, token: string): Promise<void>;
}

// Payment Service Interface
interface PaymentService {
  createCustomer(email: string): Promise<Customer>;
  createSubscription(customerId: string, priceId: string): Promise<Subscription>;
  cancelSubscription(subscriptionId: string): Promise<void>;
}
```

## Test Suite Overview

**Current Status**: 99.7%+ pass rate (326/327 tests passing)
- Test execution time: ~15 seconds
- Parallel execution with 2 workers
- High reliability for CI/CD

## Critical Paths That Must Not Break

### 1. Authentication Flow
- **User Registration**: `DatabaseAuthProvider.createUser()`
- **User Login**: `DatabaseAuthProvider.authenticateUser()`
- **Password Reset**: Token-based password reset flow
- **Email Verification**: Token-based email verification

### 2. Database Operations
- All auth services use dependency injection with `testDb` for testing
- Password history tracking for security
- Rate limiting for brute force protection

### 3. Session Management
- Session creation, validation, and destruction
- Cookie configuration and security
- Concurrent session limits

## Test Confidence Levels

### High Confidence Tests (Must Pass)
1. **Authentication Tests** (`tests/lib/auth/providers/database.test.ts`)
   - Core CRUD operations
   - Password validation
   - Email verification

2. **Integration Tests** (`tests/integration/auth/`)
   - Complete user workflows
   - Error handling scenarios
   - Session persistence

3. **Security Tests** (`tests/security/auth-security.test.ts`)
   - SQL injection prevention
   - Rate limiting
   - Password complexity

### Medium Confidence Tests
1. **Session Manager Tests** (`tests/lib/auth/session-manager.test.ts`)
   - 16 comprehensive tests
   - Uses retry logic for stability

2. **Email Integration Tests** (`tests/lib/auth/email-integration.test.ts`)
   - Token generation and verification
   - Password reset flow

### Known Test Considerations

1. **Removed Tests** (due to parallel execution issues):
   - Password reuse prevention test
   - Session invalidation on password change test
   - These features still work but tests were flaky

2. **Load Tests** (`tests/load/`)
   - Separated into own test suite
   - Run with `npm run test:load`
   - Not part of regular CI/CD

## Development Guidelines

### When Adding New Features
1. **Database Configuration**: Always use centralized functions from `lib/db/config.ts`:
   - `getDatabaseUrl()` - Get environment-appropriate database URL
   - `getDatabaseConfig()` - Get full configuration with pool settings
   - `isRealDatabase()` - Check if real database is configured (vs mock)
2. Generate unique emails with `authTestHelpers.generateUniqueEmail()`
3. Clean up test data in `afterEach` hooks
4. Consider parallel execution impacts

### Database Configuration Best Practices

#### Component-Based Configuration (Preferred)
The system now supports component-based database configuration for easier management:

```bash
# .env.local (Development)
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="postgres"
DB_PASSWORD="postgres"
DB_NAME="saas_template"

# .env.test (Test Environment) 
TEST_DB_HOST="localhost"
TEST_DB_PORT="5433"
TEST_DB_USER="test_user"
TEST_DB_PASSWORD="test_pass"
TEST_DB_NAME="saas_template_test"

# Production (Environment Variables)
DB_HOST="your-production-host.com"
DB_PORT="5432"
DB_USER="prod_user"
DB_PASSWORD="secure_password"
DB_NAME="production_db"
```

#### Key Benefits
- **Single Source Configuration**: Change host/port/credentials in one place
- **Environment-Specific**: Different settings for dev/test/prod automatically
- **Backwards Compatible**: Still supports `DATABASE_URL` for legacy setups
- **Security**: Component-based approach makes credential management easier

#### Usage Guidelines
- **Never use `process.env.DATABASE_URL` directly** - Use `getDatabaseUrl()` instead
- **Environment Detection**: The system automatically:
  - Builds URLs from components (preferred)
  - Falls back to `TEST_DATABASE_URL` when `NODE_ENV=test`
  - Falls back to `DATABASE_URL` for legacy compatibility
- **Service Factory Pattern**: Use `isRealDatabase()` to choose between real and mock services
- **Connection Components**: Use `getDatabaseConnectionComponents()` to get host/port/etc.

### Test Commands
```bash
# Run all tests
npm run test

# Run specific test file
npm run test path/to/test.ts

# Run load tests separately
npm run test:load

# Run with coverage
npm run test:coverage
```

### Common Test Fixes
1. **Foreign key violations**: Wrap operations in try-catch
2. **Timing issues**: Add retry logic (see session manager tests)
3. **Parallel conflicts**: Use worker-specific data isolation

## Important Implementation Details

1. **Password History**: Tracks last 5 passwords to prevent reuse
2. **Rate Limiting**: 5 attempts per 15 minutes for login
3. **Token Expiration**: 1 hour for email verification, 24 hours for password reset
4. **Session Security**: HTTP-only cookies, strict same-site policy

## Refactoring Safety

When refactoring:
1. Run full test suite before and after changes
2. Pay special attention to authentication flow tests
3. Ensure database migrations don't break existing tests
4. Keep dependency injection pattern for testability

The test suite is designed to give you confidence when refactoring. With 99.7%+ tests passing reliably, you can make changes knowing that critical functionality is protected.

## Common Tasks & Commands

### Development Workflow
```bash
# Start development server
npm run dev

# Run database migrations
npm run db:migrate

# Open database studio
npm run db:studio

# Generate types from schema
npm run db:generate
```

### Testing Commands
```bash
# Run all tests
npm run test

# Run specific test file
npm run test tests/lib/auth/providers/database.test.ts

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run load tests separately
npm run test:load

# Run E2E tests
npm run test:e2e
```

### Build & Deployment
```bash
# Type check
npm run type-check

# Lint code
npm run lint

# Format code
npm run format

# Build for production
npm run build

# Preview production build
npm run start
```

### Database Commands
```bash
# Create new migration
npm run db:migrate:create <migration_name>

# Run migrations
npm run db:migrate

# Push schema changes (development)
npm run db:push

# Seed database
npm run db:seed
```

## DO's and DON'Ts

### DO's ✅
- Use dependency injection for all services
- Validate all user inputs with Zod
- Handle errors explicitly with try-catch
- Use transactions for multi-table operations
- Clean up test data in afterEach hooks
- Use environment variables for configuration
- Follow existing code patterns
- Write tests for new features
- Use TypeScript strict mode

### DON'Ts ❌
- Don't use console.log in production code (use logger service)
- Don't store sensitive data in plain text
- Don't skip input validation
- Don't use `any` type unless absolutely necessary
- Don't create files outside established patterns
- Don't modify auth flow without updating tests
- Don't use direct database queries in components
- Don't expose internal errors to users
- Don't skip error handling

## Quick Reference

### File Structure
```
/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages (login, register, etc)
│   ├── (dashboard)/       # Protected dashboard area
│   ├── (dev)/             # Development sections
│   ├── actions/           # Server actions
│   ├── api/               # API routes
│   └── globals.css        # Global styles
├── components/            # Reusable UI components
│   ├── ui/                # Base UI components
│   └── forms/             # Form components
├── lib/                   # Core business logic
│   ├── auth/              # Authentication system
│   │   ├── providers/     # Auth provider implementations
│   │   │   ├── database.ts
│   │   │   └── database.test.ts  # Unit test (adjacent)
│   │   ├── session-manager.ts
│   │   ├── session-manager.test.ts  # Unit test (adjacent)
│   │   └── types.ts
│   ├── db/                # Database layer
│   │   ├── schema.ts      # Drizzle schema
│   │   └── index.ts       # DB connection
│   ├── email/             # Email service
│   │   ├── service.ts
│   │   └── service.test.ts  # Unit test (adjacent)
│   ├── payments/          # Payment service
│   └── utils/             # Utility functions
├── tests/                 # Integration and E2E tests only
│   ├── integration/       # Integration tests
│   │   └── auth/          # Auth integration tests
│   ├── e2e/               # End-to-end tests
│   ├── load/              # Load tests
│   ├── security/          # Security tests
│   └── helpers/           # Test utilities
└── public/                # Static assets
```

### Key Files for Common Tasks

**Adding Authentication:**
- Provider implementation: `lib/auth/providers/database.ts`
- Session management: `lib/auth/session-manager.ts`
- Auth types: `lib/auth/types.ts`
- API routes: `app/api/auth/`

**Database Changes:**
- Schema definition: `lib/db/schema.ts`
- Migration folder: `drizzle/`
- Connection config: `lib/db/index.ts`

**Adding API Endpoints:**
- Route handlers: `app/api/[resource]/route.ts`
- Validation schemas: Create in same file or `lib/schemas/`
- Service layer: `lib/services/[service].ts`

**UI Components:**
- Base components: `components/ui/`
- Form components: `components/forms/`
- Layout components: `app/(group)/layout.tsx`

**Configuration:**
- Environment variables: `.env.local`
- TypeScript config: `tsconfig.json`
- Tailwind config: `tailwind.config.js`
- Next.js config: `next.config.ts`

### Environment Variables
```bash
# Database (Component-based - Preferred)
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="postgres"
DB_PASSWORD="postgres"
DB_NAME="saas_template"

# Test Database (when NODE_ENV=test)
TEST_DB_HOST="localhost"
TEST_DB_PORT="5433"
TEST_DB_USER="test_user"
TEST_DB_PASSWORD="test_pass"
TEST_DB_NAME="saas_template_test"

# Legacy Database (backwards compatibility)
# DATABASE_URL="postgresql://..."
# TEST_DATABASE_URL="postgresql://..."

# Authentication
AUTH_SECRET="..."  # Generate with: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"

# OAuth Providers
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Email
RESEND_API_KEY="re_..."

# Redis
REDIS_URL="redis://..."

# AI
OPENAI_API_KEY="sk-..."
```

### Common Code Snippets

**Protected Route:**
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

**Server Action:**
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

**API Route with Auth:**
```typescript
// app/api/protected/route.ts
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // Route logic
}
```