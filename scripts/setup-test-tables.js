#!/usr/bin/env node
// Simple script to create test database tables

const postgres = require('postgres');
require('dotenv').config({ path: '.env.test' });

// Create database URL from components
function getDatabaseUrl() {
  const host = process.env.TEST_DB_HOST || process.env.DB_HOST || 'localhost';
  const port = process.env.TEST_DB_PORT || process.env.DB_PORT || '5432';
  const user = process.env.TEST_DB_USER || process.env.DB_USER || 'postgres';
  const password =
    process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD || 'postgres';
  const database =
    process.env.TEST_DB_NAME || process.env.DB_NAME || 'saas_template_test';

  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
}

async function setupTables() {
  const client = postgres(getDatabaseUrl());

  try {
    console.log('Creating test database tables...');

    // Create users table
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
    console.log('✓ users table created');

    // Create webhook_events table
    await client`
      CREATE TABLE IF NOT EXISTS webhook_events (
        id text PRIMARY KEY,
        provider text DEFAULT 'clerk' NOT NULL,
        event_type text NOT NULL,
        processed_at timestamp DEFAULT now() NOT NULL
      )
    `;
    console.log('✓ webhook_events table created');

    // Create user_api_keys table
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
    console.log('✓ user_api_keys table created');

    console.log('All test tables created successfully!');
  } catch (error) {
    console.error('Error creating test tables:', error);
  } finally {
    await client.end();
  }
}

setupTables();
