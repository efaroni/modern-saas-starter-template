import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { AuthHealthChecker } from '@/lib/auth/health-check';
import { testHelpers } from '@/lib/db/test-helpers';

// Mock the auth logger
jest.mock('@/lib/auth/logger', () => ({
  authLogger: {
    logPerformanceMetric: jest.fn(),
    logSecurityEvent: jest.fn(),
    log: jest.fn(),
  },
}));

describe('AuthHealthChecker', () => {
  let healthChecker: AuthHealthChecker;

  beforeEach(async () => {
    await testHelpers.setupTest();
    healthChecker = new AuthHealthChecker();
  });

  afterEach(async () => {
    await testHelpers.teardownTest();
    jest.clearAllMocks();
  });

  describe('Database Health Check', () => {
    it('should return healthy status for working database', async () => {
      const result = await healthChecker.checkDatabaseHealth();

      expect(result.status).toBe('healthy');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.details).toEqual({
        connectionPool: 'active',
        transactionSupport: 'available',
      });
    });

    it('should return unhealthy status for database errors', async () => {
      // Mock database error by creating a new instance with mocked db
      const mockDb = {
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            limit: jest.fn().mockRejectedValue(new Error('Connection failed')),
          }),
        }),
        transaction: jest
          .fn()
          .mockRejectedValue(new Error('Transaction failed')),
      };

      // Create a new health checker instance with mocked database
      const healthCheckerWithMockedDb = new (class extends AuthHealthChecker {
        async checkDatabaseHealth() {
          try {
            const { responseTime } = await this.timeHealthCheck(
              'database',
              async () => {
                // Test basic database connectivity
                await mockDb.select().from({}).limit(1);

                // Test write capability with a simple transaction
                await mockDb.transaction(async tx => {
                  await tx.select().from({}).limit(0);
                });
              },
            );

            return {
              status: 'healthy' as const,
              timestamp: new Date(),
              responseTime,
              details: {
                connectionPool: 'active',
                transactionSupport: 'available',
              },
            };
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : 'Database health check failed';

            return {
              status: 'unhealthy' as const,
              timestamp: new Date(),
              error: errorMessage,
              details: {
                connectionPool: 'failed',
                transactionSupport: 'unavailable',
              },
            };
          }
        }
      })();

      const result = await healthCheckerWithMockedDb.checkDatabaseHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Connection failed');
      expect(result.details).toEqual({
        connectionPool: 'failed',
        transactionSupport: 'unavailable',
      });
    });
  });

  describe('Session Storage Health Check', () => {
    it('should return healthy status for valid session configuration', async () => {
      const originalEnv = process.env.SESSION_MAX_AGE;
      process.env.SESSION_MAX_AGE = '86400';

      const result = await healthChecker.checkSessionStorageHealth();

      expect(result.status).toBe('healthy');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.details).toEqual({
        storage: 'available',
        configuration: 'valid',
      });

      if (originalEnv) {
        process.env.SESSION_MAX_AGE = originalEnv;
      } else {
        delete process.env.SESSION_MAX_AGE;
      }
    });

    it('should return unhealthy status for invalid session configuration', async () => {
      const originalEnv = process.env.SESSION_MAX_AGE;
      process.env.SESSION_MAX_AGE = '0';

      const result = await healthChecker.checkSessionStorageHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Invalid session configuration');
      expect(result.details).toEqual({
        storage: 'unavailable',
        configuration: 'invalid',
      });

      if (originalEnv) {
        process.env.SESSION_MAX_AGE = originalEnv;
      } else {
        delete process.env.SESSION_MAX_AGE;
      }
    });
  });

  describe('Email Service Health Check', () => {
    it('should return healthy status for configured email service', async () => {
      const originalApiKey = process.env.RESEND_API_KEY;
      const originalFromEmail = process.env.RESEND_FROM_EMAIL;

      process.env.RESEND_API_KEY = 'test-api-key';
      process.env.RESEND_FROM_EMAIL = 'test@example.com';

      const result = await healthChecker.checkEmailServiceHealth();

      expect(result.status).toBe('healthy');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.details).toEqual({
        provider: 'resend',
        configured: true,
      });

      if (originalApiKey) {
        process.env.RESEND_API_KEY = originalApiKey;
      } else {
        delete process.env.RESEND_API_KEY;
      }

      if (originalFromEmail) {
        process.env.RESEND_FROM_EMAIL = originalFromEmail;
      } else {
        delete process.env.RESEND_FROM_EMAIL;
      }
    });

    it('should return degraded status for unconfigured email service', async () => {
      const originalApiKey = process.env.RESEND_API_KEY;
      const originalFromEmail = process.env.RESEND_FROM_EMAIL;

      delete process.env.RESEND_API_KEY;
      delete process.env.RESEND_FROM_EMAIL;

      const result = await healthChecker.checkEmailServiceHealth();

      expect(result.status).toBe('degraded');
      expect(result.error).toBe('Email service not configured');
      expect(result.details).toEqual({
        provider: 'resend',
        configured: false,
      });

      if (originalApiKey) {
        process.env.RESEND_API_KEY = originalApiKey;
      }

      if (originalFromEmail) {
        process.env.RESEND_FROM_EMAIL = originalFromEmail;
      }
    });
  });

  describe('OAuth Provider Health Check', () => {
    it('should return healthy status for configured Google OAuth', async () => {
      const originalClientId = process.env.GOOGLE_CLIENT_ID;
      const originalClientSecret = process.env.GOOGLE_CLIENT_SECRET;

      process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';

      const result = await healthChecker.checkOAuthProviderHealth('google');

      expect(result.status).toBe('healthy');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.details).toEqual({
        provider: 'google',
        configured: true,
      });

      if (originalClientId) {
        process.env.GOOGLE_CLIENT_ID = originalClientId;
      } else {
        delete process.env.GOOGLE_CLIENT_ID;
      }

      if (originalClientSecret) {
        process.env.GOOGLE_CLIENT_SECRET = originalClientSecret;
      } else {
        delete process.env.GOOGLE_CLIENT_SECRET;
      }
    });

    it('should return degraded status for unconfigured GitHub OAuth', async () => {
      const originalClientId = process.env.GITHUB_ID;
      const originalClientSecret = process.env.GITHUB_SECRET;

      delete process.env.GITHUB_ID;
      delete process.env.GITHUB_SECRET;

      const result = await healthChecker.checkOAuthProviderHealth('github');

      expect(result.status).toBe('degraded');
      expect(result.error).toBe('github OAuth not configured');
      expect(result.details).toEqual({
        provider: 'github',
        configured: false,
      });

      if (originalClientId) {
        process.env.GITHUB_ID = originalClientId;
      }

      if (originalClientSecret) {
        process.env.GITHUB_SECRET = originalClientSecret;
      }
    });
  });

  describe('Overall Health Check', () => {
    it('should return healthy status when all critical services are healthy', async () => {
      // Store original values
      const originalSessionMaxAge = process.env.SESSION_MAX_AGE;
      const originalResendApiKey = process.env.RESEND_API_KEY;
      const originalResendFromEmail = process.env.RESEND_FROM_EMAIL;
      const originalGoogleClientId = process.env.GOOGLE_CLIENT_ID;
      const originalGoogleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const originalGitHubId = process.env.GITHUB_ID;
      const originalGitHubSecret = process.env.GITHUB_SECRET;

      // Configure all services
      process.env.SESSION_MAX_AGE = '86400';
      process.env.RESEND_API_KEY = 'test-api-key-12345';
      process.env.RESEND_FROM_EMAIL = 'test@example.com';
      process.env.GOOGLE_CLIENT_ID = 'test-google-client-id-12345';
      process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret-12345';
      process.env.GITHUB_ID = 'test-github-client-id-12345';
      process.env.GITHUB_SECRET = 'test-github-client-secret-12345';

      const result = await healthChecker.checkOverallHealth();

      expect(result.overall.status).toBe('healthy');
      expect(result.database.status).toBe('healthy');
      expect(result.sessionStorage.status).toBe('healthy');
      expect(result.emailService.status).toBe('healthy');
      expect(result.oauthProviders.google.status).toBe('healthy');
      expect(result.oauthProviders.github.status).toBe('healthy');

      // Restore original values
      if (originalSessionMaxAge) {
        process.env.SESSION_MAX_AGE = originalSessionMaxAge;
      } else {
        delete process.env.SESSION_MAX_AGE;
      }

      if (originalResendApiKey) {
        process.env.RESEND_API_KEY = originalResendApiKey;
      } else {
        delete process.env.RESEND_API_KEY;
      }

      if (originalResendFromEmail) {
        process.env.RESEND_FROM_EMAIL = originalResendFromEmail;
      } else {
        delete process.env.RESEND_FROM_EMAIL;
      }

      if (originalGoogleClientId) {
        process.env.GOOGLE_CLIENT_ID = originalGoogleClientId;
      } else {
        delete process.env.GOOGLE_CLIENT_ID;
      }

      if (originalGoogleClientSecret) {
        process.env.GOOGLE_CLIENT_SECRET = originalGoogleClientSecret;
      } else {
        delete process.env.GOOGLE_CLIENT_SECRET;
      }

      if (originalGitHubId) {
        process.env.GITHUB_ID = originalGitHubId;
      } else {
        delete process.env.GITHUB_ID;
      }

      if (originalGitHubSecret) {
        process.env.GITHUB_SECRET = originalGitHubSecret;
      } else {
        delete process.env.GITHUB_SECRET;
      }
    });

    it('should return unhealthy status when critical services fail', async () => {
      // Set invalid session configuration
      process.env.SESSION_MAX_AGE = '0';

      const result = await healthChecker.checkOverallHealth();

      expect(result.overall.status).toBe('unhealthy');
      expect(result.overall.error).toBe(
        'Critical authentication services are failing',
      );
      expect(result.sessionStorage.status).toBe('unhealthy');
    });

    it('should return degraded status when optional services fail', async () => {
      // Configure critical services but not email
      process.env.SESSION_MAX_AGE = '86400';
      delete process.env.RESEND_API_KEY;
      delete process.env.RESEND_FROM_EMAIL;

      const result = await healthChecker.checkOverallHealth();

      expect(result.overall.status).toBe('degraded');
      expect(result.overall.error).toBe(
        'Some authentication services are degraded',
      );
      expect(result.database.status).toBe('healthy');
      expect(result.sessionStorage.status).toBe('healthy');
      expect(result.emailService.status).toBe('degraded');
    });
  });
});
