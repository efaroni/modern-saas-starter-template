import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { authLogger } from '@/lib/auth/logger'
import { getCorrelationId } from '@/lib/middleware/correlation-id'
import { createErrorResponse, ApiError } from '@/lib/utils/api-response'

/**
 * Error classification for better handling and monitoring
 */
export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  RATE_LIMIT = 'rate_limit',
  DATABASE = 'database',
  EXTERNAL_SERVICE = 'external_service',
  INTERNAL = 'internal',
  BUSINESS_LOGIC = 'business_logic',
  SECURITY = 'security'
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Structured error interface
 */
export interface StructuredError extends Error {
  category: ErrorCategory
  severity: ErrorSeverity
  correlationId?: string
  userId?: string
  context?: Record<string, unknown>
  isOperational?: boolean
  statusCode?: number
  shouldRetry?: boolean
  retryAfter?: number
}

/**
 * Custom error class for application errors
 */
export class AppError extends Error implements StructuredError {
  public readonly category: ErrorCategory
  public readonly severity: ErrorSeverity
  public readonly correlationId?: string
  public readonly userId?: string
  public readonly context?: Record<string, unknown>
  public readonly isOperational: boolean = true
  public readonly statusCode: number
  public readonly shouldRetry: boolean
  public readonly retryAfter?: number

  constructor(
    message: string,
    category: ErrorCategory,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    statusCode: number = 500,
    options: {
      correlationId?: string
      userId?: string
      context?: Record<string, unknown>
      shouldRetry?: boolean
      retryAfter?: number
      cause?: Error
    } = {}
  ) {
    super(message)
    this.name = 'AppError'
    this.category = category
    this.severity = severity
    this.correlationId = options.correlationId
    this.userId = options.userId
    this.context = options.context
    this.statusCode = statusCode
    this.shouldRetry = options.shouldRetry || false
    this.retryAfter = options.retryAfter
    
    if (options.cause) {
      this.cause = options.cause
    }
    
    // Maintain stack trace
    Error.captureStackTrace(this, AppError)
  }
}

/**
 * Pre-configured error factory functions
 */
export const ErrorFactory = {
  validation: (message: string, context?: Record<string, unknown>): AppError =>
    new AppError(message, ErrorCategory.VALIDATION, ErrorSeverity.LOW, 400, { context }),

  authentication: (message: string, context?: Record<string, unknown>): AppError =>
    new AppError(message, ErrorCategory.AUTHENTICATION, ErrorSeverity.MEDIUM, 401, { context }),

  authorization: (message: string, context?: Record<string, unknown>): AppError =>
    new AppError(message, ErrorCategory.AUTHORIZATION, ErrorSeverity.MEDIUM, 403, { context }),

  notFound: (resource: string, context?: Record<string, unknown>): AppError =>
    new AppError(`${resource} not found`, ErrorCategory.NOT_FOUND, ErrorSeverity.LOW, 404, { context }),

  rateLimit: (message: string, retryAfter?: number, context?: Record<string, unknown>): AppError =>
    new AppError(message, ErrorCategory.RATE_LIMIT, ErrorSeverity.MEDIUM, 429, { retryAfter, context }),

  database: (message: string, shouldRetry: boolean = true, context?: Record<string, unknown>): AppError =>
    new AppError(message, ErrorCategory.DATABASE, ErrorSeverity.HIGH, 500, { shouldRetry, context }),

  externalService: (service: string, shouldRetry: boolean = true, context?: Record<string, unknown>): AppError =>
    new AppError(`External service ${service} unavailable`, ErrorCategory.EXTERNAL_SERVICE, ErrorSeverity.HIGH, 503, { shouldRetry, context }),

  security: (message: string, context?: Record<string, unknown>): AppError =>
    new AppError(message, ErrorCategory.SECURITY, ErrorSeverity.CRITICAL, 403, { context }),

  internal: (message: string, cause?: Error, context?: Record<string, unknown>): AppError =>
    new AppError(message, ErrorCategory.INTERNAL, ErrorSeverity.CRITICAL, 500, { cause, context })
}

/**
 * Error handler middleware for API routes
 */
