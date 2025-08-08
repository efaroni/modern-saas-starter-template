# SaaS Email Boilerplate Implementation Guide

## Overview

This document outlines the implementation of essential email functionality for a modern SaaS application using Resend and React Email. The focus is on core transactional emails only - no bloat, no marketing features, just the essentials that every SaaS needs.

## 🎉 Implementation Status: COMPLETED

### ✅ What Has Been Implemented

**Core Email Infrastructure:**

- Complete email service architecture with ResendEmailService and MockEmailService
- React Email templates for all email types
- Email preference enforcement system
- Unsubscribe functionality with user-friendly UI

**Email Types:**

- ✅ Welcome emails (sent automatically on Clerk user signup)
- ✅ Password reset notifications (for post-reset security alerts)
- ✅ Payment success/failure emails (integrated with Stripe webhooks)
- ✅ Subscription change notifications (with proper React Email template)
- ✅ Marketing emails (with preference checking and personalized unsubscribe links)

**User Experience:**

- ✅ Email management dashboard at `/emails`
- ✅ Unsubscribe page at `/unsubscribe?token=xxx`
- ✅ Automatic unsubscribe token generation for all users
- ✅ Email preference management (marketing, product updates, security alerts)

**Developer Experience:**

- ✅ Type-safe email service interfaces
- ✅ Comprehensive preference checking before sending emails
- ✅ Enhanced Stripe webhook integration with proper user data
- ✅ Clerk webhook integration for welcome emails

**Security & Compliance:**

- ✅ Secure unsubscribe tokens
- ✅ Email preference enforcement
- ✅ Security alerts always enabled (cannot be disabled)
- ✅ Personalized unsubscribe links in all emails

## Current State

The codebase already has a basic email service implementation:

- **Service Pattern**: Interface-based abstraction with ResendEmailService and MockEmailService
- **Current Templates**: Inline HTML for password reset, email verification, and welcome emails
- **Factory Pattern**: Service instantiation based on environment (mock for tests, Resend for production)

This guide shows how to enhance the existing implementation with React Email templates and additional email types.

## High-Level Features

### Core Email Types (Essential Only)

1. **Authentication Emails** (Existing)
   - Password reset ✓
   - Email verification ✓

2. **Account Management**
   - Welcome email (post-signup) ✓

3. **Marketing Emails** (New)
   - Generic marketing email (opt-in/out support)
   - Email preferences management
   - Unsubscribe functionality

4. **Billing Integration** (New - Stripe webhooks)
   - Payment successful
   - Payment failed
   - Subscription status change (upgraded/downgraded/cancelled)

### Technical Architecture

```
lib/
├── email/
│   ├── types.ts               # EmailService interface & types (existing)
│   ├── service.ts             # Factory function (existing)
│   ├── resend.ts              # ResendEmailService implementation (existing)
│   ├── mock.ts                # MockEmailService for tests (existing)
│   └── templates/             # NEW: React Email template functions
│       ├── index.ts           # Template registry
│       └── render.ts          # Template rendering utilities
│
emails/                        # NEW: React Email templates directory
├── auth/
│   ├── password-reset.tsx
│   └── verify-email.tsx
├── account/
│   └── welcome.tsx
├── billing/
│   ├── payment-success.tsx
│   ├── payment-failed.tsx
│   └── subscription-change.tsx
├── marketing/
│   └── newsletter.tsx
└── components/               # Shared email components
    ├── header.tsx
    ├── footer.tsx
    ├── button.tsx
    └── layout.tsx

app/
├── api/
│   ├── auth/
│   │   ├── send-password-reset/route.ts  # Existing
│   │   └── send-verification/route.ts     # Existing
│   ├── marketing/
│   │   ├── subscribe/route.ts             # New endpoint
│   │   └── unsubscribe/route.ts           # New endpoint
│   └── webhooks/
│       └── stripe/route.ts                # Enhanced with email triggers

tests/
├── lib/
│   └── email/
│       ├── resend.test.ts                 # Unit tests (adjacent pattern)
│       └── mock.test.ts
├── integration/
│   └── email/
│       ├── auth-emails.test.ts
│       └── billing-emails.test.ts
└── e2e/
    └── email-flows.test.ts
```

