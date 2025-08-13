-- Cleanup migration to remove legacy tables that should not exist
-- This ensures test database matches current schema without old billing/subscription tables

-- Drop legacy billing and subscription tables if they exist
DROP TABLE IF EXISTS subscription_items CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS plans CASCADE;
DROP TABLE IF EXISTS plan_features CASCADE;
DROP TABLE IF EXISTS customer_subscriptions CASCADE;
DROP TABLE IF EXISTS billing_customers CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS payment_methods CASCADE;
DROP TABLE IF EXISTS charges CASCADE;

-- Drop any other legacy tables that might exist
DROP TABLE IF EXISTS api_keys CASCADE; -- Old API keys table (renamed to user_api_keys)
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS feature_flags CASCADE;

-- Drop legacy enum types if they exist
DROP TYPE IF EXISTS subscription_status CASCADE;
DROP TYPE IF EXISTS plan_interval CASCADE;
DROP TYPE IF EXISTS invoice_status CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;

-- Add comment for documentation
COMMENT ON SCHEMA public IS 'Schema cleaned up to match current application state - removed legacy billing/subscription tables';