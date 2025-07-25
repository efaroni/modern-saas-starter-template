# SaaS Email Boilerplate Implementation Guide

## Overview

This document outlines the implementation of essential email functionality for a modern SaaS application using Resend and React Email. The focus is on core transactional emails only - no bloat, no marketing features, just the essentials that every SaaS needs.

## High-Level Features

### Core Email Types (Essential Only)

1. **Authentication Emails**
   - Magic link login
   - Password reset
   - Email verification

2. **Account Management**
   - Welcome email (post-signup)
   - Account deletion confirmation

3. **Billing Integration** (Stripe webhooks)
   - Payment successful
   - Payment failed
   - Subscription status change (upgraded/downgraded/cancelled)

4. **System Notifications**
   - Critical security alerts (new device login, password changed)
   - Service downtime notifications (optional, can be added per project)

### Technical Architecture

```
src/
├── lib/
│   ├── email/
│   │   ├── client.ts          # Resend client configuration
│   │   ├── send.ts            # Generic send function with error handling
│   │   └── types.ts           # Email payload types
│   │
├── emails/                    # React Email templates
│   ├── auth/
│   │   ├── magic-link.tsx
│   │   ├── password-reset.tsx
│   │   └── verify-email.tsx
│   ├── account/
│   │   ├── welcome.tsx
│   │   └── deletion-confirm.tsx
│   ├── billing/
│   │   ├── payment-success.tsx
│   │   ├── payment-failed.tsx
│   │   └── subscription-change.tsx
│   ├── security/
│   │   └── security-alert.tsx
│   └── components/           # Shared email components
│       ├── header.tsx
│       ├── footer.tsx
│       └── button.tsx
│
├── api/
│   └── webhooks/
│       └── stripe/           # Stripe webhook handlers that trigger emails
```

### Key Design Decisions

1. **No Marketing Features**: No newsletter signup, no campaigns, no tracking pixels
2. **React Email for Templates**: Type-safe, component-based email templates
3. **Resend for Delivery**: Simple API, great deliverability, no complexity
4. **Minimal Dependencies**: Only what's needed for core functionality
5. **Environment-based Configuration**: Easy to switch between dev/staging/prod
6. **Error Handling**: Graceful failures with proper logging
7. **No Email Storage**: Emails are sent and forgotten (GDPR friendly)

## Implementation Details

### Environment Variables

```env
# Required
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
RESEND_FROM_NAME=Your SaaS Name

# Optional (for development)
RESEND_AUDIENCE_ID=xxxxx  # For managing test recipients
EMAIL_DEV_MODE=true       # Logs emails instead of sending in dev
```

### Core Email Client (`lib/email/client.ts`)

```typescript
import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);

export const EMAIL_CONFIG = {
  from: {
    email: process.env.RESEND_FROM_EMAIL || 'noreply@example.com',
    name: process.env.RESEND_FROM_NAME || 'Your SaaS',
  },
  replyTo: process.env.RESEND_REPLY_TO || undefined,
  isDev: process.env.EMAIL_DEV_MODE === 'true',
};
```

### Generic Send Function (`lib/email/send.ts`)

```typescript
import { resend, EMAIL_CONFIG } from './client';
import { CreateEmailOptions } from 'resend';
import { ReactElement } from 'react';

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  react: ReactElement;
  scheduledAt?: string;
  tags?: Array<{ name: string; value: string }>;
}

export async function sendEmail({
  to,
  subject,
  react,
  ...options
}: SendEmailOptions) {
  // Development mode: log instead of send
  if (EMAIL_CONFIG.isDev) {
    console.log('📧 Email (dev mode):', { to, subject });
    return { id: 'dev-mode', success: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${EMAIL_CONFIG.from.name} <${EMAIL_CONFIG.from.email}>`,
      to,
      subject,
      react,
      ...options,
    });

    if (error) {
      console.error('Email send error:', error);
      throw new Error(error.message);
    }

    return { id: data?.id, success: true };
  } catch (error) {
    console.error('Email send failed:', error);
    // Don't throw - gracefully handle email failures
    return { id: null, success: false, error };
  }
}
```

### Email Template Structure

Each email template follows this pattern:

```typescript
// emails/auth/magic-link.tsx
import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import { Header } from '../components/header';
import { Footer } from '../components/footer';

interface MagicLinkEmailProps {
  loginLink: string;
  userEmail: string;
  expiresIn?: string;
}