### Key Design Decisions

1. **Minimal Marketing**: Only essential transactional emails + basic newsletter with preferences
2. **React Email for Templates**: Type-safe, component-based email templates as enhancement
3. **Service Abstraction**: Keep existing EmailService interface, extend with new methods
4. **Progressive Enhancement**: Start with inline HTML, migrate to React Email templates
5. **Environment-based Configuration**: Mock service for tests, Resend for production
6. **Error Handling**: Graceful failures with EmailResult pattern
7. **No Email Storage**: Emails are sent and forgotten (GDPR friendly)
8. **User Preferences**: Store email preferences in users table

## Implementation Details

### Environment Variables

```env
# Existing
RESEND_API_KEY="re_..."                    # Your Resend API key
RESEND_FROM_EMAIL="noreply@yourdomain.com" # Already in .env.example

# New additions needed
RESEND_FROM_NAME="Your SaaS Name"          # Display name for emails
EMAIL_DEV_MODE="true"                      # Log emails in development
RESEND_REPLY_TO="support@yourdomain.com"   # Optional reply-to address
```

### Extended Email Service Interface (`lib/email/types.ts`)

```typescript
// Existing interfaces
export interface EmailResult {
  success: boolean;
  error?: string;
}

export interface PasswordResetEmailData {
  resetToken: string;
  resetUrl: string;
  user: {
    email: string;
    name?: string | null;
  };
}

// ... existing interfaces ...

// NEW interfaces to add
export interface PaymentEmailData {
  user: {
    email: string;
    name?: string | null;
  };
  amount: number;
  currency: string;
  invoiceUrl?: string;
  billingDetails?: {
    last4?: string;
    brand?: string;
  };
}

export interface SubscriptionChangeEmailData {
  user: {
    email: string;
    name?: string | null;
  };
  previousPlan: string;
  newPlan: string;
  effectiveDate: Date;
}

export interface MarketingEmailData {
  subject: string;
  content: string;
  ctaText?: string;
  ctaUrl?: string;
}

// Extended EmailService interface
export interface EmailService {
  // Existing methods
  sendPasswordResetEmail(
    email: string,
    data: PasswordResetEmailData,
  ): Promise<EmailResult>;
  sendVerificationEmail(
    email: string,
    data: EmailVerificationData,
  ): Promise<EmailResult>;
  sendWelcomeEmail(email: string, data: WelcomeEmailData): Promise<EmailResult>;

  // NEW methods to add
  sendPaymentSuccessEmail(
    email: string,
    data: PaymentEmailData,
  ): Promise<EmailResult>;
  sendPaymentFailedEmail(
    email: string,
    data: PaymentEmailData,
  ): Promise<EmailResult>;
  sendSubscriptionChangeEmail(
    email: string,
    data: SubscriptionChangeEmailData,
  ): Promise<EmailResult>;
  sendMarketingEmail(
    emails: string[],
    data: MarketingEmailData,
  ): Promise<EmailResult>;
}
```

### React Email Template Structure

Example of converting existing inline HTML to React Email component:

```typescript
// emails/auth/password-reset.tsx
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

interface PasswordResetEmailProps {
  resetUrl: string;
  userName?: string | null;
}

export function PasswordResetEmail({
  resetUrl,
  userName
}: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Header />
          <Section style={content}>
            <Text style={heading}>Reset Your Password</Text>
            <Text style={paragraph}>
              Hello {userName || 'there'},
            </Text>
            <Text style={paragraph}>
              You requested to reset your password. Click the link below to set a new password:
            </Text>
            <Button href={resetUrl} style={button}>
              Reset Password
            </Button>
            <Text style={footnote}>
              If you didn't request this, you can safely ignore this email.
            </Text>
            <Text style={footnote}>
              This link will expire in 1 hour.
            </Text>
          </Section>
          <Footer />
        </Container>
      </Body>
    </Html>
  );
}

// Consistent styles across all templates
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const content = {
  padding: '0 20px',
};

const heading = {
  fontSize: '24px',
  fontWeight: '600',
  color: '#333',
  marginBottom: '20px',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#666',
  marginBottom: '20px',
};

const button = {
  backgroundColor: '#dc3545',
  borderRadius: '4px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 24px',
  margin: '16px 0',
};

const footnote = {
  fontSize: '14px',
  color: '#666',
  marginTop: '20px',
};
```