export class ErrorHandler {
  private static instance: ErrorHandler
  private errorCounts: Map<string, number> = new Map()
  private readonly maxErrorsPerMinute = 100

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler()
    }
    return ErrorHandler.instance
  }

  /**
   * Handle errors in API routes
   */
  async handleError(
    error: unknown,
    request: NextRequest,
    context: {
      userId?: string
      endpoint?: string
      method?: string
    } = {}
  ): Promise<NextResponse<ApiError>> {
    const correlationId = getCorrelationId(request)
    const structuredError = this.normalizeError(error, correlationId, context)

    // Log the error
    await this.logError(structuredError, request, context)

    // Update error metrics
    this.updateErrorMetrics(structuredError)

    // Check if we should alert
    if (this.shouldAlert(structuredError)) {
      await this.sendAlert(structuredError, request, context)
    }

    // Return appropriate response
    return this.createErrorResponse(structuredError)
  }

  /**
   * Normalize any error into a structured error
   */
  private normalizeError(
    error: unknown,
    correlationId: string,
    context: { userId?: string; endpoint?: string; method?: string }
  ): StructuredError {
    // If it's already a structured error, add correlation ID
    if (error instanceof AppError) {
      return {
        ...error,
        correlationId: error.correlationId || correlationId,
        context: { ...error.context, ...context }
      }
    }

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return new AppError(
        `Validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
        ErrorCategory.VALIDATION,
        ErrorSeverity.LOW,
        400,
        { correlationId, context: { ...context, validationErrors: error.errors } }
      )
    }

    // Handle standard JavaScript errors
    if (error instanceof Error) {
      // Check if it's a known error type
      if (error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
        return new AppError(
          'External service unavailable',
          ErrorCategory.EXTERNAL_SERVICE,
          ErrorSeverity.HIGH,
          503,
          { correlationId, context, cause: error, shouldRetry: true }
        )
      }

      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        return new AppError(
          'Resource already exists',
          ErrorCategory.BUSINESS_LOGIC,
          ErrorSeverity.LOW,
          409,
          { correlationId, context, cause: error }
        )
      }

      if (error.message.includes('connection') || error.message.includes('database')) {
        return new AppError(
          'Database operation failed',
          ErrorCategory.DATABASE,
          ErrorSeverity.HIGH,
          500,
          { correlationId, context, cause: error, shouldRetry: true }
        )
      }

      // Generic error
      return new AppError(
        'Internal server error',
        ErrorCategory.INTERNAL,
        ErrorSeverity.MEDIUM,
        500,
        { correlationId, context, cause: error }
      )
    }

    // Unknown error type
    return new AppError(
      'Unknown error occurred',
      ErrorCategory.INTERNAL,
      ErrorSeverity.HIGH,
      500,
      { correlationId, context: { ...context, originalError: String(error) } }
    )
  }

  /**
   * Log structured error
   */
  private async logError(
    error: StructuredError,
    request: NextRequest,
    context: { userId?: string; endpoint?: string; method?: string }
  ): Promise<void> {
    const logData = {
      error: {
        message: error.message,
        category: error.category,
        severity: error.severity,
        correlationId: error.correlationId,
        statusCode: error.statusCode,
        stack: error.stack,
        shouldRetry: error.shouldRetry,
        retryAfter: error.retryAfter
      },
      request: {
        method: request.method,
        url: request.url,
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
      },
      context,
      timestamp: new Date().toISOString()
    }

    // Use the existing auth logger for consistency
    authLogger.logSecurityEvent({
      type: 'error',
      email: context.userId,
      ipAddress: logData.request.ip,
      userAgent: logData.request.userAgent,
      severity: error.severity,
      details: logData,
      timestamp: new Date(),
      actionTaken: 'error_logged'
    })
  }

  /**
   * Update error metrics
   */
  private updateErrorMetrics(error: StructuredError): void {
    const key = `${error.category}_${error.severity}`
    const current = this.errorCounts.get(key) || 0
    this.errorCounts.set(key, current + 1)
    
    // Reset counters every minute
    setTimeout(() => {
      this.errorCounts.set(key, Math.max(0, (this.errorCounts.get(key) || 0) - 1))
    }, 60000)
  }

  /**
   * Determine if we should send an alert
   */
  private shouldAlert(error: StructuredError): boolean {
    // Always alert on critical errors
    if (error.severity === ErrorSeverity.CRITICAL) {
      return true
    }

    // Alert on security errors
    if (error.category === ErrorCategory.SECURITY) {
      return true
    }

    // Alert on high error rates
    const key = `${error.category}_${error.severity}`
    const count = this.errorCounts.get(key) || 0
    return count > this.maxErrorsPerMinute
  }

  /**
   * Send alert for critical errors
   */
  private async sendAlert(
    error: StructuredError,
    request: NextRequest,
    context: { userId?: string; endpoint?: string; method?: string }
  ): Promise<void> {
    // In production, this would send to monitoring service
    console.error('🚨 CRITICAL ERROR ALERT:', {
      error: error.message,
      category: error.category,
      severity: error.severity,
      correlationId: error.correlationId,
      endpoint: context.endpoint,
      userId: context.userId,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Create error response
   */
  private createErrorResponse(error: StructuredError): NextResponse<ApiError> {
    // Don't expose internal error details in production
    const message = error.isOperational ? error.message : 'Internal server error'
    
    const response = createErrorResponse(message, error.statusCode, {
      category: error.category,
      correlationId: error.correlationId,
      ...(error.shouldRetry && { retryAfter: error.retryAfter })
    })

    // Add retry headers if applicable
    if (error.shouldRetry && error.retryAfter) {
      response.headers.set('Retry-After', error.retryAfter.toString())
    }

    return response
  }

  /**
   * Get error metrics
   */
  getErrorMetrics(): Record<string, number> {
    return Object.fromEntries(this.errorCounts)
  }
}

/**
 * Convenience wrapper for handling errors in API routes
 */
export async function withErrorHandling<T>(
  request: NextRequest,
  handler: () => Promise<T>,
  context: {
    userId?: string
    endpoint?: string
    method?: string
  } = {}
): Promise<T | NextResponse<ApiError>> {
  try {
    return await handler()
  } catch (error) {
    const errorHandler = ErrorHandler.getInstance()
    return await errorHandler.handleError(error, request, context)
  }
}

/**
 * Throw validation error
 */
export function throwValidationError(message: string, field?: string): never {
  throw ErrorFactory.validation(message, field ? { field } : undefined)
}

/**
 * Throw authentication error
 */
export function throwAuthenticationError(message: string = 'Authentication required'): never {
  throw ErrorFactory.authentication(message)
}

/**
 * Throw authorization error
 */
export function throwAuthorizationError(message: string = 'Access denied'): never {
  throw ErrorFactory.authorization(message)
}

/**
 * Throw not found error
 */
export function throwNotFoundError(resource: string): never {
  throw ErrorFactory.notFound(resource)
}

/**
 * Assert condition or throw error
 */
export function assert(condition: boolean, error: AppError): asserts condition {
  if (!condition) {
    throw error
  }
}

/**
 * Wrap async function with error handling
 */
export function withErrorContext<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context: { operation: string; userId?: string }
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args)
    } catch (error) {
      if (error instanceof AppError) {
        error.context = { ...error.context, ...context }
      }
      throw error
    }
  }
}