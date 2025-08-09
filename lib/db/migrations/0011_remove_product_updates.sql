-- Migration: Remove product_updates_enabled column from user_email_preferences
-- Only marketing and transactional email categories are now supported

ALTER TABLE user_email_preferences DROP COLUMN IF EXISTS product_updates_enabled;