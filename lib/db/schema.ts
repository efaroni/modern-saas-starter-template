import {
  pgTable,
  text,
  timestamp,
  jsonb,
  uuid,
  unique,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

// Users table - stores user data synced from Clerk
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkId: text('clerk_id').notNull().unique(),
  email: text('email').notNull().unique(),
  name: text('name'), // Concatenated from Clerk's first_name + last_name
  imageUrl: text('image_url'), // User's profile image from Clerk
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),

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

  // Billing fields (temporarily commented out until migration is ready)
  // billingCustomerId: text('billing_customer_id').unique(),
  // subscriptionId: text('subscription_id'),
  // subscriptionStatus: text('subscription_status'), // 'active', 'trialing', 'past_due', 'canceled', etc.
  // subscriptionCurrentPeriodEnd: timestamp('subscription_current_period_end', {
  //   mode: 'date',
  // }),
});

// User API Keys table for storing encrypted API keys
export const userApiKeys = pgTable(
  'user_api_keys',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    provider: text('provider').notNull(), // 'openai', 'stripe', 'resend', 'github', 'google'
    publicKey: text('public_key'), // Optional for services that need it (Stripe)
    privateKeyEncrypted: text('private_key_encrypted').notNull(), // Always encrypted
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    uniqueUserProvider: unique().on(table.userId, table.provider),
  }),
);

// New table for one-time purchases (temporarily commented out until migration is ready)
// export const purchases = pgTable('purchases', {
//   id: uuid('id').defaultRandom().primaryKey(),
//   userId: text('user_id')
//     .references(() => users.id, { onDelete: 'cascade' })
//     .notNull(),
//   billingSessionId: text('billing_session_id').unique(),
//   amount: integer('amount').notNull(), // in cents
//   currency: text('currency').default('USD').notNull(),
//   status: text('status').notNull(), // 'pending', 'completed', 'failed'
//   purchaseType: text('purchase_type'), // 'credits', 'feature', etc.
//   metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
//   createdAt: timestamp('created_at').defaultNow().notNull(),
// });

// Track webhook events for idempotency
export const webhookEvents = pgTable('webhook_events', {
  id: text('id').primaryKey(), // Provider event ID (svix-id for Clerk)
  provider: text('provider').default('clerk').notNull(),
  eventType: text('event_type').notNull(), // user.created, user.deleted, etc.
  processedAt: timestamp('processed_at').defaultNow().notNull(),
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertUserApiKeySchema = createInsertSchema(userApiKeys);
export const selectUserApiKeySchema = createSelectSchema(userApiKeys);
// export const insertPurchaseSchema = createInsertSchema(purchases);
// export const selectPurchaseSchema = createSelectSchema(purchases);
export const insertWebhookEventSchema = createInsertSchema(webhookEvents);
export const selectWebhookEventSchema = createSelectSchema(webhookEvents);

// Export types using the table structure
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type InsertUserApiKey = typeof userApiKeys.$inferInsert;
export type SelectUserApiKey = typeof userApiKeys.$inferSelect;
// export type Purchase = typeof purchases.$inferSelect;
// export type NewPurchase = typeof purchases.$inferInsert;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;
