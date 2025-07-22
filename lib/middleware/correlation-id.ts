import { type NextRequest, NextResponse } from 'next/server';

import { generateSecureToken, TokenSecurityLevel } from '@/lib/utils/token-generator';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

/**
 * Middleware to ensure every request has a correlation ID
 */
export function withCorrelationId(request: NextRequest): NextResponse {
  const correlationId = request.headers.get(CORRELATION_ID_HEADER) ||
    generateSecureToken(TokenSecurityLevel.MEDIUM, {
      prefix: 'req',
      length: 16,
    });

  // Clone the request headers and add correlation ID
  const response = NextResponse.next();
  response.headers.set(CORRELATION_ID_HEADER, correlationId);

  return response;
}

/**
 * Extract correlation ID from request
 */
export function getCorrelationId(request: NextRequest): string {
  return request.headers.get(CORRELATION_ID_HEADER) ||
    generateSecureToken(TokenSecurityLevel.MEDIUM, {
      prefix: 'req',
      length: 16,
    });
}

/**
 * Add correlation ID to response headers
 */
export function addCorrelationIdToResponse(
  response: NextResponse,
  correlationId: string,
): NextResponse {
  response.headers.set(CORRELATION_ID_HEADER, correlationId);
  return response;
}

/**
 * Context manager for correlation ID
 */
export class CorrelationContext {
  private static instance: CorrelationContext;
  private contexts: Map<string, string> = new Map();

  static getInstance(): CorrelationContext {
    if (!CorrelationContext.instance) {
      CorrelationContext.instance = new CorrelationContext();
    }
    return CorrelationContext.instance;
  }

  setCorrelationId(requestId: string, correlationId: string): void {
    this.contexts.set(requestId, correlationId);
  }

  getCorrelationId(requestId: string): string | undefined {
    return this.contexts.get(requestId);
  }

  clearCorrelationId(requestId: string): void {
    this.contexts.delete(requestId);
  }
}

/**
 * Async local storage for correlation ID (Node.js 12+)
 */
export class AsyncCorrelationStorage {
  private static storage: Map<string, string> = new Map();

  static set(correlationId: string): void {
    // Use process.env to simulate async local storage
    process.env.CORRELATION_ID = correlationId;
  }

  static get(): string | undefined {
    return process.env.CORRELATION_ID;
  }

  static clear(): void {
    delete process.env.CORRELATION_ID;
  }
}

/**
 * Wrapper function to execute code with correlation ID context
 */
export async function withCorrelationIdContext<T>(
  correlationId: string,
  fn: () => Promise<T>,
): Promise<T> {
  AsyncCorrelationStorage.set(correlationId);
  try {
    return await fn();
  } finally {
    AsyncCorrelationStorage.clear();
  }
}

/**
 * Helper to generate request-specific correlation ID
 */
export function generateRequestCorrelationId(
  method: string,
  path: string,
  timestamp: number = Date.now(),
): string {
  const shortPath = path.split('/').pop() || 'unknown';
  const timeHex = timestamp.toString(16).slice(-8);
  const random = generateSecureToken(TokenSecurityLevel.LOW, { length: 8 });

  return `req_${method.toLowerCase()}_${shortPath}_${timeHex}_${random}`;
}