import { z } from 'zod';

import { ErrorFactory } from '@/lib/utils/error-handler';
import { validateEmail, validateUUID } from '@/lib/utils/validators';

/**
 * HTML sanitization utilities
 */
export const htmlSanitizer = {
  /**
   * Remove all HTML tags from string
   */
  stripHtml: (input: string): string => {
    return input.replace(/<[^>]*>/g, '');
  },

  /**
   * Escape HTML special characters
   */
  escapeHtml: (input: string): string => {
    const escapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };
    return input.replace(/[&<>"'/]/g, char => escapeMap[char] || char);
  },

  /**
   * Allow only specific HTML tags
   */
  allowTags: (input: string, allowedTags: string[] = []): string => {
    const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/gi;
    return input.replace(tagRegex, (match, tagName) => {
      return allowedTags.includes(tagName.toLowerCase()) ? match : '';
    });
  },
};

/**
 * SQL injection prevention utilities
 */
export const sqlSanitizer = {
  /**
   * Escape SQL special characters
   */
  escapeSql: (input: string): string => {
    return input.replace(/['";\\]/g, char => '\\' + char);
  },

  /**
   * Validate SQL identifier (table/column names)
   */
  validateIdentifier: (input: string): boolean => {
    const identifierRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    return identifierRegex.test(input);
  },
};

/**
 * XSS prevention utilities
 */
export const xssSanitizer = {
  /**
   * Remove JavaScript event handlers
   */
  removeEventHandlers: (input: string): string => {
    return input.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  },

  /**
   * Remove javascript: URLs
   */
  removeJavaScriptUrls: (input: string): string => {
    return input.replace(/javascript:/gi, '');
  },

  /**
   * Remove data: URLs that could contain JavaScript
   */
  removeDataUrls: (input: string): string => {
    return input.replace(/data:text\/html[^"']*/gi, '');
  },

  /**
   * Comprehensive XSS sanitization
   */
  sanitize: (input: string): string => {
    let sanitized = input;
    sanitized = xssSanitizer.removeEventHandlers(sanitized);
    sanitized = xssSanitizer.removeJavaScriptUrls(sanitized);
    sanitized = xssSanitizer.removeDataUrls(sanitized);
    sanitized = htmlSanitizer.escapeHtml(sanitized);
    return sanitized;
  },
};

/**
 * Input length and content validation
 */
export const contentValidator = {
  /**
   * Check if string contains only allowed characters
   */
  allowedChars: (input: string, pattern: RegExp): boolean => {
    return pattern.test(input);
  },

  /**
   * Check string length bounds
   */
  lengthBounds: (input: string, min: number, max: number): boolean => {
    return input.length >= min && input.length <= max;
  },

  /**
   * Check for suspicious patterns
   */
  suspiciousPatterns: (input: string): string[] => {
    const patterns = [
      {
        name: 'sql_injection',
        regex:
          /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
      },
      { name: 'xss_script', regex: /<script[^>]*>.*?<\/script>/gi },
      { name: 'xss_javascript', regex: /javascript:/gi },
      { name: 'path_traversal', regex: /\.\.[\/\\]/g },
      { name: 'command_injection', regex: /[;&|`$(){}[\]]/g },
    ];

    return patterns
      .filter(pattern => pattern.regex.test(input))
      .map(pattern => pattern.name);
  },
};

/**
 * Comprehensive input sanitization class
 */
export class InputSanitizer {
  private maxStringLength: number = 10000;
  private maxArrayLength: number = 1000;
  private maxDepth: number = 10;

  constructor(
    options: {
      maxStringLength?: number;
      maxArrayLength?: number;
      maxDepth?: number;
    } = {},
  ) {
    this.maxStringLength = options.maxStringLength || 10000;
    this.maxArrayLength = options.maxArrayLength || 1000;
    this.maxDepth = options.maxDepth || 10;
  }

  /**
   * Sanitize string input
   */
  sanitizeString(
    input: string,
    options: {
      stripHtml?: boolean;
      escapeHtml?: boolean;
      maxLength?: number;
      allowedPattern?: RegExp;
      preventXss?: boolean;
    } = {},
  ): string {
    if (typeof input !== 'string') {
      throw ErrorFactory.validation('Input must be a string');
    }

    const maxLength = options.maxLength || this.maxStringLength;
    if (input.length > maxLength) {
      throw ErrorFactory.validation(
        `Input too long (max ${maxLength} characters)`,
      );
    }

    let sanitized = input.trim();

    // Check for suspicious patterns
    const suspiciousPatterns = contentValidator.suspiciousPatterns(sanitized);
    if (suspiciousPatterns.length > 0) {
      throw ErrorFactory.security(
        `Suspicious patterns detected: ${suspiciousPatterns.join(', ')}`,
      );
    }

    // Apply sanitization
    if (options.stripHtml) {
      sanitized = htmlSanitizer.stripHtml(sanitized);
    }

    if (options.preventXss) {
      sanitized = xssSanitizer.sanitize(sanitized);
    } else if (options.escapeHtml) {
      sanitized = htmlSanitizer.escapeHtml(sanitized);
    }

    // Validate against allowed pattern
    if (options.allowedPattern && !options.allowedPattern.test(sanitized)) {
      throw ErrorFactory.validation('Input contains invalid characters');
    }

    return sanitized;
  }

  /**
   * Sanitize email input
   */
  sanitizeEmail(input: string): string {
    const sanitized = this.sanitizeString(input, {
      maxLength: 254, // RFC 5321 limit
      stripHtml: true,
      preventXss: true,
    });

    const validation = validateEmail(sanitized);
    if (!validation.isValid) {
      throw ErrorFactory.validation(validation.error || 'Invalid email format');
    }

    return sanitized.toLowerCase();
  }

  /**
   * Sanitize UUID input
   */
  sanitizeUuid(input: string): string {
    const sanitized = this.sanitizeString(input, {
      maxLength: 36,
      stripHtml: true,
      allowedPattern: /^[0-9a-f-]+$/i,
    });

    const validation = validateUUID(sanitized);
    if (!validation.isValid) {
      throw ErrorFactory.validation(validation.error || 'Invalid UUID format');
    }

    return sanitized;
  }

  /**
   * Sanitize URL input
   */
  sanitizeUrl(input: string): string {
    const sanitized = this.sanitizeString(input, {
      maxLength: 2048,
      stripHtml: true,
      preventXss: true,
    });

    // Allow only HTTP/HTTPS URLs
    const urlRegex = /^https?:\/\/.+/i;
    if (!urlRegex.test(sanitized)) {
      throw ErrorFactory.validation('Invalid URL format');
    }

    try {
      new URL(sanitized);
    } catch {
      throw ErrorFactory.validation('Invalid URL format');
    }

    return sanitized;
  }

  /**
   * Sanitize object recursively
   */
  sanitizeObject(
    input: unknown,
    depth: number = 0,
    schema?: z.ZodSchema,
  ): unknown {
    if (depth > this.maxDepth) {
      throw ErrorFactory.validation('Object nesting too deep');
    }

    if (input === null || input === undefined) {
      return input;
    }

    if (typeof input === 'string') {
      return this.sanitizeString(input, { preventXss: true });
    }

    if (typeof input === 'number' || typeof input === 'boolean') {
      return input;
    }

    if (Array.isArray(input)) {
      if (input.length > this.maxArrayLength) {
        throw ErrorFactory.validation(
          `Array too long (max ${this.maxArrayLength} items)`,
        );
      }
      return input.map(item => this.sanitizeObject(item, depth + 1, schema));
    }

    if (typeof input === 'object') {
      const keys = Object.keys(input);
      if (keys.length > 100) {
        // Reasonable limit for object properties
        throw ErrorFactory.validation('Object has too many properties');
      }

      const sanitized: Record<string, unknown> = {};
      for (const key of keys) {
        const sanitizedKey = this.sanitizeString(key, {
          maxLength: 100,
          stripHtml: true,
          allowedPattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
        });
        sanitized[sanitizedKey] = this.sanitizeObject(
          (input as Record<string, unknown>)[key],
          depth + 1,
          schema,
        );
      }

      return sanitized;
    }

    throw ErrorFactory.validation('Unsupported input type');
  }

  /**
   * Sanitize and validate with Zod schema
   */
  sanitizeAndValidate<T>(input: unknown, schema: z.ZodSchema<T>): T {
    const sanitized = this.sanitizeObject(input, 0, schema);
    return schema.parse(sanitized);
  }
}

/**
 * Common validation schemas
 */
export const validationSchemas = {
  email: z.string().email().max(254),
  uuid: z.string().uuid(),
  password: z.string().min(8).max(128),
  username: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9_]+$/),
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z\s'-]+$/),
  url: z.string().url().max(2048),
  phoneNumber: z
    .string()
    .regex(/^\+?[\d\s-()]+$/)
    .max(20),

  // Pagination
  page: z.number().int().min(1).max(1000),
  limit: z.number().int().min(1).max(100),

  // Common object schemas
  userProfile: z.object({
    name: z.string().min(1).max(100).optional(),
    email: z.string().email().max(254).optional(),
    image: z.string().url().max(2048).optional(),
  }),

  changePassword: z.object({
    currentPassword: z.string().min(8).max(128),
    newPassword: z.string().min(8).max(128),
  }),

  signUp: z.object({
    email: z.string().email().max(254),
    password: z.string().min(8).max(128),
    name: z.string().min(1).max(100).optional(),
  }),

  signIn: z.object({
    email: z.string().email().max(254),
    password: z.string().min(8).max(128),
  }),
};

/**
 * Default input sanitizer instance
 */
export const inputSanitizer = new InputSanitizer();

/**
 * Middleware for request body sanitization
 */
export async function sanitizeRequestBody<T>(
  request: Request,
  schema: z.ZodSchema<T>,
): Promise<T> {
  try {
    const body = await request.json();
    return inputSanitizer.sanitizeAndValidate(body, schema);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ErrorFactory.validation(
        `Validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
      );
    }
    throw error;
  }
}