### Shared Email Components

```typescript
// emails/components/header.tsx
import { Img, Section } from '@react-email/components';

export function Header() {
  return (
    <Section style={headerStyle}>
      <Img
        src={`${process.env.NEXT_PUBLIC_APP_URL}/logo.png`}
        width="150"
        height="50"
        alt="Your SaaS"
      />
    </Section>
  );
}

const headerStyle = {
  padding: '20px 0',
  borderBottom: '1px solid #e6e6e6',
  marginBottom: '20px',
};

// emails/components/footer.tsx
import { Link, Section, Text } from '@react-email/components';

export function Footer() {
  return (
    <Section style={footerStyle}>
      <Text style={footerText}>
        © {new Date().getFullYear()} Your SaaS. All rights reserved.
      </Text>
      <Text style={footerLinks}>
        <Link href={`${process.env.NEXT_PUBLIC_APP_URL}/privacy`} style={link}>
          Privacy Policy
        </Link>
        {' • '}
        <Link href={`${process.env.NEXT_PUBLIC_APP_URL}/terms`} style={link}>
          Terms of Service
        </Link>
      </Text>
    </Section>
  );
}

const footerStyle = {
  borderTop: '1px solid #e6e6e6',
  marginTop: '32px',
  paddingTop: '20px',
  textAlign: 'center' as const,
};

const footerText = {
  fontSize: '14px',
  color: '#999',
  margin: '0 0 10px 0',
};

const footerLinks = {
  fontSize: '14px',
  color: '#999',
};

const link = {
  color: '#999',
  textDecoration: 'underline',
};
```

### Integration with Existing Service Pattern

```typescript
// lib/email/resend.ts - Enhanced ResendEmailService with React Email
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { PasswordResetEmail } from '@/emails/auth/password-reset';
import {
  type EmailService,
  type EmailResult,
  type PasswordResetEmailData,
  // ... other imports
} from './types';

export class ResendEmailService implements EmailService {
  private resend: Resend;
  private from: string;
  private baseUrl: string;
  private fromName: string;

  constructor(apiKey: string, from: string, baseUrl: string) {
    this.resend = new Resend(apiKey);
    this.from = from;
    this.baseUrl = baseUrl;
    this.fromName = process.env.RESEND_FROM_NAME || 'Your SaaS';
  }

  async sendPasswordResetEmail(
    email: string,
    data: PasswordResetEmailData,
  ): Promise<EmailResult> {
    try {
      // Option 1: Use React Email template (NEW)
      if (process.env.USE_REACT_EMAIL === 'true') {
        const html = await render(
          PasswordResetEmail({
            resetUrl: data.resetUrl,
            userName: data.user.name,
          }),
        );

        await this.resend.emails.send({
          from: `${this.fromName} <${this.from}>`,
          to: email,
          subject: 'Reset your password',
          html,
        });
      } else {
        // Option 2: Keep existing inline HTML (current implementation)
        await this.resend.emails.send({
          from: this.from,
          to: email,
          subject: 'Reset your password',
          html: `<div style="font-family: Arial, sans-serif;">...</div>`,
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      return {
        success: false,
        error: 'Failed to send password reset email',
      };
    }
  }

  // New method for payment success email
  async sendPaymentSuccessEmail(
    email: string,
    data: PaymentEmailData,
  ): Promise<EmailResult> {
    try {
      const html = await render(
        PaymentSuccessEmail({
          userName: data.user.name,
          amount: data.amount,
          currency: data.currency,
          invoiceUrl: data.invoiceUrl,
        }),
      );

      await this.resend.emails.send({
        from: `${this.fromName} <${this.from}>`,
        to: email,
        subject: 'Payment Successful',
        html,
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to send payment success email:', error);
      return {
        success: false,
        error: 'Failed to send payment success email',
      };
    }
  }

  // ... other new methods
}
```

