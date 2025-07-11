import { pgTable, text, timestamp, jsonb, uuid, unique } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'

// Users table (will be expanded in Section 2)
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// User API Keys table for storing encrypted API keys
export const userApiKeys = pgTable('user_api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  provider: text('provider').notNull(), // 'openai', 'stripe', 'resend', 'github', 'google'
  publicKey: text('public_key'), // Optional for services that need it (Stripe)
  privateKeyEncrypted: text('private_key_encrypted').notNull(), // Always encrypted
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, table => ({
  uniqueUserProvider: unique().on(table.userId, table.provider)
}))

// Zod schemas for validation
export const insertUserApiKeySchema = createInsertSchema(userApiKeys)
export const selectUserApiKeySchema = createSelectSchema(userApiKeys)

// Export types using the table structure
export type InsertUserApiKey = typeof userApiKeys.$inferInsert
export type SelectUserApiKey = typeof userApiKeys.$inferSelect