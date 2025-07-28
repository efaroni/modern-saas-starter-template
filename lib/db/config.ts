/**
 * Centralized Database Configuration
 *
 * Handles database connection URLs for different environments following
 * best practices with proper validation and environment detection.
 */

// Helper function to parse environment variables with defaults
function parseEnvInt(envVar: string, defaultValue: number): number {
  const value = process.env[envVar];
  return value ? parseInt(value, 10) : defaultValue;
}

export interface DatabaseConnectionComponents {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl?: boolean;
}

/**
 * Environment-specific database connection settings
 * Uses explicit environment variables for each environment - no fallbacks for cleaner config
 */
const DATABASE_ENVIRONMENTS = {
  development: {
    host: process.env.LOCAL_DB_HOST || 'localhost', // Only essential fallback
    port: parseEnvInt('LOCAL_DB_PORT', 5432), // Standard port fallback
    username: process.env.LOCAL_DB_USER, // No fallback - must be explicit
    password: process.env.LOCAL_DB_PASSWORD || '', // Empty password is valid
    database: process.env.LOCAL_DB_NAME, // No fallback - must be explicit
    ssl: false,
  },
  test: {
    host: process.env.TEST_DB_HOST || 'localhost', // Only essential fallback
    port: parseEnvInt('TEST_DB_PORT', 5432), // Standard port fallback
    username: process.env.TEST_DB_USER, // No fallback - must be explicit
    password: process.env.TEST_DB_PASSWORD || '', // Empty password is valid
    database: process.env.TEST_DB_NAME, // No fallback - must be explicit
    ssl: false,
  },
  production: {
    host: process.env.PROD_DB_HOST, // No fallback - fail fast
    port: parseEnvInt('PROD_DB_PORT', 5432), // Standard port only
    username: process.env.PROD_DB_USER, // No fallback - fail fast
    password: process.env.PROD_DB_PASSWORD, // No fallback - fail fast
    database: process.env.PROD_DB_NAME, // No fallback - fail fast
    ssl: true,
  },
} as const;

/**
 * Build a PostgreSQL connection URL from components
 */
function buildDatabaseUrl(components: DatabaseConnectionComponents): string {
  const { host, port, username, password, database, ssl } = components;

  // Validate required components (password can be empty for local development)
  if (!host || !username || !database) {
    throw new Error(
      'Database connection requires host, username, and database name. ' +
        'Please check your environment variables.',
    );
  }

  // Build the connection string (handle empty password)
  const baseUrl = password
    ? `postgresql://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${database}`
    : `postgresql://${encodeURIComponent(username)}@${host}:${port}/${database}`;

  // Add SSL parameter if needed
  if (ssl) {
    return `${baseUrl}?sslmode=require`;
  }

  return baseUrl;
}

export interface DatabaseConfig {
  url: string;
  poolSize: number;
  idleTimeout: number;
  connectTimeout: number;
  // Advanced pool settings
  maxLifetime: number;
  maxUses: number;
  // Query performance settings
  slowQueryThreshold: number;
  queryTimeout: number;
  // Health check settings
  healthCheckInterval: number;
  healthCheckTimeout: number;
  // Caching settings
  cacheTtl: number;
  cacheMaxSize: number;
}

/**
 * Get the appropriate database URL based on environment
 *
 * This function builds the database URL from environment-specific components
 * or falls back to the traditional DATABASE_URL environment variable.
 *
 * Priority:
 * 1. Component-based URL building from environment variables
 * 2. Fallback to DATABASE_URL/TEST_DATABASE_URL for backwards compatibility
 *
 * @returns {string} The database connection string
 * @throws {Error} If no valid database configuration is found
 *
 * @example
 * ```typescript
 * // Component-based (preferred)
 * process.env.LOCAL_DB_HOST = 'localhost'
 * process.env.LOCAL_DB_USER = 'postgres'
 * const url = getDatabaseUrl() // Builds from components
 *
 * // Fallback to full URL
 * process.env.DATABASE_URL = 'postgresql://...'
 * const url = getDatabaseUrl() // Uses DATABASE_URL directly
 * ```
 */
export function getDatabaseUrl(): string {
  const env = process.env.NODE_ENV || 'development';

  // Safety check: Prevent production database access in non-production environments
  if (
    env !== 'production' &&
    (process.env.PROD_DB_HOST || process.env.PROD_DB_USER)
  ) {
    throw new Error(
      '⚠️  SECURITY ERROR: Production database credentials detected in non-production environment! ' +
        'Refusing to continue to prevent accidental production data access.',
    );
  }

  // Safety check: Require explicit production configuration
  if (env === 'production') {
    const required = [
      'PROD_DB_HOST',
      'PROD_DB_USER',
      'PROD_DB_PASSWORD',
      'PROD_DB_NAME',
    ];
    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(
        `Missing required production database configuration: ${missing.join(', ')}. ` +
          'Production requires explicit database credentials for safety.',
      );
    }
  }

  try {
    // Try component-based URL building first
    let envConfig: DatabaseConnectionComponents;

    if (env === 'test') {
      envConfig = DATABASE_ENVIRONMENTS.test;
    } else if (env === 'production') {
      envConfig = DATABASE_ENVIRONMENTS.production;
    } else {
      envConfig = DATABASE_ENVIRONMENTS.development;
    }

    // If we have all required components, build the URL (password can be empty)
    if (envConfig.host && envConfig.username && envConfig.database) {
      return buildDatabaseUrl(envConfig);
    }
  } catch {
    // Fall through to legacy URL method
  }

  // Fallback to legacy environment variables for backwards compatibility
  if (env === 'test' && process.env.TEST_DATABASE_URL) {
    return process.env.TEST_DATABASE_URL;
  }

  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // If we get here, no valid configuration was found
  throw new Error(
    'Database configuration is missing. Please set either:\n' +
      '1. Component variables: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME\n' +
      '2. Or full URL: DATABASE_URL (TEST_DATABASE_URL for tests)\n' +
      'See documentation for complete setup instructions.',
  );
}

