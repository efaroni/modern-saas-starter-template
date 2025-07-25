import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Dynamically import to avoid build-time initialization
    const { authHealthChecker } = await import('@/lib/auth/health-check');
    const { searchParams } = new URL(request.url);
    const component = searchParams.get('component');

    // If specific component is requested, check only that component
    if (component) {
      let result;

      switch (component) {
        case 'database':
          result = await authHealthChecker.checkDatabaseHealth();
          break;
        case 'session':
          result = await authHealthChecker.checkSessionStorageHealth();
          break;
        case 'email':
          result = await authHealthChecker.checkEmailServiceHealth();
          break;
        case 'oauth-google':
          result = await authHealthChecker.checkOAuthProviderHealth('google');
          break;
        case 'oauth-github':
          result = await authHealthChecker.checkOAuthProviderHealth('github');
          break;
        default:
          return NextResponse.json(
            { error: 'Invalid component specified' },
            { status: 400 },
          );
      }

      let statusCode: number;
      if (result.status === 'healthy' || result.status === 'degraded') {
        statusCode = 200;
      } else {
        statusCode = 503;
      }

      return NextResponse.json(result, { status: statusCode });
    }

    // Otherwise, return complete health status
    const healthStatus = await authHealthChecker.checkOverallHealth();

    let statusCode: number;
    if (
      healthStatus.overall.status === 'healthy' ||
      healthStatus.overall.status === 'degraded'
    ) {
      statusCode = 200;
    } else {
      statusCode = 503;
    }

    return NextResponse.json(healthStatus, { status: statusCode });
  } catch (error) {
    console.error('Health check error:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date(),
        error: 'Health check failed',
        details: {
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 503 },
    );
  }
}
