-- Add new enum for key types
CREATE TYPE "key_type" AS ENUM('secret', 'public', 'webhook_secret');

-- Add new columns to api_keys table
ALTER TABLE "api_keys" 
ADD COLUMN "key_type" "key_type" DEFAULT 'secret' NOT NULL,
ADD COLUMN "is_owner_key" boolean DEFAULT false NOT NULL;

-- Drop the public_key column since we're using key_type now
ALTER TABLE "api_keys" DROP COLUMN IF EXISTS "public_key";