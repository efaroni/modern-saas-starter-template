#!/usr/bin/env node

/**
 * Simple script to ensure test database has required tables
 */

const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { getDatabaseUrl } = require('../lib/db/config');

async function setupTestDatabase() {
  const client = postgres(getDatabaseUrl());

  try {
    console.log('Setting up test database tables...');

    // Create webhook_events table if it doesn't exist
    await client`
      CREATE TABLE IF NOT EXISTS webhook_events (
        id text PRIMARY KEY,
        provider text DEFAULT 'clerk' NOT NULL,
        event_type text NOT NULL,
        processed_at timestamp DEFAULT now() NOT NULL
      )
    `;

    console.log('✓ webhook_events table created/verified');

    // Verify users table exists
    await client`
      CREATE TABLE IF NOT EXISTS users (
        id text PRIMARY KEY,
        email text NOT NULL UNIQUE,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL,
        email_preferences jsonb DEFAULT '{"marketing": true, "productUpdates": true, "securityAlerts": true}'::jsonb,
        unsubscribe_token text UNIQUE
      )
    `;

    console.log('✓ users table created/verified');

    // Create user_api_keys table if it doesn't exist
    await client`
      CREATE TABLE IF NOT EXISTS user_api_keys (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider text NOT NULL,
        public_key text,
        private_key_encrypted text NOT NULL,
        metadata jsonb DEFAULT '{}'::jsonb,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL,
        UNIQUE(user_id, provider)
      )
    `;

    console.log('✓ user_api_keys table created/verified');

    console.log('Test database setup complete!');
  } catch (error) {
    console.error('Error setting up test database:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupTestDatabase();
