import { ErrorHandler } from '@/lib/utils/error-handler'
import { getDatabasePool } from '@/lib/db/connection-pool'
import { authLogger } from '@/lib/auth/logger'

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  uptime: number
  services: {
    database: ServiceHealth
    errorHandler: ServiceHealth
    logger: ServiceHealth
    memory: ServiceHealth
    process: ServiceHealth
  }
  metrics: {
    errorRates: Record<string, number>
    responseTime: number
    memoryUsage: NodeJS.MemoryUsage
  }
  alerts: HealthAlert[]
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime?: number
  lastCheck: string
  error?: string
  details?: Record<string, unknown>
}

export interface HealthAlert {
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  timestamp: string
  service: string
  details?: Record<string, unknown>
}

export class HealthMonitor {
  private static instance: HealthMonitor
  private alerts: HealthAlert[] = []
  private readonly maxAlerts = 100

  static getInstance(): HealthMonitor {
    if (!HealthMonitor.instance) {
      HealthMonitor.instance = new HealthMonitor()
    }
    return HealthMonitor.instance
  }

  /**
   * Perform comprehensive health check
   */
  async checkHealth(): Promise<HealthStatus> {
    const startTime = Date.now()
    
    // Check all services
    const [database, errorHandler, logger, memory, process] = await Promise.allSettled([
      this.checkDatabaseHealth(),
      this.checkErrorHandlerHealth(),
      this.checkLoggerHealth(),
      this.checkMemoryHealth(),
      this.checkProcessHealth()
    ])

    const responseTime = Date.now() - startTime

    const services = {
      database: this.getServiceResult(database, 'database'),
      errorHandler: this.getServiceResult(errorHandler, 'errorHandler'),
      logger: this.getServiceResult(logger, 'logger'),
      memory: this.getServiceResult(memory, 'memory'),
      process: this.getServiceResult(process, 'process')
    }

    // Calculate overall status
    const overallStatus = this.calculateOverallStatus(services)

    // Get metrics
    const metrics = {
      errorRates: ErrorHandler.getInstance().getErrorMetrics(),
      responseTime,
      memoryUsage: process.memoryUsage()
    }

    // Update alerts based on health check results
    this.updateAlerts(services, metrics)

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      services,
      metrics,
      alerts: this.getRecentAlerts()
    }
  }

  /**
   * Check database health
   */
  private async checkDatabaseHealth(): Promise<ServiceHealth> {
    const startTime = Date.now()
    
    try {
      const dbPool = getDatabasePool()
      const health = await dbPool.getHealth()
      const responseTime = Date.now() - startTime

      if (!health.healthy) {
        return {
          status: 'unhealthy',
          responseTime,
          lastCheck: new Date().toISOString(),
          error: 'Database connection failed',
          details: health
        }
      }

      // Check for performance issues
      if (health.performance.avgQueryTime > 1000) {
        return {
          status: 'degraded',
          responseTime,
          lastCheck: new Date().toISOString(),
          error: 'Slow database performance',
          details: health
        }
      }

      return {
        status: 'healthy',
        responseTime,
        lastCheck: new Date().toISOString(),
        details: health
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown database error'
      }
    }
  }

  /**
   * Check error handler health
   */
  private async checkErrorHandlerHealth(): Promise<ServiceHealth> {
    const startTime = Date.now()
    
    try {
      const errorHandler = ErrorHandler.getInstance()
      const metrics = errorHandler.getErrorMetrics()
      const responseTime = Date.now() - startTime

      // Check error rates
      const totalErrors = Object.values(metrics).reduce((sum, count) => sum + count, 0)
      const criticalErrors = metrics['security_critical'] || 0

      if (criticalErrors > 0) {
        return {
          status: 'unhealthy',
          responseTime,
          lastCheck: new Date().toISOString(),
          error: `${criticalErrors} critical errors detected`,
          details: metrics
        }
      }

      if (totalErrors > 50) {
        return {
          status: 'degraded',
          responseTime,
          lastCheck: new Date().toISOString(),
          error: `High error rate: ${totalErrors} errors`,
          details: metrics
        }
      }

      return {
        status: 'healthy',
        responseTime,
        lastCheck: new Date().toISOString(),
        details: metrics
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Error handler check failed'
      }
    }
  }

  /**
   * Check logger health
   */
  private async checkLoggerHealth(): Promise<ServiceHealth> {
    const startTime = Date.now()
    
    try {
      // Test logger by creating a test log entry
      authLogger.logAuthEvent({
        type: 'health_check',
        success: true,
        timestamp: new Date(),
        metadata: { test: true }
      })

      const responseTime = Date.now() - startTime

      return {
        status: 'healthy',
        responseTime,
        lastCheck: new Date().toISOString()
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Logger check failed'
      }
    }
  }

  /**
   * Check memory health
   */
  private async checkMemoryHealth(): Promise<ServiceHealth> {
    const startTime = Date.now()
    
    try {
      const memoryUsage = process.memoryUsage()
      const responseTime = Date.now() - startTime

      // Check memory usage (in MB)
      const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024
      const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024
      const memoryUtilization = heapUsedMB / heapTotalMB

      if (memoryUtilization > 0.9) {
        return {
          status: 'unhealthy',
          responseTime,
          lastCheck: new Date().toISOString(),
          error: `High memory usage: ${memoryUtilization.toFixed(2)}%`,
          details: {
            heapUsedMB: Math.round(heapUsedMB),
            heapTotalMB: Math.round(heapTotalMB),
            utilization: memoryUtilization
          }
        }
      }

      if (memoryUtilization > 0.7) {
        return {
          status: 'degraded',
          responseTime,
          lastCheck: new Date().toISOString(),
          error: `Elevated memory usage: ${memoryUtilization.toFixed(2)}%`,
          details: {
            heapUsedMB: Math.round(heapUsedMB),
            heapTotalMB: Math.round(heapTotalMB),
            utilization: memoryUtilization
          }
        }
      }

      return {
        status: 'healthy',
        responseTime,
        lastCheck: new Date().toISOString(),
        details: {
          heapUsedMB: Math.round(heapUsedMB),
          heapTotalMB: Math.round(heapTotalMB),
          utilization: memoryUtilization
        }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Memory check failed'
      }
    }
  }

  /**
   * Check process health
   */
  private async checkProcessHealth(): Promise<ServiceHealth> {
    const startTime = Date.now()
    
    try {
      const uptime = process.uptime()
      const responseTime = Date.now() - startTime

      // Check if process has been running for a reasonable time
      if (uptime < 10) {
        return {
          status: 'degraded',
          responseTime,
          lastCheck: new Date().toISOString(),
          error: 'Process recently started',
          details: { uptime }
        }
      }

      return {
        status: 'healthy',
        responseTime,
        lastCheck: new Date().toISOString(),
        details: { uptime }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Process check failed'
      }
    }
  }

  /**
   * Get service result from Promise.allSettled
   */
  private getServiceResult(
    result: PromiseSettledResult<ServiceHealth>,
    serviceName: string
  ): ServiceHealth {
    if (result.status === 'fulfilled') {
      return result.value
    }

    return {
      status: 'unhealthy',
      lastCheck: new Date().toISOString(),
      error: `Health check failed for ${serviceName}: ${result.reason}`
    }
  }

  /**
   * Calculate overall status from service statuses
   */
  private calculateOverallStatus(services: Record<string, ServiceHealth>): 'healthy' | 'degraded' | 'unhealthy' {
    const statuses = Object.values(services).map(service => service.status)
    
    if (statuses.some(status => status === 'unhealthy')) {
      return 'unhealthy'
    }
    
    if (statuses.some(status => status === 'degraded')) {
      return 'degraded'
    }
    
    return 'healthy'
  }

  /**
   * Update alerts based on health check results
   */
  private updateAlerts(
    services: Record<string, ServiceHealth>,
    metrics: { errorRates: Record<string, number>; responseTime: number; memoryUsage: NodeJS.MemoryUsage }
  ): void {
    const now = new Date().toISOString()

    // Check for service alerts
    Object.entries(services).forEach(([serviceName, service]) => {
      if (service.status === 'unhealthy') {
        this.addAlert({
          severity: 'high',
          message: `Service ${serviceName} is unhealthy: ${service.error}`,
          timestamp: now,
          service: serviceName,
          details: service.details
        })
      } else if (service.status === 'degraded') {
        this.addAlert({
          severity: 'medium',
          message: `Service ${serviceName} is degraded: ${service.error}`,
          timestamp: now,
          service: serviceName,
          details: service.details
        })
      }
    })

    // Check for performance alerts
    if (metrics.responseTime > 5000) {
      this.addAlert({
        severity: 'high',
        message: `Slow health check response: ${metrics.responseTime}ms`,
        timestamp: now,
        service: 'health_monitor',
        details: { responseTime: metrics.responseTime }
      })
    }

    // Check for high error rates
    const totalErrors = Object.values(metrics.errorRates).reduce((sum, count) => sum + count, 0)
    if (totalErrors > 100) {
      this.addAlert({
        severity: 'critical',
        message: `High error rate: ${totalErrors} errors`,
        timestamp: now,
        service: 'error_handler',
        details: metrics.errorRates
      })
    }
  }

  /**
   * Add alert to the alerts list
   */
  private addAlert(alert: HealthAlert): void {
    this.alerts.unshift(alert)
    
    // Keep only the most recent alerts
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(0, this.maxAlerts)
    }
  }

  /**
   * Get recent alerts
   */
  private getRecentAlerts(limit: number = 10): HealthAlert[] {
    return this.alerts.slice(0, limit)
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: 'low' | 'medium' | 'high' | 'critical'): HealthAlert[] {
    return this.alerts.filter(alert => alert.severity === severity)
  }

  /**
   * Clear all alerts
   */
  clearAlerts(): void {
    this.alerts = []
  }

  /**
   * Get system metrics
   */
  getSystemMetrics(): {
    memory: NodeJS.MemoryUsage
    uptime: number
    version: string
    platform: string
    nodeVersion: string
  } {
    return {
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      platform: process.platform,
      nodeVersion: process.version
    }
  }
}

