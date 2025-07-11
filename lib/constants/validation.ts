/**
 * API Key Validation Constants
 */
export const API_KEY_VALIDATION = {
  /** Minimum required length for API keys */
  MIN_LENGTH: 10,
  
  /** Timeout in milliseconds before auto-validating user input */
  AUTO_VALIDATION_TIMEOUT: 1000,
  
  /** Delay in milliseconds to clear paste validation flag */
  PASTE_VALIDATION_CLEAR_DELAY: 100,
} as const