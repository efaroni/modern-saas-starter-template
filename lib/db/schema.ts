import {
  pgTable,
  text,
  timestamp,
  jsonb,
  uuid,
  unique,
  boolean,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

// Users table - stores user data synced from Clerk
export const users = pgTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()), // Generate UUID for new records
  clerkId: text('clerk_id').unique(), // Allow null for gradual migration
  email: text('email').notNull().unique(),
  name: text('name'), // Concatenated from Clerk's first_name + last_name
  imageUrl: text('image_url'), // User's profile image from Clerk
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),

  // Billing fields - only store customer ID, query Stripe for status
  billingCustomerId: text('billing_customer_id').unique(),
});

// User API Keys table for storing encrypted API keys
export const userApiKeys = pgTable(
  'user_api_keys',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    provider: text('provider').notNull(), // 'openai', 'resend'
    publicKey: text('public_key'), // Optional for services that need it
    privateKeyEncrypted: text('private_key_encrypted').notNull(), // Always encrypted
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    uniqueUserProvider: unique().on(table.userId, table.provider),
  }),
);

// Track webhook events for idempotency (supports both Clerk and Stripe)
export const webhookEvents = pgTable('webhook_events', {
  id: text('id').primaryKey(), // Provider event ID (svix-id for Clerk, event ID for Stripe)
  provider: text('provider').default('clerk').notNull(), // 'clerk' or 'stripe'
  eventType: text('event_type').notNull(), // user.created, checkout.session.completed, etc.
  processedAt: timestamp('processed_at').defaultNow().notNull(),
});

// Email unsubscribe tokens - one-time use tokens for secure unsubscribe
export const emailUnsubscribeTokens = pgTable('email_unsubscribe_tokens', {
  token: text('token').primaryKey(),
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  category: text('category'), // 'marketing', null = global
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// User email preferences - simple boolean flags
export const userEmailPreferences = pgTable('user_email_preferences', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  marketingEnabled: boolean('marketing_enabled').default(true).notNull(),
  // Transactional emails are always sent - no column needed
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertUserApiKeySchema = createInsertSchema(userApiKeys);
export const selectUserApiKeySchema = createSelectSchema(userApiKeys);
export const insertWebhookEventSchema = createInsertSchema(webhookEvents);
export const selectWebhookEventSchema = createSelectSchema(webhookEvents);
export const insertEmailUnsubscribeTokenSchema = createInsertSchema(
  emailUnsubscribeTokens,
);
export const selectEmailUnsubscribeTokenSchema = createSelectSchema(
  emailUnsubscribeTokens,
);
export const insertUserEmailPreferencesSchema =
  createInsertSchema(userEmailPreferences);
export const selectUserEmailPreferencesSchema =
  createSelectSchema(userEmailPreferences);

// Export types using the table structure
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type InsertUserApiKey = typeof userApiKeys.$inferInsert;
export type SelectUserApiKey = typeof userApiKeys.$inferSelect;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;
// Test table for migration pipeline validation
export const migrationPipelineTest = pgTable('migration_pipeline_test', {
  id: uuid('id').defaultRandom().primaryKey(),
  testName: text('test_name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type EmailUnsubscribeToken = typeof emailUnsubscribeTokens.$inferSelect;
export type NewEmailUnsubscribeToken =
  typeof emailUnsubscribeTokens.$inferInsert;
export type UserEmailPreferences = typeof userEmailPreferences.$inferSelect;
export type NewUserEmailPreferences = typeof userEmailPreferences.$inferInsert;
export type MigrationPipelineTest = typeof migrationPipelineTest.$inferSelect;
export type NewMigrationPipelineTest = typeof migrationPipelineTest.$inferInsert;
