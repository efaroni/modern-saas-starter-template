# Setup Guide - API Keys & Services

This guide walks you through getting the necessary API keys for each service. The template works in mock mode without any keys, but you'll need real keys to test actual integrations.

## Required Services by Section

### Section 1: Configuration ✅
- **Status**: No external services needed
- **What's working**: API key management UI with database storage

### Section 2: Authentication (Coming Soon)
- **Required**: None (Auth.js works with email/password)
- **Optional OAuth Providers**:
  - **GitHub OAuth**: 
    1. Go to https://github.com/settings/developers
    2. Click "New OAuth App"
    3. Set callback URL: `http://localhost:3000/api/auth/callback/github`
    4. Copy Client ID → `GITHUB_ID`
    5. Copy Client Secret → `GITHUB_SECRET`
  
  - **Google OAuth**:
    1. Go to https://console.cloud.google.com/
    2. Create new project or select existing
    3. Enable Google+ API
    4. Create OAuth 2.0 credentials
    5. Add redirect URI: `http://localhost:3000/api/auth/callback/google`
    6. Copy credentials → `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

### Section 3: Payments
- **Stripe** (Required):
  1. Sign up at https://stripe.com
  2. Go to https://dashboard.stripe.com/test/apikeys
  3. Copy **Test** keys (not live!):
     - Secret key → `STRIPE_SECRET_KEY`
     - Publishable key → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  4. For webhooks (later):
     - Go to Webhooks section
     - Add endpoint: `http://localhost:3000/api/webhooks/stripe`
     - Copy signing secret → `STRIPE_WEBHOOK_SECRET`

### Section 4: Email
- **Resend** (Required):
  1. Sign up at https://resend.com
  2. Go to https://resend.com/api-keys
  3. Create API key → `RESEND_API_KEY`
  4. Verify a domain or use their test domain
  5. Set `RESEND_FROM_EMAIL` to your verified email

### Section 5 & 6: AI Features
- **OpenAI** (Required):
  1. Sign up at https://platform.openai.com
  2. Go to https://platform.openai.com/api-keys
  3. Create new API key → `OPENAI_API_KEY`
  4. **Important**: Set usage limits to avoid surprises!
     - Go to Usage limits
     - Set monthly budget (e.g., $10)

### Optional Services

#### File Storage (Cloudflare R2)
1. Sign up at https://cloudflare.com
2. Go to R2 in dashboard
3. Create bucket
4. Generate API token
5. Fill in R2 variables in .env.local

#### Redis Cache (Upstash)
1. Sign up at https://upstash.com
2. Create Redis database
3. Copy REST URL and token

## Testing Without Real Keys

The template includes mock keys that let you test the UI and flows:
- Mock keys are already in `.env.local`
- All features work in "mock mode"
- You'll see status indicators showing mock vs. real mode

## Quick Start Checklist

For basic testing (mock mode):
- [x] Docker Desktop installed and running
- [x] PostgreSQL database running (`npm run db:start`)
- [x] Mock API keys in `.env.local`

For real integration testing:
- [ ] Stripe account → Get test API keys
- [ ] Resend account → Get API key and verify domain
- [ ] OpenAI account → Get API key with usage limits
- [ ] (Optional) GitHub OAuth app
- [ ] (Optional) Google OAuth credentials
- [ ] (Optional) Cloudflare R2 for file storage
- [ ] (Optional) Upstash Redis for caching

## Next Steps

1. **Test mock mode first**: Run `npm run dev` and visit http://localhost:3000/dev
2. **Add real keys gradually**: Start with Stripe test keys
3. **Set spending limits**: Especially for OpenAI
4. **Use test data**: Never use production data in development

## Environment Files

- `.env.local` - Development environment (git ignored)
- `.env.production` - Production environment (never commit!)
- `.env.example` - Template for others (safe to commit)

Remember: The app works great in mock mode! Only add real keys when you need to test specific integrations.