### Stripe Webhook Integration

```typescript
// app/api/webhooks/stripe/route.ts - Enhanced with email triggers
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { billingService } from '@/lib/billing/service';
import { emailService } from '@/lib/email/service';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  // ... existing webhook verification code ...

  // Handle only the critical events
  switch (event.type) {
    case 'checkout.completed':
      if (data.mode === 'subscription') {
        // ... existing subscription logic ...

        // Send subscription confirmation email
        const user = await db.query.users.findFirst({
          where: eq(users.billingCustomerId, data.customer),
        });

        if (user) {
          await emailService.sendSubscriptionChangeEmail(user.email, {
            user: { email: user.email, name: user.name },
            previousPlan: 'Free',
            newPlan: 'Pro', // Get from price metadata
            effectiveDate: new Date(),
          });
        }
      } else if (data.mode === 'payment') {
        // ... existing payment logic ...

        // Send payment success email
        await emailService.sendPaymentSuccessEmail(data.receipt_email, {
          user: { email: data.receipt_email },
          amount: data.amount_total,
          currency: data.currency,
          invoiceUrl: data.invoice_url,
        });
      }
      break;

    case 'payment_intent.failed':
      // Send payment failed email
      await emailService.sendPaymentFailedEmail(data.receipt_email, {
        user: { email: data.receipt_email },
        amount: data.amount,
        currency: data.currency,
      });
      break;

    // ... other cases
  }

  return NextResponse.json({ received: true });
}
```

## Testing Strategy

### Unit Tests

**What to test:**

- Email service methods return correct EmailResult
- Mock service handles all methods properly
- React Email templates render correctly
- User input is properly escaped

**Test Structure (following your adjacent pattern):**

```typescript
// tests/lib/email/resend.test.ts
import { ResendEmailService } from '@/lib/email/resend';
import { Resend } from 'resend';

jest.mock('resend');

describe('ResendEmailService', () => {
  let service: ResendEmailService;
  let mockResend: jest.Mocked<Resend>;

  beforeEach(() => {
    mockResend = {
      emails: {
        send: jest.fn().mockResolvedValue({ id: 'test-email-id' }),
      },
    } as any;
    (Resend as jest.Mock).mockImplementation(() => mockResend);

    service = new ResendEmailService(
      'test-api-key',
      'test@example.com',
      'http://localhost:3000',
    );
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email successfully', async () => {
      const result = await service.sendPasswordResetEmail('user@example.com', {
        resetToken: 'test-token',
        resetUrl: 'http://localhost:3000/reset?token=test-token',
        user: { email: 'user@example.com', name: 'Test User' },
      });

      expect(result.success).toBe(true);
      expect(mockResend.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Reset your password',
        }),
      );
    });

    it('should handle send failures gracefully', async () => {
      mockResend.emails.send.mockRejectedValueOnce(new Error('API Error'));

      const result = await service.sendPasswordResetEmail('user@example.com', {
        resetToken: 'test-token',
        resetUrl: 'http://localhost:3000/reset',
        user: { email: 'user@example.com' },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to send password reset email');
    });
  });

  // Test new methods
  describe('sendPaymentSuccessEmail', () => {
    it('should send payment success email with invoice URL', async () => {
      const result = await service.sendPaymentSuccessEmail('user@example.com', {
        user: { email: 'user@example.com', name: 'Test User' },
        amount: 2000,
        currency: 'usd',
        invoiceUrl: 'https://invoice.stripe.com/i/test',
      });

      expect(result.success).toBe(true);
      expect(mockResend.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Payment Successful',
        }),
      );
    });
  });
});

// tests/lib/email/mock.test.ts
import { MockEmailService } from '@/lib/email/mock';

describe('MockEmailService', () => {
  let service: MockEmailService;

  beforeEach(() => {
    service = new MockEmailService();
  });

  it('should always return success for all email methods', async () => {
    const result = await service.sendPasswordResetEmail('test@example.com', {
      resetToken: 'token',
      resetUrl: 'url',
      user: { email: 'test@example.com' },
    });

    expect(result.success).toBe(true);
  });
});
```

**React Email Template Tests:**

