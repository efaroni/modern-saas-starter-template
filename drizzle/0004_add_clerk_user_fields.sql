-- This migration updates the users table structure to support Clerk integration
-- while maintaining the existing UUID primary key

-- First, we need to recreate the users table with the correct structure
-- since the previous migration used clerk_id as the primary key

-- Drop existing foreign key constraints
ALTER TABLE user_api_keys DROP CONSTRAINT IF EXISTS user_api_keys_user_id_fkey;

-- Create a new users table with the correct structure
CREATE TABLE IF NOT EXISTS users_new (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  email_preferences JSONB DEFAULT '{"marketing": true, "productUpdates": true, "securityAlerts": true}'::jsonb,
  unsubscribe_token TEXT UNIQUE
);

-- Copy existing data if any (mapping text id to clerk_id)
INSERT INTO users_new (id, clerk_id, email, created_at, updated_at, email_preferences, unsubscribe_token)
SELECT 
  gen_random_uuid() as id,
  id as clerk_id,
  email,
  created_at,
  updated_at,
  email_preferences,
  unsubscribe_token
FROM users
ON CONFLICT DO NOTHING;

-- Drop the old users table
DROP TABLE IF EXISTS users CASCADE;

-- Rename the new table
ALTER TABLE users_new RENAME TO users;

-- Recreate user_api_keys table with UUID reference
CREATE TABLE IF NOT EXISTS user_api_keys_new (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  public_key TEXT,
  private_key_encrypted TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE(user_id, provider)
);

-- Copy existing API keys data if any
-- Note: This will only work if there's existing data and we can match by clerk_id
INSERT INTO user_api_keys_new (id, user_id, provider, public_key, private_key_encrypted, metadata, created_at, updated_at)
SELECT 
  k.id,
  u.id as user_id,
  k.provider,
  k.public_key,
  k.private_key_encrypted,
  k.metadata,
  k.created_at,
  k.updated_at
FROM user_api_keys k
JOIN users u ON u.clerk_id = k.user_id
ON CONFLICT DO NOTHING;

-- Drop old table and rename
DROP TABLE IF EXISTS user_api_keys CASCADE;
ALTER TABLE user_api_keys_new RENAME TO user_api_keys;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_provider ON user_api_keys(provider);

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_api_keys_updated_at BEFORE UPDATE ON user_api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();