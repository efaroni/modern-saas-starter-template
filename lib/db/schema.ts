import {
  pgTable,
  text,
  timestamp,
  jsonb,
  uuid,
  unique,
  integer,
  primaryKey,
  boolean,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import type { AdapterAccountType } from 'next-auth/adapters';

// Users table - expanded for Auth.js
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  name: text('name'),
  password: text('password'), // Hashed password for email/password auth
  image: text('image'), // Avatar URL
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

// OAuth accounts table
export const accounts = pgTable(
  'accounts',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccountType>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  account => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  }),
);

// Sessions table
export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

// Email verification tokens
export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  verificationToken => ({
    compositePk: primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  }),
);

// Password reset tokens table for secure password reset functionality
export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  token: text('token').notNull().unique(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  used: boolean('used').default(false).notNull(),
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
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

// Password history table to prevent password reuse
export const passwordHistory = pgTable('password_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Authentication attempts table for rate limiting and security monitoring
export const authAttempts = pgTable('auth_attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  identifier: text('identifier').notNull(), // email or IP address
  type: text('type').notNull(), // 'login', 'signup', 'password_reset'
  success: boolean('success').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Enhanced sessions table for session management
export const userSessions = pgTable('user_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  sessionToken: text('session_token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  isActive: boolean('is_active').default(true).notNull(),
  lastActivity: timestamp('last_activity').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Session activity log for security monitoring
export const sessionActivity = pgTable('session_activity', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id')
    .references(() => userSessions.id, { onDelete: 'cascade' })
    .notNull(),
  action: text('action').notNull(), // 'login', 'activity', 'logout', 'timeout', 'suspicious'
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// New table for one-time purchases (temporarily commented out until migration is ready)
// export const purchases = pgTable('purchases', {
//   id: uuid('id').defaultRandom().primaryKey(),
//   userId: uuid('user_id')
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

// // Track webhook events for idempotency
// export const webhookEvents = pgTable('webhook_events', {
//   id: text('id').primaryKey(), // Provider event ID
//   provider: text('provider').default('stripe').notNull(),
//   processedAt: timestamp('processed_at').defaultNow().notNull(),
// });

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertAccountSchema = createInsertSchema(accounts);
export const selectAccountSchema = createSelectSchema(accounts);
export const insertSessionSchema = createInsertSchema(sessions);
export const selectSessionSchema = createSelectSchema(sessions);
export const insertVerificationTokenSchema =
  createInsertSchema(verificationTokens);
export const selectVerificationTokenSchema =
  createSelectSchema(verificationTokens);
export const insertPasswordResetTokenSchema =
  createInsertSchema(passwordResetTokens);
export const selectPasswordResetTokenSchema =
  createSelectSchema(passwordResetTokens);
export const insertUserApiKeySchema = createInsertSchema(userApiKeys);
export const selectUserApiKeySchema = createSelectSchema(userApiKeys);
export const insertPasswordHistorySchema = createInsertSchema(passwordHistory);
export const selectPasswordHistorySchema = createSelectSchema(passwordHistory);
export const insertAuthAttemptSchema = createInsertSchema(authAttempts);
export const selectAuthAttemptSchema = createSelectSchema(authAttempts);
export const insertUserSessionSchema = createInsertSchema(userSessions);
export const selectUserSessionSchema = createSelectSchema(userSessions);
export const insertSessionActivitySchema = createInsertSchema(sessionActivity);
export const selectSessionActivitySchema = createSelectSchema(sessionActivity);
// export const insertPurchaseSchema = createInsertSchema(purchases);
// export const selectPurchaseSchema = createSelectSchema(purchases);
// export const insertWebhookEventSchema = createInsertSchema(webhookEvents);
// export const selectWebhookEventSchema = createSelectSchema(webhookEvents);

// Export types using the table structure
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type VerificationToken = typeof verificationTokens.$inferSelect;
export type NewVerificationToken = typeof verificationTokens.$inferInsert;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert;
export type InsertUserApiKey = typeof userApiKeys.$inferInsert;
export type SelectUserApiKey = typeof userApiKeys.$inferSelect;
export type PasswordHistory = typeof passwordHistory.$inferSelect;
export type NewPasswordHistory = typeof passwordHistory.$inferInsert;
export type AuthAttempt = typeof authAttempts.$inferSelect;
export type NewAuthAttempt = typeof authAttempts.$inferInsert;
export type UserSession = typeof userSessions.$inferSelect;
export type NewUserSession = typeof userSessions.$inferInsert;
export type SessionActivity = typeof sessionActivity.$inferSelect;
export type NewSessionActivity = typeof sessionActivity.$inferInsert;
// export type Purchase = typeof purchases.$inferSelect;
// export type NewPurchase = typeof purchases.$inferInsert;
// export type WebhookEvent = typeof webhookEvents.$inferSelect;
// export type NewWebhookEvent = typeof webhookEvents.$inferInsert;