export function MagicLinkEmail({
  loginLink,
  userEmail,
  expiresIn = '15 minutes'
}: MagicLinkEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Sign in to Your SaaS</Preview>
      <Body style={main}>
        <Container style={container}>
          <Header />
          <Section style={content}>
            <Text style={paragraph}>
              Click the button below to sign in to your account.
            </Text>
            <Button href={loginLink} style={button}>
              Sign In
            </Button>
            <Text style={paragraph}>
              This link expires in {expiresIn}.
            </Text>
          </Section>
          <Footer />
        </Container>
      </Body>
    </Html>
  );
}

// Styles would be defined here
const main = { ... };
const container = { ... };
const content = { ... };
const paragraph = { ... };
const button = { ... };
```

### API Integration Example

```typescript
// app/api/auth/magic-link/route.ts
import { sendEmail } from '@/lib/email/send';
import { MagicLinkEmail } from '@/emails/auth/magic-link';

export async function POST(request: Request) {
  const { email } = await request.json();

  // Generate magic link token (your auth logic here)
  const token = generateMagicLinkToken(email);
  const magicLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify?token=${token}`;

  // Send email
  const result = await sendEmail({
    to: email,
    subject: 'Sign in to Your SaaS',
    react: MagicLinkEmail({
      loginLink: magicLink,
      userEmail: email,
    }),
    tags: [
      { name: 'category', value: 'auth' },
      { name: 'type', value: 'magic-link' },
    ],
  });

  return Response.json({ success: result.success });
}
```

## Testing Strategy

### Unit Tests

**What to test:**

- Email template rendering with different props
- Conditional content rendering
- Proper escaping of user input
- Component composition

**Test Structure:**

```typescript
// __tests__/emails/auth/magic-link.test.tsx
import { render } from '@react-email/render';
import { MagicLinkEmail } from '@/emails/auth/magic-link';

describe('MagicLinkEmail', () => {
  it('renders with required props', async () => {
    const html = await render(
      MagicLinkEmail({
        loginLink: 'https://example.com/auth/verify?token=123',
        userEmail: 'user@example.com',
      }),
    );

    expect(html).toContain('Sign In');
    expect(html).toContain('https://example.com/auth/verify?token=123');
  });

  it('escapes user email properly', async () => {
    const html = await render(
      MagicLinkEmail({
        loginLink: 'https://example.com',
        userEmail: '<script>alert("xss")</script>@example.com',
      }),
    );

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
```

**Email sending function tests:**

```typescript
// __tests__/lib/email/send.test.ts
import { sendEmail } from '@/lib/email/send';
import { resend } from '@/lib/email/client';

jest.mock('@/lib/email/client');

describe('sendEmail', () => {
  it('sends email successfully', async () => {
    const mockSend = jest.fn().mockResolvedValue({
      data: { id: 'email_123' },
      error: null
    });
    (resend.emails.send as jest.Mock) = mockSend;

    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      react: <div>Test Email</div>
    });

    expect(result.success).toBe(true);
    expect(result.id).toBe('email_123');
  });

  it('handles send failures gracefully', async () => {
    const mockSend = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'Invalid API key' }
    });
    (resend.emails.send as jest.Mock) = mockSend;

    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      react: <div>Test Email</div>
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

### Integration Tests

**What to test:**

- API endpoints that trigger emails
- Webhook handlers (Stripe) that send emails
- Email delivery in test environment
- Rate limiting and error handling

**Test Structure:**

```typescript
// __tests__/api/auth/magic-link.test.ts
import { POST } from '@/app/api/auth/magic-link/route';
import { sendEmail } from '@/lib/email/send';

jest.mock('@/lib/email/send');

describe('POST /api/auth/magic-link', () => {
  it('sends magic link email', async () => {
    const mockSendEmail = jest.fn().mockResolvedValue({
      success: true,
      id: 'email_123',
    });
    (sendEmail as jest.Mock) = mockSendEmail;

    const request = new Request('http://localhost/api/auth/magic-link', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@example.com' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Sign in to Your SaaS',
      }),
    );
    expect(data.success).toBe(true);
  });
});
```

**Stripe webhook integration test:**

```typescript
// __tests__/api/webhooks/stripe.test.ts
describe('Stripe webhook - payment succeeded', () => {
  it('sends payment success email', async () => {
    const mockEvent = {
      type: 'payment_intent.succeeded',
      data: {
        object: {
          amount: 2000,
          currency: 'usd',
          receipt_email: 'customer@example.com',
        },
      },
    };

    const response = await POST(createStripeWebhookRequest(mockEvent));

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'customer@example.com',
        subject: expect.stringContaining('Payment Successful'),
      }),
    );
  });
});
```

### E2E Tests

**What to test:**

- Complete user flows that trigger emails
- Email delivery to test accounts
- Link functionality in emails
- Cross-client rendering (optional, using Email on Acid or Litmus)

**Test Structure:**

```typescript
// e2e/auth-flow.spec.ts
import { test, expect } from '@playwright/test';
import { getTestEmail } from './helpers/test-email';