/**
 * Default health monitor instance
 */
export const healthMonitor = HealthMonitor.getInstance()

/**
 * Express middleware for health check endpoint
 */
export async function healthCheckMiddleware(): Promise<{
  status: number
  body: HealthStatus
}> {
  try {
    const healthStatus = await healthMonitor.checkHealth()
    
    // Return appropriate HTTP status code
    const statusCode = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'degraded' ? 200 : 503
    
    return {
      status: statusCode,
      body: healthStatus
    }
  } catch (error) {
    return {
      status: 503,
      body: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
        services: {
          database: { status: 'unhealthy', lastCheck: new Date().toISOString(), error: 'Health check failed' },
          errorHandler: { status: 'unhealthy', lastCheck: new Date().toISOString(), error: 'Health check failed' },
          logger: { status: 'unhealthy', lastCheck: new Date().toISOString(), error: 'Health check failed' },
          memory: { status: 'unhealthy', lastCheck: new Date().toISOString(), error: 'Health check failed' },
          process: { status: 'unhealthy', lastCheck: new Date().toISOString(), error: 'Health check failed' }
        },
        metrics: {
          errorRates: {},
          responseTime: 0,
          memoryUsage: process.memoryUsage()
        },
        alerts: [{
          severity: 'critical',
          message: 'Health check system failure',
          timestamp: new Date().toISOString(),
          service: 'health_monitor',
          details: { error: error instanceof Error ? error.message : String(error) }
        }]
      }
    }
  }
}