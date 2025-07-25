import { type NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  try {
    // Dynamically import to avoid build-time initialization
    const { authHealthChecker } = await import('@/lib/auth/health-check');

    // Readiness probe checks if the service is ready to handle requests
    // This includes checking critical dependencies like database
    const healthStatus = await authHealthChecker.checkOverallHealth();

    const isReady =
      healthStatus.database.status === 'healthy' &&
      healthStatus.sessionStorage.status === 'healthy';

    if (!isReady) {
      return NextResponse.json(
        {
          ready: false,
          timestamp: new Date(),
          reason: 'Critical services not available',
          details: {
            database: healthStatus.database.status,
            sessionStorage: healthStatus.sessionStorage.status,
          },
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        ready: true,
        timestamp: new Date(),
        details: {
          database: healthStatus.database.status,
          sessionStorage: healthStatus.sessionStorage.status,
          emailService: healthStatus.emailService.status,
          oauthProviders: {
            google: healthStatus.oauthProviders.google.status,
            github: healthStatus.oauthProviders.github.status,
          },
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Readiness check error:', error);

    return NextResponse.json(
      {
        ready: false,
        timestamp: new Date(),
        error: 'Readiness check failed',
        details: {
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 503 },
    );
  }
}
