# SaaS Starter Template - Tech Stack

## Frontend

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5.0+
- **CSS**: Tailwind CSS
- **UI Components**: Modern UI Library (guided by AI-generated style system)
- **Icons**: Lucide React
- **State Management**: React Query + React Context
- **Forms**: React Hook Form + Zod
- **URL State**: nuqs

## Backend & Database

- **API**: Next.js API Routes
- **Database**: PostgreSQL
- **ORM**: Drizzle (TypeScript-first)
- **Database GUI**: Drizzle Studio
- **Authentication**: Auth.js v5 (abstracted for easy swapping)
- **Rate Limiting**: Redis-based

## Payments & Email

- **Payments**: Stripe (abstracted service layer)
- **Email**: Resend + React Email templates
- **Billing**: Subscription management + webhooks

## AI Integration

- **Primary AI**: OpenAI GPT-4o with Vercel AI SDK
- **Use Cases**: Chat assistance, styling analysis, content generation
- **Framework**: Vercel AI SDK (streaming, provider abstraction)

## Infrastructure & Storage

- **File Storage**: Cloudflare R2
- **Caching**: Redis (sessions, rate limiting, app cache)
- **Analytics**: Plausible Analytics
- **Error Monitoring**: Sentry

## Testing & Quality

- **Frontend**: Jest + React Testing Library
- **E2E**: Playwright
- **Code Quality**: ESLint + Prettier + TypeScript strict

## Deployment & DevOps

- **Frontend Hosting**: Vercel
- **Database Hosting**: Neon (dev + prod scaling... Supabase is a good option too - both use Postgres under the hood. Neon + Cloudflare R2 cheaper at scale).
- **Backend Hosting for Next.js**: Vercel
- **Backend Hosting for Python**: Railway
- **CI/CD**: GitHub Actions
- **Version Control**: GitHub
- **LLM Hosing**: Modal/Runpod

## Development Tools

- **Package Manager**: npm
- **Build Tool**: Turbopack (unified dev + prod)
- **Code Editor**: Cursor + Claude Code
- **Environment**: Vercel Environment Variables

## Service Abstractions

**Easily swappable components:**

- **Auth**: Auth.js → Clerk → Supabase
- **Payments**: Stripe → Paddle → LemonSqueezy
- **Email**: Resend → SendGrid → Postmark
- **AI**: OpenAI → Anthropic → Groq