```typescript
// tests/emails/auth/password-reset.test.tsx
import { render } from '@react-email/render';
import { PasswordResetEmail } from '@/emails/auth/password-reset';

describe('PasswordResetEmail', () => {
  it('renders with required props', async () => {
    const html = await render(
      PasswordResetEmail({
        resetUrl: 'https://example.com/reset?token=123',
        userName: 'John Doe',
      }),
    );

    expect(html).toContain('Reset Your Password');
    expect(html).toContain('Hello John Doe');
    expect(html).toContain('https://example.com/reset?token=123');
  });

  it('handles missing userName gracefully', async () => {
    const html = await render(
      PasswordResetEmail({
        resetUrl: 'https://example.com/reset',
        userName: null,
      }),
    );

    expect(html).toContain('Hello there');
  });

  it('escapes user input properly', async () => {
    const html = await render(
      PasswordResetEmail({
        resetUrl: 'https://example.com',
        userName: '<script>alert("xss")</script>',
      }),
    );

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
```

### Integration Tests

**What to test:**

- Auth endpoints use email service correctly
- Stripe webhooks trigger appropriate emails
- Email preferences are respected
- Rate limiting on email endpoints

**Test Structure:**

```typescript
// tests/integration/email/auth-emails.test.ts
import { POST as sendPasswordReset } from '@/app/api/auth/send-password-reset/route';
import { emailService } from '@/lib/email/service';
import { testDb, authTestHelpers } from '@/lib/db/test-helpers';

jest.mock('@/lib/email/service');

describe('Auth Email Integration', () => {
  beforeEach(async () => {
    await testDb.setup();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  describe('POST /api/auth/send-password-reset', () => {
    it('sends password reset email for valid user', async () => {
      // Create test user
      const user = await authTestHelpers.createTestUser({
        email: 'test@example.com',
        name: 'Test User',
      });

      const mockSendEmail = jest.fn().mockResolvedValue({ success: true });
      (emailService.sendPasswordResetEmail as jest.Mock) = mockSendEmail;

      const request = new Request(
        'http://localhost/api/auth/send-password-reset',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test@example.com' }),
        },
      );

      const response = await sendPasswordReset(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockSendEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          user: { email: 'test@example.com', name: 'Test User' },
          resetUrl: expect.stringContaining('/reset-password'),
        }),
      );
    });

    it('handles non-existent user gracefully', async () => {
      const request = new Request(
        'http://localhost/api/auth/send-password-reset',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'nonexistent@example.com' }),
        },
      );

      const response = await sendPasswordReset(request);
      const data = await response.json();

      // Should still return success to prevent email enumeration
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });
});

// tests/integration/email/billing-emails.test.ts
import { POST as stripeWebhook } from '@/app/api/webhooks/stripe/route';
import { emailService } from '@/lib/email/service';

describe('Billing Email Integration', () => {
  it('sends payment success email on successful payment', async () => {
    const mockSendEmail = jest.fn().mockResolvedValue({ success: true });
    (emailService.sendPaymentSuccessEmail as jest.Mock) = mockSendEmail;

    const webhookPayload = {
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test',
          amount: 2000,
          currency: 'usd',
          receipt_email: 'customer@example.com',
          customer: 'cus_test',
        },
      },
    };

    const request = new Request('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'stripe-signature': 'test-signature',
      },
      body: JSON.stringify(webhookPayload),
    });

    const response = await stripeWebhook(request);

    expect(response.status).toBe(200);
    expect(mockSendEmail).toHaveBeenCalledWith(
      'customer@example.com',
      expect.objectContaining({
        amount: 2000,
        currency: 'usd',
      }),
    );
  });
});

// tests/integration/email/marketing-emails.test.ts
describe('Marketing Email Preferences', () => {
  it('respects user email preferences', async () => {
    // Create users with different preferences
    const subscribedUser = await authTestHelpers.createTestUser({
      email: 'subscribed@example.com',
      emailPreferences: { marketing: true },
    });

    const unsubscribedUser = await authTestHelpers.createTestUser({
      email: 'unsubscribed@example.com',
      emailPreferences: { marketing: false },
    });

    const mockSendEmail = jest.fn().mockResolvedValue({ success: true });
    (emailService.sendMarketingEmail as jest.Mock) = mockSendEmail;

    // Send marketing email to all users
    await sendMarketingEmailToUsers({
      subject: 'New Feature Announcement',
      content: 'Check out our new features!',
    });

    // Should only send to subscribed user
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledWith(
      ['subscribed@example.com'],
      expect.any(Object),
    );
  });
});
```

