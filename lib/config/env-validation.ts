import { z } from 'zod';

// Define the schema for required environment variables
const envSchema = z
  .object({
    // Node environment
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),

    // Database configuration
    DEV_DB_HOST: z.string().optional(),
    DEV_DB_PORT: z.string().transform(Number).optional(),
    DEV_DB_USER: z.string().optional(),
    DEV_DB_PASSWORD: z.string().optional(),
    DEV_DB_NAME: z.string().optional(),
    DATABASE_URL: z.string().url().optional(),

    // Test database (isolated test environment)
    TEST_DB_HOST: z.string().optional(),
    TEST_DB_PORT: z.string().transform(Number).optional(),
    TEST_DB_USER: z.string().optional(),
    TEST_DB_PASSWORD: z.string().optional(),
    TEST_DB_NAME: z.string().optional(),

    // Production database (required in production)
    PROD_DB_HOST: z.string().optional(),
    PROD_DB_PORT: z.string().transform(Number).optional(),
    PROD_DB_USER: z.string().optional(),
    PROD_DB_PASSWORD: z.string().optional(),
    PROD_DB_NAME: z.string().optional(),

    // Clerk authentication (optional for unit/integration tests)
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
    CLERK_SECRET_KEY: z.string().optional(),
    CLERK_WEBHOOK_SECRET: z.string().optional(),

    // External service APIs (optional for development)
    RESEND_API_KEY: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    STRIPE_SECRET_KEY: z.string().optional(),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),

    // Application URLs
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),

    // Security keys
    ENCRYPTION_KEY: z
      .string()
      .min(32, 'Encryption key must be at least 32 characters')
      .optional(),
    AUTH_SECRET: z
      .string()
      .min(10, 'Auth secret must be at least 10 characters')
      .optional(),

    // Redis (optional)
    REDIS_URL: z.string().url().optional(),
  })
  .refine(
    data => {
      // In production, require production database variables
      if (data.NODE_ENV === 'production') {
        return (
          data.PROD_DB_HOST &&
          data.PROD_DB_USER &&
          data.PROD_DB_PASSWORD &&
          data.PROD_DB_NAME
        );
      }

      // In development, require development database variables
      if (data.NODE_ENV === 'development') {
        const hasComponentVars =
          data.DEV_DB_HOST && data.DEV_DB_USER && data.DEV_DB_NAME;
        const hasFullUrl = data.DATABASE_URL;
        return hasComponentVars || hasFullUrl;
      }

      // In test, require test database variables
      if (data.NODE_ENV === 'test') {
        const hasTestComponentVars =
          data.TEST_DB_HOST && data.TEST_DB_USER && data.TEST_DB_NAME;
        const hasFullUrl = data.DATABASE_URL;
        return hasTestComponentVars || hasFullUrl;
      }

      return true;
    },
    {
      message:
        'Database configuration is incomplete for the current environment',
    },
  );

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validate environment variables at startup
 * @returns Validated environment configuration
 * @throws Error if validation fails
 */
export function validateEnv(): EnvConfig {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = [
        '❌ Environment validation failed:',
        '',
        ...error.errors.map(err => `  • ${err.path.join('.')}: ${err.message}`),
        '',
        '💡 Check your .env.local file and ensure all required variables are set.',
        '   See .env.example for reference.',
      ].join('\n');

      throw new Error(errorMessage);
    }
    throw error;
  }
}

/**
 * Get validated environment configuration
 * Caches the result after first validation
 */
let cachedEnv: EnvConfig | null = null;

export function getEnv(): EnvConfig {
  if (!cachedEnv) {
    cachedEnv = validateEnv();
  }
  return cachedEnv;
}

/**
 * Validate environment for e2e tests that require Clerk authentication
 */
export function validateE2EEnv(): EnvConfig {
  const env = getEnv();

  if (!env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !env.CLERK_SECRET_KEY) {
    throw new Error(
      'E2E tests require Clerk authentication keys:\n' +
        '  • NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY\n' +
        '  • CLERK_SECRET_KEY\n\n' +
        '💡 Ensure these are set in your .env.local file',
    );
  }

  return env;
}

/**
 * Check if we're in a specific environment
 */
export function isProduction(): boolean {
  return getEnv().NODE_ENV === 'production';
}

export function isDevelopment(): boolean {
  return getEnv().NODE_ENV === 'development';
}

export function isTest(): boolean {
  return getEnv().NODE_ENV === 'test';
}
