export interface AuthEvent {
  type:
    | 'login'
    | 'signup'
    | 'logout'
    | 'password_change'
    | 'password_reset'
    | 'email_verification'
    | 'oauth_login'
    | 'account_locked'
    | 'suspicious_activity';
  userId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
  duration?: number; // in milliseconds
  sessionId?: string;
}

export interface SecurityEvent {
  type:
    | 'brute_force'
    | 'account_takeover'
    | 'unusual_location'
    | 'multiple_failed_attempts'
    | 'password_breach'
    | 'suspicious_oauth';
  userId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, unknown>;
  timestamp: Date;
  actionTaken?: string;
}

export interface PerformanceMetric {
  operation: string;
  duration: number;
  success: boolean;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  logAuthEvent(event: AuthEvent): void;
  logSecurityEvent(event: SecurityEvent): void;
  logPerformanceMetric(metric: PerformanceMetric): void;
  log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void;
}

export class AuthLogger implements Logger {
  private logLevel: LogLevel;
  private isDevelopment: boolean;

  constructor(logLevel: LogLevel = 'info') {
    this.logLevel = logLevel;
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  logAuthEvent(event: AuthEvent): void {
    const logData = {
      category: 'auth',
      type: event.type,
      userId: event.userId,
      email: this.maskEmail(event.email),
      ipAddress: this.maskIp(event.ipAddress),
      userAgent: event.userAgent,
      success: event.success,
      error: event.error,
      duration: event.duration,
      sessionId: event.sessionId,
      metadata: event.metadata,
      timestamp: event.timestamp.toISOString(),
    };

    if (event.success) {
      this.log('info', `Auth ${event.type} successful`, logData);
    } else {
      this.log('warn', `Auth ${event.type} failed: ${event.error}`, logData);
    }

    // Log to external monitoring service in production
    if (!this.isDevelopment) {
      this.sendToMonitoring('auth_event', logData);
    }
  }

  logSecurityEvent(event: SecurityEvent): void {
    const logData = {
      category: 'security',
      type: event.type,
      userId: event.userId,
      email: this.maskEmail(event.email),
      ipAddress: this.maskIp(event.ipAddress),
      userAgent: event.userAgent,
      severity: event.severity,
      details: event.details,
      actionTaken: event.actionTaken,
      timestamp: event.timestamp.toISOString(),
    };

    const logLevel = this.getLogLevelForSeverity(event.severity);
    this.log(logLevel, `Security event: ${event.type}`, logData);

    // Always send security events to monitoring
    this.sendToMonitoring('security_event', logData);

    // Send high/critical security events to alerts
    if (event.severity === 'high' || event.severity === 'critical') {
      this.sendAlert('security', logData);
    }
  }

  logPerformanceMetric(metric: PerformanceMetric): void {
    const logData = {
      category: 'performance',
      operation: metric.operation,
      duration: metric.duration,
      success: metric.success,
      metadata: metric.metadata,
      timestamp: metric.timestamp.toISOString(),
    };

    // Log slow operations
    const slowThreshold = 1000; // 1 second
    if (metric.duration > slowThreshold) {
      this.log(
        'warn',
        `Slow operation: ${metric.operation} took ${metric.duration}ms`,
        logData,
      );
    } else {
      this.log(
        'debug',
        `Operation: ${metric.operation} completed in ${metric.duration}ms`,
        logData,
      );
    }

    // Send metrics to monitoring
    if (!this.isDevelopment) {
      this.sendToMonitoring('performance_metric', logData);
    }
  }

  log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...metadata,
    };

    // Console output with colors in development
    if (this.isDevelopment) {
      this.logToConsole(level, message, logEntry);
    } else {
      // Structured JSON logging in production
      console.log(JSON.stringify(logEntry));
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private logToConsole(level: LogLevel, message: string, data: unknown): void {
    const colors = {
      debug: '\x1b[36m', // cyan
      info: '\x1b[32m', // green
      warn: '\x1b[33m', // yellow
      error: '\x1b[31m', // red
    };
    const reset = '\x1b[0m';

    const color = colors[level] || '';
    const timestamp = new Date().toISOString();

    console.log(
      `${color}[${timestamp}] ${level.toUpperCase()}: ${message}${reset}`,
    );
    if (data && Object.keys(data).length > 3) {
      // Only log extra data if it's substantial
      console.log(`${color}${JSON.stringify(data, null, 2)}${reset}`);
    }
  }

  private getLogLevelForSeverity(
    severity: SecurityEvent['severity'],
  ): LogLevel {
    switch (severity) {
      case 'low':
        return 'info';
      case 'medium':
        return 'warn';
      case 'high':
        return 'error';
      case 'critical':
        return 'error';
      default:
        return 'info';
    }
  }

  private maskEmail(email?: string): string | undefined {
    if (!email) return undefined;
    const [username, domain] = email.split('@');
    if (username.length <= 2) return email;
    return `${username[0]}***${username[username.length - 1]}@${domain}`;
  }

  private maskIp(ip?: string): string | undefined {
    if (!ip) return undefined;
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.xxx.xxx`;
    }
    return ip;
  }

  private sendToMonitoring(eventType: string, data: unknown): void {
    // In a real implementation, this would send to services like:
    // - DataDog
    // - New Relic
    // - CloudWatch
    // - Grafana
    // For now, we'll just log it
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[MONITORING] ${eventType}:`, JSON.stringify(data));
    }
  }

  private sendAlert(alertType: string, data: unknown): void {
    // In a real implementation, this would send to:
    // - Slack
    // - PagerDuty
    // - Email alerts
    // - SMS alerts
    console.error(`[ALERT] ${alertType}:`, JSON.stringify(data));
  }
}

// Create default logger instance
export const authLogger = new AuthLogger(
  (process.env.LOG_LEVEL as LogLevel) || 'info',
);

// Utility function to time operations
export function timeOperation<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>,
): Promise<T> {
  const start = Date.now();

  return fn().then(
    result => {
      const duration = Date.now() - start;
      authLogger.logPerformanceMetric({
        operation,
        duration,
        success: true,
        metadata,
        timestamp: new Date(),
      });
      return result;
    },
    error => {
      const duration = Date.now() - start;
      authLogger.logPerformanceMetric({
        operation,
        duration,
        success: false,
        metadata: { ...metadata, error: error.message },
        timestamp: new Date(),
      });
      throw error;
    },
  );
}
