import { API_KEY_VALIDATION } from '@/lib/constants/validation';

export interface ApiKeyValidation {
  isValid: boolean
  error?: string
}

/**
 * Validates an API key against basic requirements
 * @param key - The API key to validate
 * @returns Validation result with error message if invalid
 */
export function validateApiKeyFormat(key: string): ApiKeyValidation {
  if (!key || key.length === 0) {
    return { isValid: false, error: 'API key is required' };
  }

  if (key !== key.trim()) {
    return { isValid: false, error: 'API key cannot have leading or trailing whitespace' };
  }

  if (key.trim().length < API_KEY_VALIDATION.MIN_LENGTH) {
    return { isValid: false, error: `API key must be at least ${API_KEY_VALIDATION.MIN_LENGTH} characters` };
  }

  return { isValid: true };
}
