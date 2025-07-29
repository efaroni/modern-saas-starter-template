-- Migration: Add Performance Indexes for Authentication
-- This migration adds indexes to optimize common authentication queries

-- ===== USERS TABLE INDEXES =====
-- Email is already unique, but let's ensure it's optimized for lookups
CREATE INDEX IF NOT EXISTS idx_users_email_lookup ON users (email) WHERE email IS NOT NULL;

-- Index for email verification status queries
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users (email_verified) WHERE email_verified IS NOT NULL;

-- Index for user lookups by creation date (for pagination, reporting)
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at DESC);

-- Index for updated_at for sync operations
CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users (updated_at DESC);

-- ===== ACCOUNTS TABLE INDEXES =====
-- Index for OAuth account lookups by provider and provider account ID
CREATE INDEX IF NOT EXISTS idx_accounts_provider_lookup ON accounts (provider, provider_account_id);

-- Index for finding all accounts for a user
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts (user_id);

-- Index for token refresh operations
CREATE INDEX IF NOT EXISTS idx_accounts_refresh_token ON accounts (refresh_token) WHERE refresh_token IS NOT NULL;

-- ===== SESSIONS TABLE INDEXES =====
-- Session token is already primary key, but let's optimize user lookups
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);

-- Index for expired session cleanup
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires);

-- ===== VERIFICATION TOKENS TABLE INDEXES =====
-- Index for token cleanup by expiration
CREATE INDEX IF NOT EXISTS idx_verification_tokens_expires ON verification_tokens (expires);

-- Index for identifier lookups
CREATE INDEX IF NOT EXISTS idx_verification_tokens_identifier ON verification_tokens (identifier);

-- ===== USER API KEYS TABLE INDEXES =====
-- Index for user API key lookups
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys (user_id);

-- Index for provider-specific key lookups
CREATE INDEX IF NOT EXISTS idx_user_api_keys_provider ON user_api_keys (provider);

-- Composite index for user + provider lookups (most common query)
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_provider ON user_api_keys (user_id, provider);

-- ===== PASSWORD HISTORY TABLE INDEXES =====
-- Index for password history lookups by user (most common query)
CREATE INDEX IF NOT EXISTS idx_password_history_user_id ON password_history (user_id);

-- Index for password history cleanup by date
CREATE INDEX IF NOT EXISTS idx_password_history_created_at ON password_history (created_at DESC);

-- Composite index for user + date (for getting recent passwords)
CREATE INDEX IF NOT EXISTS idx_password_history_user_date ON password_history (user_id, created_at DESC);

-- ===== AUTH ATTEMPTS TABLE INDEXES =====
-- Index for rate limiting lookups by identifier
CREATE INDEX IF NOT EXISTS idx_auth_attempts_identifier ON auth_attempts (identifier);

-- Index for IP-based rate limiting
CREATE INDEX IF NOT EXISTS idx_auth_attempts_ip ON auth_attempts (ip_address) WHERE ip_address IS NOT NULL;

-- Index for user-specific attempt history
CREATE INDEX IF NOT EXISTS idx_auth_attempts_user_id ON auth_attempts (user_id) WHERE user_id IS NOT NULL;

-- Index for attempt type filtering
CREATE INDEX IF NOT EXISTS idx_auth_attempts_type ON auth_attempts (type);

-- Composite index for rate limiting queries (identifier + type + time)
CREATE INDEX IF NOT EXISTS idx_auth_attempts_rate_limit ON auth_attempts (identifier, type, created_at DESC);

-- Index for cleanup of old attempts
CREATE INDEX IF NOT EXISTS idx_auth_attempts_created_at ON auth_attempts (created_at DESC);

-- ===== USER SESSIONS TABLE INDEXES =====
-- Index for user session lookups
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions (user_id);

-- Index for session token lookups (already unique but for performance)
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions (session_token);

-- Index for active session queries
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions (is_active) WHERE is_active = true;

-- Index for session expiration cleanup
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions (expires_at);

-- Index for last activity tracking
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions (last_activity DESC);

-- Composite index for user + active sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active ON user_sessions (user_id, is_active) WHERE is_active = true;

-- ===== SESSION ACTIVITY TABLE INDEXES =====
-- Index for session activity lookups
CREATE INDEX IF NOT EXISTS idx_session_activity_session_id ON session_activity (session_id);

-- Index for activity type filtering
CREATE INDEX IF NOT EXISTS idx_session_activity_action ON session_activity (action);

-- Index for time-based activity queries
CREATE INDEX IF NOT EXISTS idx_session_activity_created_at ON session_activity (created_at DESC);

-- Composite index for session + time (for activity history)
CREATE INDEX IF NOT EXISTS idx_session_activity_session_time ON session_activity (session_id, created_at DESC);

-- ===== PERFORMANCE OPTIMIZATION INDEXES =====
-- Partial indexes for common WHERE conditions

-- Index for unverified users (for email verification reminders)
CREATE INDEX IF NOT EXISTS idx_users_unverified ON users (email, created_at) WHERE email_verified IS NULL;

-- Index for recent failed auth attempts (for security monitoring)
-- Note: Removed time-based predicate as NOW() is not immutable
CREATE INDEX IF NOT EXISTS idx_auth_attempts_recent_failed ON auth_attempts (identifier, ip_address, created_at DESC, success);

-- Index for active sessions with recent activity  
-- Note: Removed time-based predicate as NOW() is not immutable
CREATE INDEX IF NOT EXISTS idx_user_sessions_active_recent ON user_sessions (user_id, last_activity DESC, is_active);

-- ===== FOREIGN KEY CONSTRAINT INDEXES =====
-- These indexes support foreign key constraints and improve join performance

-- Already covered by previous indexes, but ensuring they exist:
-- accounts.user_id -> users.id (covered by idx_accounts_user_id)
-- sessions.user_id -> users.id (covered by idx_sessions_user_id)
-- password_history.user_id -> users.id (covered by idx_password_history_user_id)
-- auth_attempts.user_id -> users.id (covered by idx_auth_attempts_user_id)
-- user_sessions.user_id -> users.id (covered by idx_user_sessions_user_id)
-- session_activity.session_id -> user_sessions.id (covered by idx_session_activity_session_id)

-- ===== CLEANUP INDEXES =====
-- These help with maintenance queries

-- Index for finding old verification tokens to cleanup
-- Note: Removed NOW() predicate as it's not immutable - application handles cleanup
CREATE INDEX IF NOT EXISTS idx_verification_tokens_cleanup ON verification_tokens (expires);

-- Index for finding expired sessions to cleanup  
-- Note: Removed NOW() predicate as it's not immutable - application handles cleanup
CREATE INDEX IF NOT EXISTS idx_sessions_cleanup ON sessions (expires);

-- Index for finding old auth attempts to cleanup
-- Note: Removed NOW() predicate as it's not immutable - application handles cleanup
CREATE INDEX IF NOT EXISTS idx_auth_attempts_cleanup ON auth_attempts (created_at);

-- ===== ANALYZE TABLES =====
-- Update table statistics for the query planner
ANALYZE users;
ANALYZE accounts;
ANALYZE sessions;
ANALYZE verification_tokens;
ANALYZE user_api_keys;
ANALYZE password_history;
ANALYZE auth_attempts;
ANALYZE user_sessions;
ANALYZE session_activity;