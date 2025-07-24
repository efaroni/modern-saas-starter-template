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
  stripeCustomerId: text('stripe_customer_id'), // Stripe customer ID for payments
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
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

// Subscription Plans table
export const plans = pgTable('plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  stripePriceId: text('stripe_price_id').notNull().unique(),
  features: jsonb('features').$type<Record<string, boolean>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// User Subscriptions table
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  stripeSubscriptionId: text('stripe_subscription_id').notNull().unique(),
  status: text('status').notNull(), // 'active', 'canceled', 'past_due', etc.
  currentPeriodEnd: timestamp('current_period_end', { mode: 'date' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Email logs table for tracking sent emails
export const emailLogs = pgTable('email_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  toEmail: text('to_email').notNull(),
  templateType: text('template_type').notNull(),
  status: text('status').notNull(), // 'sent', 'failed'
  sentAt: timestamp('sent_at').defaultNow().notNull(),
  resendId: text('resend_id'),
  eventId: text('event_id'), // For idempotency in webhook events
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
});

// Email preferences table for user email settings
export const emailPreferences = pgTable('email_preferences', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(), // One preference record per user
  marketingEmails: boolean('marketing_emails').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

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
export const insertPlanSchema = createInsertSchema(plans);
export const selectPlanSchema = createSelectSchema(plans);
export const insertSubscriptionSchema = createInsertSchema(subscriptions);
export const selectSubscriptionSchema = createSelectSchema(subscriptions);
export const insertEmailLogSchema = createInsertSchema(emailLogs);
export const selectEmailLogSchema = createSelectSchema(emailLogs);
export const insertEmailPreferencesSchema =
  createInsertSchema(emailPreferences);
export const selectEmailPreferencesSchema =
  createSelectSchema(emailPreferences);

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
export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type EmailLog = typeof emailLogs.$inferSelect;
export type NewEmailLog = typeof emailLogs.$inferInsert;
export type EmailPreferences = typeof emailPreferences.$inferSelect;
export type NewEmailPreferences = typeof emailPreferences.$inferInsert;
