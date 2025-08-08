-- Update users table to match current schema definition
-- Add missing fields required by Clerk integration

-- Add clerk_id column (required for Clerk integration)
ALTER TABLE "users" ADD COLUMN "clerk_id" text;

-- Add name column (stores combined first_name + last_name from Clerk)
ALTER TABLE "users" ADD COLUMN "name" text;

-- Add image_url column (stores user profile image from Clerk)
ALTER TABLE "users" ADD COLUMN "image_url" text;

-- Add unique constraint on clerk_id
ALTER TABLE "users" ADD CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id");

-- Note: We're keeping the existing 'id' as text for now to avoid breaking foreign keys
-- The user_api_keys table already references users(id), so changing this would require
-- a more complex migration. The current schema allows text IDs even though it specifies uuid.