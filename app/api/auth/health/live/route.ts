import { type NextRequest, NextResponse } from 'next/server';

export function GET(_request: NextRequest) {
  try {
    // Liveness probe checks if the service is alive and not deadlocked
    // This is a simple check that the service can respond
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    // Basic health indicators
    const isAlive = uptime > 0 && memoryUsage.heapUsed < memoryUsage.heapTotal;

    if (!isAlive) {
      return NextResponse.json(
        {
          alive: false,
          timestamp: new Date(),
          reason: 'Service appears to be deadlocked or out of memory',
          details: {
            uptime,
            memoryUsage: {
              heapUsed: memoryUsage.heapUsed,
              heapTotal: memoryUsage.heapTotal,
              rss: memoryUsage.rss,
            },
          },
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        alive: true,
        timestamp: new Date(),
        details: {
          uptime: Math.floor(uptime),
          memoryUsage: {
            heapUsed: Math.floor(memoryUsage.heapUsed / 1024 / 1024), // MB
            heapTotal: Math.floor(memoryUsage.heapTotal / 1024 / 1024), // MB
            rss: Math.floor(memoryUsage.rss / 1024 / 1024), // MB
            external: Math.floor(memoryUsage.external / 1024 / 1024), // MB
          },
          nodeVersion: process.version,
          platform: process.platform,
          pid: process.pid,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Liveness check error:', error);

    return NextResponse.json(
      {
        alive: false,
        timestamp: new Date(),
        error: 'Liveness check failed',
        details: {
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 503 },
    );
  }
}