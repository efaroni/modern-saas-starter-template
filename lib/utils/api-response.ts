import { NextResponse } from 'next/server';

import { ZodError } from 'zod';

/**
 * Standard API response types
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface ApiError {
  success: false;
  error: string;
  message?: string;
  timestamp: string;
  details?: unknown;
}

export interface ApiSuccess<T = unknown> {
  success: true;
  data?: T;
  message?: string;
  timestamp: string;
}

/**
 * Creates a standardized success response
 */
export function createSuccessResponse<T = unknown>(
  data?: T,
  message?: string,
  status: number = 200,
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    },
    { status },
  );
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  error: string,
  status: number = 400,
  details?: unknown,
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      success: false,
      error,
      timestamp: new Date().toISOString(),
      ...(details && { details }),
    },
    { status },
  );
}

/**
 * Handles validation errors from Zod schemas
 */
export function handleValidationError(error: ZodError): NextResponse<ApiError> {
  const firstError = error.errors[0];
  const errorMessage = firstError
    ? `${firstError.path.join('.')} ${firstError.message}`.trim()
    : 'Validation failed';

  return createErrorResponse(errorMessage, 400, {
    validationErrors: error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
    })),
  });
}

/**
 * Handles database errors with appropriate responses
 */
export function handleDatabaseError(error: unknown): NextResponse<ApiError> {
  console.error('Database error:', error);

  // Don't expose internal database errors to clients
  return createErrorResponse('Internal server error', 500);
}

/**
 * Handles authentication errors
 */
export function handleAuthError(error: string): NextResponse<ApiError> {
  return createErrorResponse(error, 401);
}

/**
 * Handles authorization errors
 */
export function handleAuthorizationError(
  error: string = 'Access denied',
): NextResponse<ApiError> {
  return createErrorResponse(error, 403);
}

/**
 * Handles not found errors
 */
export function handleNotFoundError(
  resource: string = 'Resource',
): NextResponse<ApiError> {
  return createErrorResponse(`${resource} not found`, 404);
}

/**
 * Handles rate limiting errors
 */
export function handleRateLimitError(
  message: string = 'Too many requests',
): NextResponse<ApiError> {
  return createErrorResponse(message, 429);
}

/**
 * Standard error handler for API routes
 */
export function handleApiError(error: unknown): NextResponse<ApiError> {
  console.error('API error:', error);

  // Handle known error types
  if (error instanceof ZodError) {
    return handleValidationError(error);
  }

  // Handle custom errors with status codes
  if (error instanceof Error) {
    const errorObj = error as Error & { status?: number };

    if (errorObj.status === 401) {
      return handleAuthError(errorObj.message);
    }

    if (errorObj.status === 403) {
      return handleAuthorizationError(errorObj.message);
    }

    if (errorObj.status === 404) {
      return handleNotFoundError(errorObj.message);
    }

    if (errorObj.status === 429) {
      return handleRateLimitError(errorObj.message);
    }

    // Handle client errors (4xx)
    if (errorObj.status && errorObj.status >= 400 && errorObj.status < 500) {
      return createErrorResponse(errorObj.message, errorObj.status);
    }
  }

  // Default to internal server error
  return createErrorResponse('Internal server error', 500);
}

/**
 * Creates a paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  },
  message?: string,
): NextResponse<
  ApiSuccess<{
    items: T[];
    pagination: typeof pagination;
  }>
> {
  return createSuccessResponse(
    {
      items: data,
      pagination,
    },
    message,
  );
}

/**
 * Wraps an async API handler with standard error handling
 */
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<NextResponse<ApiSuccess<R>>>,
) {
  return async (
    ...args: T
  ): Promise<NextResponse<ApiSuccess<R> | ApiError>> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

/**
 * Creates a response for empty results
 */
export function createEmptyResponse(
  message: string = 'No results found',
): NextResponse<ApiSuccess<null>> {
  return createSuccessResponse(null, message, 200);
}

/**
 * Creates a response for created resources
 */
export function createCreatedResponse<T>(
  data: T,
  message: string = 'Resource created successfully',
): NextResponse<ApiSuccess<T>> {
  return createSuccessResponse(data, message, 201);
}

/**
 * Creates a response for updated resources
 */
export function createUpdatedResponse<T>(
  data: T,
  message: string = 'Resource updated successfully',
): NextResponse<ApiSuccess<T>> {
  return createSuccessResponse(data, message, 200);
}

/**
 * Creates a response for deleted resources
 */
export function createDeletedResponse(
  message: string = 'Resource deleted successfully',
): NextResponse<ApiSuccess<null>> {
  return createSuccessResponse(null, message, 200);
}

/**
 * Validates request method
 */
export function validateMethod(
  request: Request,
  allowedMethods: string[],
): NextResponse<ApiError> | null {
  if (!allowedMethods.includes(request.method)) {
    return createErrorResponse(`Method ${request.method} not allowed`, 405);
  }
  return null;
}

/**
 * Validates required headers
 */
export function validateHeaders(
  request: Request,
  requiredHeaders: string[],
): NextResponse<ApiError> | null {
  for (const header of requiredHeaders) {
    if (!request.headers.get(header)) {
      return createErrorResponse(`Missing required header: ${header}`, 400);
    }
  }
  return null;
}

/**
 * Extracts and validates JSON body
 */
export async function validateJsonBody<T>(
  request: Request,
  schema?: (data: unknown) => T,
): Promise<T | NextResponse<ApiError>> {
  try {
    const body = await request.json();

    if (schema) {
      return schema(body);
    }

    return body as T;
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error);
    }

    return createErrorResponse('Invalid JSON body', 400);
  }
}
