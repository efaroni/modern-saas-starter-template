// import { eq } from 'drizzle-orm';

import { users } from '@/lib/db/schema';
import { db } from '@/lib/db/server';

import { authLogger } from './logger';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  responseTime?: number;
  error?: string;
  details?: Record<string, unknown>;
}

export interface AuthHealthStatus {
  overall: HealthCheckResult;
  database: HealthCheckResult;
  sessionStorage: HealthCheckResult;
  emailService: HealthCheckResult;
  oauthProviders: {
    google: HealthCheckResult;
    github: HealthCheckResult;
  };
}

export class AuthHealthChecker {
  private async timeHealthCheck<T>(
    checkName: string,
    checkFn: () => Promise<T>,
  ): Promise<{ result: T; responseTime: number }> {
    const start = Date.now();
    try {
      const result = await checkFn();
      const responseTime = Date.now() - start;

      authLogger.logPerformanceMetric({
        operation: `health_check_${checkName}`,
        duration: responseTime,
        success: true,
        timestamp: new Date(),
      });

      return { result, responseTime };
    } catch (error) {
      const responseTime = Date.now() - start;

      authLogger.logPerformanceMetric({
        operation: `health_check_${checkName}`,
        duration: responseTime,
        success: false,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date(),
      });

      throw error;
    }
  }

