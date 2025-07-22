/**
 * Centralized Application Configuration
 *
 * This file contains all configuration values that were previously
 * scattered throughout the codebase as magic numbers.
 */

// Helper function to parse environment variables with defaults
function parseEnvInt(envVar: string, defaultValue: number): number {
  const value = process.env[envVar];
  return value ? parseInt(value, 10) : defaultValue;
}

function parseEnvBool(envVar: string, defaultValue: boolean): boolean {
  const value = process.env[envVar];
  return value ? value.toLowerCase() === 'true' : defaultValue;
}

// Authentication Configuration
export const AUTH_CONFIG = {
  // Password Security
  BCRYPT_ROUNDS: parseEnvInt('AUTH_BCRYPT_ROUNDS', 12),
  PASSWORD_HISTORY_LIMIT: parseEnvInt('AUTH_PASSWORD_HISTORY_LIMIT', 5),

  // Session Management
  SESSION_DURATION_HOURS: parseEnvInt('AUTH_SESSION_DURATION_HOURS', 24),
  SESSION_DURATION_MS:
    parseEnvInt('AUTH_SESSION_DURATION_HOURS', 24) * 60 * 60 * 1000,
  SESSION_CLEANUP_INTERVAL_MS:
    parseEnvInt('AUTH_SESSION_CLEANUP_INTERVAL_HOURS', 1) * 60 * 60 * 1000,

  // Token Expiration
  EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS: parseEnvInt(
    'AUTH_EMAIL_VERIFICATION_EXPIRY_HOURS',
    1,
  ),
  PASSWORD_RESET_TOKEN_EXPIRY_HOURS: parseEnvInt(
    'AUTH_PASSWORD_RESET_EXPIRY_HOURS',
    24,
  ),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MINUTES: parseEnvInt('AUTH_RATE_LIMIT_WINDOW_MINUTES', 15),
  RATE_LIMIT_MAX_ATTEMPTS: parseEnvInt('AUTH_RATE_LIMIT_MAX_ATTEMPTS', 5),

  // OAuth Security
  ALLOW_DANGEROUS_EMAIL_ACCOUNT_LINKING: parseEnvBool(
    'AUTH_ALLOW_DANGEROUS_EMAIL_LINKING',
    process.env.NODE_ENV === 'development',
  ),

  // Cookie Security
  COOKIE_SECURE: parseEnvBool(
    'AUTH_COOKIE_SECURE',
    process.env.NODE_ENV === 'production',
  ),
  COOKIE_SAME_SITE:
    process.env.NODE_ENV === 'production'
      ? ('strict' as const)
      : ('lax' as const),
} as const;

// Database Configuration moved to lib/db/config.ts for better organization

// API Configuration
export const API_CONFIG = {
  // Rate Limiting
  DEFAULT_RATE_LIMIT_REQUESTS: parseEnvInt(
    'API_DEFAULT_RATE_LIMIT_REQUESTS',
    100,
  ),
  DEFAULT_RATE_LIMIT_WINDOW_MS: parseEnvInt(
    'API_DEFAULT_RATE_LIMIT_WINDOW_MS',
    60000,
  ), // 1 minute

  // Request Timeout
  REQUEST_TIMEOUT_MS: parseEnvInt('API_REQUEST_TIMEOUT_MS', 30000),

  // Validation
  MAX_REQUEST_SIZE_MB: parseEnvInt('API_MAX_REQUEST_SIZE_MB', 10),

  // Security
  ENABLE_CORS: parseEnvBool('API_ENABLE_CORS', false),
  CORS_ORIGINS: process.env.API_CORS_ORIGINS?.split(',') || [],
} as const;

// Email Configuration
export const EMAIL_CONFIG = {
  // Retry Configuration
  MAX_RETRIES: parseEnvInt('EMAIL_MAX_RETRIES', 3),
  RETRY_DELAY_MS: parseEnvInt('EMAIL_RETRY_DELAY_MS', 1000),

  // Rate Limiting
  RATE_LIMIT_PER_HOUR: parseEnvInt('EMAIL_RATE_LIMIT_PER_HOUR', 100),

  // Template Configuration
  DEFAULT_FROM_EMAIL: process.env.EMAIL_FROM || 'noreply@example.com',
  DEFAULT_FROM_NAME: process.env.EMAIL_FROM_NAME || 'App',
} as const;

