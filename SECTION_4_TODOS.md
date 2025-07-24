# Section 4: Email System - Implementation Plan

## Overview

Implement a comprehensive email system with React Email templates, Resend integration, database logging, and user preferences management.

## Database Schema Changes

### 1. Create `email_logs` table

- Fields: `id`, `to_email`, `template_type`, `status`, `sent_at`, `resend_id`, `event_id` (for idempotency)
- Purpose: Track all sent emails with status and enable webhook idempotency

### 2. Create `email_preferences` table

- Fields: `user_id`, `marketing_emails` (boolean, default true)
- Purpose: Manage user email preferences for unsubscribe functionality

## Email Service Enhancement

### 1. Environment-based API Keys

- Update `createEmailService()` to check environment:
  - Development: Use `RESEND_API_KEY_DEV`
  - Production: Use `RESEND_API_KEY`
- Maintain mock service fallback when no API key is present

### 2. Extend Email Service Interface

- Add methods for new email types:
  - `sendSubscriptionConfirmationEmail()`
  - `sendSubscriptionEndingEmail()`
- Add email logging functionality to track all sends

### 3. Implement Idempotency

- Use `event_id` field in email_logs for webhook-triggered emails
- Check for existing email before sending to prevent duplicates

## React Email Templates

### 1. Install Dependencies

- `@react-email/components`
- `@react-email/render`

### 2. Create Basic Email Templates

Simple, clean templates without overkill:

- `emails/templates/welcome.tsx`
- `emails/templates/email-verification.tsx`
- `emails/templates/password-reset.tsx`
- `emails/templates/subscription-confirmation.tsx`
- `emails/templates/subscription-ending.tsx`

### 3. Basic Layout Component

- Simple header with logo placeholder
- Content area with consistent padding
- Basic footer with unsubscribe link
- Minimal styling, no complex components

## Email Routes Implementation

### 1. Create `/emails` Route

- Display list of available email templates
- Test send functionality (development only)
- Show email logs from database
- NO preview functionality as requested

### 2. API Routes

- `/api/emails/send` - Manual email sending (dev only)
- `/api/emails/preferences` - Get/update user email preferences
- `/api/emails/unsubscribe` - Handle unsubscribe links

## Integration Points

### 1. Auth Integration

- Send welcome email on signup (already exists)
- Send verification email (already exists)
- Send password reset email (already exists)

### 2. Payment Integration (Mock for now)

- Create mock payment event handler
- Send subscription confirmation on mock "checkout.completed"
- Send subscription ending on mock "subscription.deleted"
- Note: Real integration will come from Section 3

### 3. User Preferences

- Add unsubscribe link to all marketing emails
- Check preferences before sending marketing emails
- Always send transactional emails regardless of preferences

## Testing Strategy

### 1. Unit Tests

- Test email service with mock Resend client
- Test React Email template rendering
- Test email preference logic
- Test idempotency checks

### 2. Integration Tests

- Test full email flow from trigger to database log
- Test unsubscribe flow
- Test environment-based API key selection
- Test mock payment event email triggers

## Implementation Order

1. **Database Setup** (30 min)
   - Create migrations for email_logs and email_preferences tables
   - Update schema.ts with new tables

2. **Email Service Updates** (45 min)
   - Add environment-based API key support
   - Extend service interface with new email types
   - Add email logging functionality

3. **React Email Templates** (1 hour)
   - Install dependencies
   - Create basic layout component
   - Build 5 email templates with minimal styling

4. **Email Routes** (45 min)
   - Create /emails page for testing
   - Implement API routes for preferences
   - Add unsubscribe functionality

5. **Integration & Testing** (1 hour)
   - Connect email sending to database logging
   - Add mock payment event handlers
   - Write comprehensive tests

## Notes

- Keep React Email templates very simple and basic
- No email preview functionality needed
- Environment-based API keys are critical for dev/prod separation
- email_logs table is mandatory, not optional
- Unsubscribe functionality via email_preferences table
- Mock payment events until Section 3 provides real integration