test.describe('Authentication Flow', () => {
  test('magic link login flow', async ({ page }) => {
    // 1. Request magic link
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Check your email')).toBeVisible();

    // 2. Check test email inbox (using Resend's test mode or a service like Mailhog)
    const email = await getTestEmail({
      to: 'test@example.com',
      subject: 'Sign in to Your SaaS',
      timeout: 10000,
    });

    expect(email).toBeDefined();
    expect(email.html).toContain('Sign In');

    // 3. Extract and visit magic link
    const magicLink = extractLinkFromEmail(email.html, 'Sign In');
    await page.goto(magicLink);

    // 4. Verify logged in
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('password reset flow', async ({ page }) => {
    // Similar structure for password reset
  });
});
```

**Email rendering E2E (optional):**

```typescript
// e2e/email-rendering.spec.ts
test.describe('Email Client Rendering', () => {
  test('renders correctly in major clients', async () => {
    const emailHtml = await render(
      WelcomeEmail({
        userName: 'Test User',
      }),
    );

    // Use Email on Acid API or similar
    const results = await testEmailRendering(emailHtml, [
      'gmail-desktop',
      'outlook-2019',
      'apple-mail',
      'gmail-mobile-ios',
      'gmail-mobile-android',
    ]);

    expect(results.every(r => r.score > 95)).toBe(true);
  });
});
```

## Development Workflow

### Local Development Setup

```bash
# Install dependencies
npm install resend @react-email/components

# Set up environment variables
cp .env.example .env.local

# Run email preview server
npm run email:dev

# Run application
npm run dev
```

### Email Preview Script (package.json)

```json
{
  "scripts": {
    "email:dev": "email dev --dir src/emails --port 3001",
    "email:build": "email build --dir src/emails --out .react-email"
  }
}
```

### Testing Email Delivery Locally

1. **Option 1: Console Logging** (EMAIL_DEV_MODE=true)
   - Emails are logged to console instead of sent
   - Good for rapid development

2. **Option 2: Resend Test Mode**
   - Use Resend's test API key
   - Emails show in Resend dashboard but aren't delivered

3. **Option 3: Local SMTP** (Mailhog/MailCatcher)
   - Run local SMTP server
   - Catch all emails locally

## Production Considerations

### Security

- Always validate email addresses before sending
- Rate limit email sending endpoints
- Use CSRF protection on email trigger endpoints
- Sanitize all user input in email templates
- Don't expose internal IDs or sensitive data in emails

### Performance

- Send emails asynchronously (queue/background jobs)
- Implement retry logic with exponential backoff
- Batch emails when possible (within Resend limits)
- Cache email templates in production

### Monitoring

- Track email send success/failure rates
- Monitor Resend API quota usage
- Set up alerts for failed email sends
- Log email events for debugging

### Compliance

- Include unsubscribe links where required
- Respect user email preferences
- Don't store email content (GDPR)
- Add required footer information (company details, address)

## Migration Path

When forking for new projects:

1. **Update branding**: Change `EMAIL_CONFIG` defaults
2. **Customize templates**: Modify styles in shared components
3. **Add project-specific emails**: Extend the base set as needed
4. **Configure webhooks**: Set up Stripe or other service webhooks
5. **Update tests**: Ensure all email flows are covered

## Common Pitfalls to Avoid

1. **Don't over-engineer**: Resist adding email tracking, campaigns, or analytics
2. **Don't store emails**: This isn't an email client, just a sender
3. **Don't skip error handling**: Email delivery can fail
4. **Don't forget mobile**: Test email rendering on mobile devices
5. **Don't use complex CSS**: Stick to inline styles and basic layouts
6. **Don't send too many emails**: Implement proper rate limiting

## Resources

- [React Email Documentation](https://react.email/docs)
- [Resend API Reference](https://resend.com/docs/api-reference)
- [Email Client CSS Support](https://www.caniemail.com/)
- [MJML (alternative if needed)](https://mjml.io/)