// File Upload Configuration
export const UPLOAD_CONFIG = {
  // File Size Limits
  MAX_FILE_SIZE_MB: parseEnvInt('UPLOAD_MAX_FILE_SIZE_MB', 50),
  MAX_FILE_SIZE_BYTES: parseEnvInt('UPLOAD_MAX_FILE_SIZE_MB', 50) * 1024 * 1024,

  // Allowed File Types
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'text/plain',
    'application/msword',
  ],

  // Storage
  STORAGE_PROVIDER: process.env.UPLOAD_STORAGE_PROVIDER || 'local',
  STORAGE_BUCKET: process.env.UPLOAD_STORAGE_BUCKET || 'uploads',
} as const;

// Cache Configuration
export const CACHE_CONFIG = {
  // Redis Configuration
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  REDIS_KEY_PREFIX: process.env.REDIS_KEY_PREFIX || 'app:',

  // Default TTL
  DEFAULT_TTL_SECONDS: parseEnvInt('CACHE_DEFAULT_TTL_SECONDS', 3600), // 1 hour

  // Session Cache
  SESSION_TTL_SECONDS: parseEnvInt('CACHE_SESSION_TTL_SECONDS', 86400), // 24 hours

  // API Key Cache
  API_KEY_TTL_SECONDS: parseEnvInt('CACHE_API_KEY_TTL_SECONDS', 300), // 5 minutes
} as const;

// Logging Configuration
export const LOGGING_CONFIG = {
  // Log Levels
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // Structured Logging
  ENABLE_STRUCTURED_LOGGING: parseEnvBool('LOG_ENABLE_STRUCTURED', true),

  // Security Logging
  ENABLE_SECURITY_ALERTS: parseEnvBool('LOG_ENABLE_SECURITY_ALERTS', true),

  // Performance Logging
  ENABLE_PERFORMANCE_LOGGING: parseEnvBool('LOG_ENABLE_PERFORMANCE', true),
  LOG_SLOW_REQUESTS_MS: parseEnvInt('LOG_SLOW_REQUESTS_MS', 5000),
} as const;

// Validation Helpers
export const VALIDATION_CONFIG = {
  // UUID Regex Pattern (extracted from repeated usage)
  UUID_PATTERN:
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,

  // Email Validation
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

  // Password Validation
  PASSWORD_MIN_LENGTH: parseEnvInt('AUTH_PASSWORD_MIN_LENGTH', 8),
  PASSWORD_MAX_LENGTH: parseEnvInt('AUTH_PASSWORD_MAX_LENGTH', 128),
} as const;

// Environment Helpers
export const ENV_CONFIG = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_TEST: process.env.NODE_ENV === 'test',
} as const;

// Export all configs as a single object for convenience
export const APP_CONFIG = {
  AUTH: AUTH_CONFIG,
  API: API_CONFIG,
  EMAIL: EMAIL_CONFIG,
  UPLOAD: UPLOAD_CONFIG,
  CACHE: CACHE_CONFIG,
  LOGGING: LOGGING_CONFIG,
  VALIDATION: VALIDATION_CONFIG,
  ENV: ENV_CONFIG,
} as const;

// Type exports for TypeScript support
export type AuthConfig = typeof AUTH_CONFIG;
export type ApiConfig = typeof API_CONFIG;
export type EmailConfig = typeof EMAIL_CONFIG;
export type UploadConfig = typeof UPLOAD_CONFIG;
export type CacheConfig = typeof CACHE_CONFIG;
export type LoggingConfig = typeof LOGGING_CONFIG;
export type ValidationConfig = typeof VALIDATION_CONFIG;
export type EnvConfig = typeof ENV_CONFIG;
export type AppConfig = typeof APP_CONFIG;