/**
 * Get database configuration with environment-specific settings
 * Consolidates all database configuration from various sources
 *
 * @returns {DatabaseConfig} Complete database configuration object
 *
 * @example
 * ```typescript
 * const config = getDatabaseConfig()
 *
 * // Use in connection pool
 * const client = postgres(config.url, {
 *   max: config.poolSize,
 *   idle_timeout: config.idleTimeout * 1000
 * })
 * ```
 */
export function getDatabaseConfig(): DatabaseConfig {
  const url = getDatabaseUrl();

  // Base configuration with environment variable overrides
  const baseConfig = {
    url,
    // Connection Pool Settings (from app-config DATABASE_CONFIG)
    poolSize: parseEnvInt('DB_MAX_CONNECTIONS', 20),
    idleTimeout: parseEnvInt('DB_IDLE_TIMEOUT_MS', 30000) / 1000, // Convert to seconds
    connectTimeout: parseEnvInt('DB_CONNECT_TIMEOUT_MS', 10000) / 1000, // Convert to seconds

    // Advanced Pool Settings
    maxLifetime: parseEnvInt('DB_MAX_LIFETIME_SECONDS', 3600), // 1 hour
    maxUses: parseEnvInt('DB_MAX_USES', 7500),

    // Query Performance Settings
    slowQueryThreshold: parseEnvInt('DB_SLOW_QUERY_THRESHOLD_MS', 1000),
    queryTimeout: parseEnvInt('DB_QUERY_TIMEOUT_MS', 30000),

    // Health Check Settings
    healthCheckInterval: parseEnvInt('DB_HEALTH_CHECK_INTERVAL_MS', 30000),
    healthCheckTimeout: parseEnvInt('DB_HEALTH_CHECK_TIMEOUT_MS', 5000),

    // Caching Settings
    cacheTtl: parseEnvInt('DB_CACHE_TTL_SECONDS', 300), // 5 minutes
    cacheMaxSize: parseEnvInt('DB_CACHE_MAX_SIZE', 100),
  };

  // Environment-specific overrides for optimal performance
  switch (process.env.NODE_ENV) {
    case 'test':
      // Test environment: smaller pool, faster timeouts for parallel execution
      return {
        ...baseConfig,
        poolSize: parseEnvInt('DB_MAX_CONNECTIONS', 3),
        idleTimeout: 20,
        connectTimeout: 10,
        healthCheckInterval: 5000, // More frequent checks in tests
        cacheTtl: 60, // Shorter cache for tests
      };

    case 'development':
      // Development: moderate settings for good performance
      return {
        ...baseConfig,
        poolSize: parseEnvInt('DB_MAX_CONNECTIONS', 5),
        idleTimeout: 30,
        connectTimeout: 10,
      };

    case 'production':
      // Production: optimized for scale and reliability
      return {
        ...baseConfig,
        poolSize: parseEnvInt('DB_MAX_CONNECTIONS', 20),
        idleTimeout: 60,
        connectTimeout: 30,
        maxLifetime: 7200, // 2 hours in production
        slowQueryThreshold: 2000, // Higher threshold in production
      };

    default:
      return baseConfig;
  }
}

/**
 * Validate database URL format
 *
 * @param {string} url - The database URL to validate
 * @returns {boolean} True if the URL is a valid PostgreSQL connection string
 *
 * @example
 * ```typescript
 * const isValid = validateDatabaseUrl('postgresql://user:pass@localhost:5432/db')
 * // returns: true
 *
 * const isInvalid = validateDatabaseUrl('invalid-url')
 * // returns: false
 * ```
 */
export function validateDatabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'postgresql:' || parsed.protocol === 'postgres:';
  } catch {
    return false;
  }
}

/**
 * Get environment-appropriate database name for naming consistency
 */
export function getDatabaseName(): string {
  const url = getDatabaseUrl();
  try {
    const parsed = new URL(url);
    return parsed.pathname.slice(1); // Remove leading slash
  } catch {
    return 'unknown';
  }
}

/**
 * Get database connection components for the current environment
 *
 * @returns {DatabaseConnectionComponents} The database connection components
 *
 * @example
 * ```typescript
 * const components = getDatabaseConnectionComponents()
 * console.warn(`Connecting to ${components.host}:${components.port}`)
 * ```
 */
export function getDatabaseConnectionComponents(): DatabaseConnectionComponents {
  const env = process.env.NODE_ENV || 'development';

  if (env === 'test') {
    return DATABASE_ENVIRONMENTS.test;
  } else if (env === 'production') {
    return DATABASE_ENVIRONMENTS.production;
  } else {
    return DATABASE_ENVIRONMENTS.development;
  }
}

/**
 * Check if we're using a real database connection (not mock)
 *
 * This function is useful for services that need to determine whether
 * to use actual database operations or mock data.
 *
 * @returns {boolean} True if a valid database connection is configured
 *
 * @example
 * ```typescript
 * // In service factory
 * export function createUserService() {
 *   if (isRealDatabase()) {
 *     return new DatabaseUserService()
 *   } else {
 *     return new MockUserService()
 *   }
 * }
 * ```
 */
export function isRealDatabase(): boolean {
  try {
    const url = getDatabaseUrl();
    return validateDatabaseUrl(url);
  } catch {
    return false;
  }
}