### E2E Tests

**What to test:**

- Complete user flows that trigger emails
- Email links work correctly
- Unsubscribe functionality

**Test Structure:**

```typescript
// tests/e2e/email-flows.test.ts
import { test, expect } from '@playwright/test';

test.describe('Email Flows', () => {
  test('password reset flow', async ({ page }) => {
    // 1. Create test user
    await page.goto('/auth');
    await page.click('text=Sign up');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Test123456!');
    await page.click('button[type="submit"]');

    // 2. Request password reset
    await page.goto('/auth');
    await page.click('text=Forgot password?');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Check your email')).toBeVisible();

    // 3. In real E2E, you would:
    // - Use a test email service (Mailosaur, Mailtrap)
    // - Or use Resend's test mode with webhook
    // - Extract the reset link and visit it

    // For now, simulate visiting the reset link directly
    // In real implementation, extract from email
    const resetToken = 'test-token'; // Would be extracted from email
    await page.goto(`/reset-password?token=${resetToken}`);

    // 4. Complete password reset
    await page.fill('input[name="password"]', 'NewPassword123!');
    await page.fill('input[name="confirmPassword"]', 'NewPassword123!');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Password reset successful')).toBeVisible();

    // 5. Login with new password
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'NewPassword123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
  });

  test('email verification flow', async ({ page }) => {
    // 1. Sign up new user
    await page.goto('/auth');
    await page.click('text=Sign up');
    await page.fill('input[name="email"]', 'newuser@example.com');
    await page.fill('input[name="password"]', 'Test123456!');
    await page.click('button[type="submit"]');

    // Should see verification notice
    await expect(page.locator('text=Please verify your email')).toBeVisible();

    // 2. Simulate clicking verification link
    const verificationToken = 'test-verification-token';
    await page.goto(`/verify-email?token=${verificationToken}`);

    await expect(
      page.locator('text=Email verified successfully'),
    ).toBeVisible();
  });

  test('unsubscribe from marketing emails', async ({ page }) => {
    // 1. Visit unsubscribe link (would be in email footer)
    const unsubscribeToken = 'test-unsubscribe-token';
    await page.goto(`/unsubscribe?token=${unsubscribeToken}`);

    // 2. Confirm unsubscribe
    await page.click('text=Unsubscribe from marketing emails');

    await expect(page.locator('text=Successfully unsubscribed')).toBeVisible();
  });
});
```

## Development Workflow

### Local Development Setup

```bash
# Install React Email dependencies
npm install @react-email/components @react-email/render

# Add to .env.local
RESEND_FROM_NAME="Your SaaS Dev"
EMAIL_DEV_MODE="true"  # Log emails in development
USE_REACT_EMAIL="true" # Enable React Email templates

# Run email preview server (add to package.json first)
npm run email:dev

# Run application
npm run dev
```

### Email Preview Script (package.json)

```json
{
  "scripts": {
    "email:dev": "email dev --dir emails --port 3001",
    "email:build": "email build --dir emails --out .react-email",
    "email:export": "email export --dir emails --out dist/emails"
  }
}
```

### Testing Email Delivery Locally

1. **Mock Service (Default in Tests)**
   - Uses MockEmailService automatically
   - Always returns success
   - No actual emails sent

2. **Console Logging (Development)**
   - Set `EMAIL_DEV_MODE=true`
   - Emails logged to console
   - See full email content and metadata

3. **Real Emails (Staging/Production)**
   - Configure real Resend API key
   - Use test email addresses
   - Check Resend dashboard for delivery status

### Database Schema Updates

Add email preferences to users table:

```typescript
// lib/db/schema.ts - Add to users table
export const users = pgTable('users', {
  // ... existing fields ...

  // Email preferences
  emailPreferences: jsonb('email_preferences')
    .$type<{
      marketing: boolean;
      productUpdates: boolean;
      securityAlerts: boolean;
    }>()
    .default({
      marketing: true,
      productUpdates: true,
      securityAlerts: true,
    }),
  unsubscribeToken: text('unsubscribe_token').unique(),

  // ... rest of fields ...
});
```

## Production Considerations

### Security

- Validate email addresses using Zod before sending
- Rate limit email endpoints (use existing rate limiter)
- Sanitize user input in React Email templates (automatic)
- Use unsubscribe tokens instead of user IDs in links
- Don't log email content in production

### Performance

- Send Emails Asynchronously (Queue/Background Job)

### Monitoring

- Track email send/success failure passively via Email provider's dashboard and log failures only if they block key flows

### Compliance

- Include unsubscribe link in all marketing emails
- Store email preferences in user record
- Don't store email content (GDPR compliant)
- Add company details in email footer

## Migration Path

### From Current Implementation to React Email

1. **Phase 1: Add React Email alongside existing**
   - Install dependencies
   - Create first React Email template
   - Use `USE_REACT_EMAIL` env var to toggle

2. **Phase 2: Migrate templates one by one**
   - Start with simple emails (welcome, verification)
   - Test thoroughly with email preview
   - Keep inline HTML as fallback

3. **Phase 3: Add new email types**
   - Implement billing emails
   - Add marketing email support
   - Create unsubscribe flow

4. **Phase 4: Full migration**
   - Remove inline HTML templates
   - Update all tests
   - Remove `USE_REACT_EMAIL` flag

### When Forking for New Projects

1. **Update branding**:
   - Change `RESEND_FROM_NAME` in environment
   - Update logo in email header component
   - Modify color scheme in template styles

2. **Customize templates**:
   - Edit shared components (header/footer)
   - Adjust button styles globally
   - Update email preview config

3. **Configure services**:
   - Set up Resend account and API keys
   - Configure Stripe webhook endpoints
   - Set up email preferences schema

## Common Pitfalls to Avoid

1. **Don't add tracking pixels**: Privacy first
2. **Don't store email content**: Only store send status
3. **Don't skip mobile testing**: Use email preview tool
4. **Don't use external CSS**: Keep styles inline
5. **Don't forget unsubscribe**: Required by law
6. **Don't send without user consent**: Check preferences

## Implementation Checklist

- [x] Install React Email dependencies ✅ (Already installed)
- [x] Create email template directory structure ✅ (Already exists in /emails/)
- [x] Extend EmailService interface with new methods ✅ (Added all new email types)
- [x] Implement new email types in ResendEmailService ✅ (All methods implemented with React Email)
- [x] Update MockEmailService with new methods ✅ (All new methods added)
- [x] Create React Email templates ✅ (All templates created including subscription-change)
- [x] Add email preference fields to user schema ✅ (Already in schema with default preferences)
- [x] Create unsubscribe endpoint and UI ✅ (Both API endpoints and user-friendly page)
- [x] Integrate emails with Stripe webhooks ✅ (Enhanced with better user data and email notifications)
- [x] Add welcome emails on user signup ✅ (Clerk webhook now sends welcome emails)
- [x] Generate unsubscribe tokens for users ✅ (Auto-generated for new users, backfilled for existing)
- [x] Create email management dashboard ✅ (Full dashboard at /emails with preference management and test email)
- [x] Add email preference enforcement ✅ (Helper functions to check preferences before sending)
- [x] Create password reset notification email ✅ (Template and service method for post-reset notifications)
- [ ] Write unit tests for new email methods
- [ ] Write integration tests for email flows
- [ ] Update E2E tests for email scenarios
- [ ] Add email preview npm scripts
- [ ] Document email types in CLAUDE.md

## Resources

- [React Email Documentation](https://react.email/docs)
- [React Email Examples](https://demo.react.email)
- [Resend API Reference](https://resend.com/docs/api-reference)
- [Email Client CSS Support](https://www.caniemail.com/)
- [Can I Email](https://www.caniemail.com/) - Email client feature support
