# Clerk Webhook Setup Guide

This guide explains how to properly configure Clerk webhooks to sync user data with your database.

## Overview

The application uses Clerk webhooks to automatically sync user data between Clerk and your local database. When users are created, updated, or deleted in Clerk, the webhook handler at `/api/webhooks/clerk` processes these events and updates your users table accordingly.

## Webhook Handler Features

- **Comprehensive logging** - All webhook events are logged for debugging
- **Duplicate prevention** - Uses `webhook_events` table to prevent processing the same event twice
- **Error handling** - Proper error responses and database rollback on failures
- **Health check** - Available at `/api/webhooks/clerk/health` for testing connectivity

## Setup Instructions

### 1. Configure Environment Variables

Add the webhook secret to your `.env.local` file:

```bash
CLERK_WEBHOOK_SECRET="whsec_your_webhook_secret_here"
```

### 2. Database Migration

Ensure the `webhook_events` table exists by running migrations:

```bash
npm run db:migrate
```

If you need to create a new migration for the webhook_events table:

```bash
npm run db:migrate:create add_webhook_events_table
```

### 3. Clerk Dashboard Configuration

1. Go to your [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **Webhooks** in the left sidebar
3. Click **Add Endpoint**
4. Configure the webhook:

   **Endpoint URL:**
   - Development: `https://your-ngrok-url.ngrok.io/api/webhooks/clerk`
   - Production: `https://your-domain.com/api/webhooks/clerk`

   **Events to Subscribe:**
   - ✅ `user.created`
   - ✅ `user.updated`
   - ✅ `user.deleted`

   **HTTP Method:** POST

5. Copy the **Signing Secret** and add it to your `.env.local` as `CLERK_WEBHOOK_SECRET`

### 4. Testing the Webhook

#### Health Check

Test basic connectivity:

```bash
curl https://your-domain.com/api/webhooks/clerk/health
```

#### Test User Operations

1. Create a test user in Clerk Dashboard or through your app
2. Check your application logs for webhook events
3. Verify the user appears in your database
4. Delete the test user and verify it's removed from your database

## Expected Log Output

When working correctly, you should see logs like:

```
[Clerk Webhook] Received webhook request
[Clerk Webhook] Webhook headers received {"svix_id":true,"svix_timestamp":true,"svix_signature":true}
[Clerk Webhook] Payload parsed successfully {"eventType":"user.created"}
[Clerk Webhook] Webhook verification successful {"eventType":"user.created"}
[Clerk Webhook] Processing event {"eventType":"user.created","userId":"user_xxx","webhookId":"msg_xxx"}
[Clerk Webhook] Processing user.created {"userId":"user_xxx","emailCount":1,"primaryEmailId":"idn_xxx"}
[Clerk Webhook] User created successfully {"userId":"user_xxx","email":"user@example.com","dbResult":{"id":"user_xxx","email":"user@example.com"}}
[Clerk Webhook] Webhook processed successfully {"eventType":"user.created","webhookId":"msg_xxx"}
```

## Troubleshooting

### Issue: Users not syncing when deleted

**Possible Causes:**

1. Webhook not configured in Clerk Dashboard
2. Wrong webhook URL (check development vs production)
3. `user.deleted` event not selected in webhook configuration
4. Webhook secret mismatch

**Debugging Steps:**

1. Check webhook logs in your application
2. Verify webhook configuration in Clerk Dashboard
3. Test the health endpoint: `/api/webhooks/clerk/health`
4. Check the `webhook_events` table for recent events

### Issue: Duplicate processing

The webhook handler automatically prevents duplicate processing using the `svix-id` header. If you see "Webhook already processed, skipping" messages, this is normal behavior.

### Issue: Database connection errors

Check your database configuration and ensure migrations have been run:

```bash
npm run db:migrate
npm run db:studio  # Verify tables exist
```

## Database Schema

The webhook system uses two main tables:

### users

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,           -- Clerk user ID
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  -- ... other fields
);
```

### webhook_events

```sql
CREATE TABLE webhook_events (
  id TEXT PRIMARY KEY,           -- svix-id from webhook
  provider TEXT DEFAULT 'clerk',
  event_type TEXT NOT NULL,      -- user.created, user.deleted, etc.
  processed_at TIMESTAMP DEFAULT NOW()
);
```

## Security Considerations

- Webhook secret verification prevents unauthorized requests
- All webhook events are logged for audit purposes
- Database operations are wrapped in transactions
- Sensitive data is never logged (only metadata)

## Development vs Production

### Development (with ngrok)

```bash
# Install ngrok if not already installed
npm install -g ngrok

# Start your development server
npm run dev

# In another terminal, expose your local server
ngrok http 3000

# Use the ngrok URL in Clerk Dashboard
# Example: https://abc123.ngrok.io/api/webhooks/clerk
```

### Production

Use your actual domain URL:

```
https://your-production-domain.com/api/webhooks/clerk
```

## Monitoring

Monitor webhook health using:

- Application logs (look for `[Clerk Webhook]` entries)
- Health check endpoint: `/api/webhooks/clerk/health`
- Database queries on `webhook_events` table
- Clerk Dashboard webhook logs
