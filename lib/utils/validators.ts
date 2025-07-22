import { VALIDATION_CONFIG } from '@/lib/config/app-config';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates an email address using the centralized email pattern
 */
export function validateEmail(email: string): ValidationResult {
  // Handle null/undefined as missing email
  if (email === null || email === undefined || typeof email !== 'string') {
    return {
      isValid: false,
      error: 'Email is required',
    };
  }

  // Treat empty/whitespace-only strings as invalid format (not required)
  if (email.trim().length === 0) {
    return {
      isValid: false,
      error: 'Invalid email format',
    };
  }

  if (!VALIDATION_CONFIG.EMAIL_PATTERN.test(email)) {
    return {
      isValid: false,
      error: 'Invalid email format',
    };
  }

  return {
    isValid: true,
  };
}

/**
 * Validates a UUID string using the centralized UUID pattern
 */
export function validateUUID(uuid: string): ValidationResult {
  if (!uuid || typeof uuid !== 'string') {
    return {
      isValid: false,
      error: 'UUID is required',
    };
  }

  if (!VALIDATION_CONFIG.UUID_PATTERN.test(uuid)) {
    return {
      isValid: false,
      error: 'Invalid UUID format',
    };
  }

  return {
    isValid: true,
  };
}

/**
 * Validates a password meets minimum requirements
 */
export function validatePasswordLength(
  password: string,
  minLength: number = 8,
): ValidationResult {
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      error: 'Password is required',
    };
  }

  if (password.length < minLength) {
    return {
      isValid: false,
      error: `Password must be at least ${minLength} characters`,
    };
  }

  return {
    isValid: true,
  };
}

/**
 * Validates a string is not empty or whitespace-only
 */
export function validateRequired(
  value: string,
  fieldName: string,
): ValidationResult {
  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    return {
      isValid: false,
      error: `${fieldName} is required`,
    };
  }

  return {
    isValid: true,
  };
}

/**
 * Validates multiple fields and returns the first error found
 */
export function validateFields(
  validations: ValidationResult[],
): ValidationResult {
  for (const validation of validations) {
    if (!validation.isValid) {
      return validation;
    }
  }

  return {
    isValid: true,
  };
}

/**
 * Simple email validation for cases where only boolean result is needed
 */
export function isValidEmail(email: string): boolean {
  return validateEmail(email).isValid;
}

/**
 * Simple UUID validation for cases where only boolean result is needed
 */
export function isValidUUID(uuid: string): boolean {
  return validateUUID(uuid).isValid;
}