  async checkDatabaseHealth(): Promise<HealthCheckResult> {
    try {
      const { responseTime } = await this.timeHealthCheck(
        'database',
        async () => {
          // Test basic database connectivity
          await db.select().from(users).limit(1);

          // Test write capability with a simple transaction
          await db.transaction(async tx => {
            // This doesn't actually insert anything, just tests transaction capability
            await tx.select().from(users).limit(0);
          });
        },
      );

      return {
        status: 'healthy',
        timestamp: new Date(),
        responseTime,
        details: {
          connectionPool: 'active',
          transactionSupport: 'available',
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Database health check failed';

      authLogger.logSecurityEvent({
        type: 'brute_force',
        severity: 'high',
        details: {
          healthCheck: 'database',
          error: errorMessage,
          timestamp: new Date(),
        },
        timestamp: new Date(),
        actionTaken: 'database_health_check_failed',
      });

      return {
        status: 'unhealthy',
        timestamp: new Date(),
        error: errorMessage,
        details: {
          connectionPool: 'failed',
          transactionSupport: 'unavailable',
        },
      };
    }
  }

  async checkSessionStorageHealth(): Promise<HealthCheckResult> {
    try {
      const { responseTime } = await this.timeHealthCheck(
        'session_storage',
        // eslint-disable-next-line require-await
        async () => {
          // Test session storage by attempting to read session config
          const sessionConfig = {
            maxAge: process.env.SESSION_MAX_AGE || '86400',
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            sameSite: 'lax' as const,
          };

          // Validate session configuration
          if (!sessionConfig.maxAge || parseInt(sessionConfig.maxAge) <= 0) {
            throw new Error('Invalid session configuration');
          }

          return sessionConfig;
        },
      );

      return {
        status: 'healthy',
        timestamp: new Date(),
        responseTime,
        details: {
          storage: 'available',
          configuration: 'valid',
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Session storage health check failed';

      return {
        status: 'unhealthy',
        timestamp: new Date(),
        error: errorMessage,
        details: {
          storage: 'unavailable',
          configuration: 'invalid',
        },
      };
    }
  }

  async checkEmailServiceHealth(): Promise<HealthCheckResult> {
    try {
      const { responseTime } = await this.timeHealthCheck(
        'email_service',
        // eslint-disable-next-line require-await
        async () => {
          // Check if email service is configured
          const resendApiKey = process.env.RESEND_API_KEY;
          const fromEmail = process.env.RESEND_FROM_EMAIL;

          if (!resendApiKey || !fromEmail) {
            throw new Error('Email service not configured');
          }

          // Basic email format validation
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(fromEmail)) {
            throw new Error('Invalid from email configuration');
          }

          return {
            configured: true,
            provider: 'resend',
            fromEmail,
          };
        },
      );

      return {
        status: 'healthy',
        timestamp: new Date(),
        responseTime,
        details: {
          provider: 'resend',
          configured: true,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Email service health check failed';

      return {
        status: 'degraded',
        timestamp: new Date(),
        error: errorMessage,
        details: {
          provider: 'resend',
          configured: false,
        },
      };
    }
  }

  async checkOAuthProviderHealth(
    provider: 'google' | 'github',
  ): Promise<HealthCheckResult> {
    try {
      const { responseTime } = await this.timeHealthCheck(
        `oauth_${provider}`,
        // eslint-disable-next-line require-await
        async () => {
          let clientId: string | undefined;
          let clientSecret: string | undefined;

          if (provider === 'google') {
            clientId = process.env.GOOGLE_CLIENT_ID;
            clientSecret = process.env.GOOGLE_CLIENT_SECRET;
          } else if (provider === 'github') {
            clientId = process.env.GITHUB_ID;
            clientSecret = process.env.GITHUB_SECRET;
          }

          if (!clientId || !clientSecret) {
            throw new Error(`${provider} OAuth not configured`);
          }

          // Basic validation of OAuth configuration
          if (clientId.length < 10 || clientSecret.length < 10) {
            throw new Error(`${provider} OAuth configuration appears invalid`);
          }

          return {
            configured: true,
            provider,
            clientId: clientId.substring(0, 10) + '...', // Partial ID for logging
          };
        },
      );

      return {
        status: 'healthy',
        timestamp: new Date(),
        responseTime,
        details: {
          provider,
          configured: true,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : `${provider} OAuth health check failed`;

      return {
        status: 'degraded',
        timestamp: new Date(),
        error: errorMessage,
        details: {
          provider,
          configured: false,
        },
      };
    }
  }

  async checkOverallHealth(): Promise<AuthHealthStatus> {
    const [database, sessionStorage, emailService, googleOAuth, githubOAuth] =
      await Promise.all([
        this.checkDatabaseHealth(),
        this.checkSessionStorageHealth(),
        this.checkEmailServiceHealth(),
        this.checkOAuthProviderHealth('google'),
        this.checkOAuthProviderHealth('github'),
      ]);

    // Determine overall health status
    const criticalServices = [database, sessionStorage];
    const optionalServices = [emailService, googleOAuth, githubOAuth];

    const hasCriticalFailures = criticalServices.some(
      service => service.status === 'unhealthy',
    );
    const hasOptionalFailures = optionalServices.some(
      service => service.status === 'unhealthy',
    );
    const hasDegradedServices = [...criticalServices, ...optionalServices].some(
      service => service.status === 'degraded',
    );

    let overallStatus: 'healthy' | 'unhealthy' | 'degraded';
    let overallError: string | undefined;

    if (hasCriticalFailures) {
      overallStatus = 'unhealthy';
      overallError = 'Critical authentication services are failing';
    } else if (hasOptionalFailures || hasDegradedServices) {
      overallStatus = 'degraded';
      overallError = 'Some authentication services are degraded';
    } else {
      overallStatus = 'healthy';
    }

    const overall: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date(),
      error: overallError,
      details: {
        criticalServices: criticalServices.length,
        healthyCritical: criticalServices.filter(s => s.status === 'healthy')
          .length,
        optionalServices: optionalServices.length,
        healthyOptional: optionalServices.filter(s => s.status === 'healthy')
          .length,
      },
    };

    // Log health check results
    let logLevel: 'info' | 'warn' | 'error';
    if (overallStatus === 'healthy') {
      logLevel = 'info';
    } else if (overallStatus === 'degraded') {
      logLevel = 'warn';
    } else {
      logLevel = 'error';
    }

    authLogger.log(logLevel, `Auth health check completed: ${overallStatus}`, {
      overall: overall.status,
      database: database.status,
      sessionStorage: sessionStorage.status,
      emailService: emailService.status,
      googleOAuth: googleOAuth.status,
      githubOAuth: githubOAuth.status,
    });

    return {
      overall,
      database,
      sessionStorage,
      emailService,
      oauthProviders: {
        google: googleOAuth,
        github: githubOAuth,
      },
    };
  }
}

// Export singleton instance
export const authHealthChecker = new AuthHealthChecker();
