import { useState } from 'react';

import { testUserApiKey } from '@/app/actions/user-api-keys';
import { API_KEY_VALIDATION } from '@/lib/constants/validation';
import { validateApiKeyFormat } from '@/lib/utils/api-key-validation';

export interface UseApiKeyValidationProps {
  service: string;
  title: string;
}

export function useApiKeyValidation({
  service,
  title,
}: UseApiKeyValidationProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [hasValidatedKey, setHasValidatedKey] = useState(false);
  const [validationTimeout, setValidationTimeout] =
    useState<NodeJS.Timeout | null>(null);
  const [isPasteValidating, setIsPasteValidating] = useState(false);

  const validateApiKey = async (key: string) => {
    if (!key) return;

    setIsValidating(true);
    setMessage(null);

    try {
      const result = await testUserApiKey(service, key);

      if (result.success) {
        setMessage({
          type: 'success',
          text: result.message || `${title} API key is valid!`,
        });
        setHasValidatedKey(true);
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'API key validation failed',
        });
        setHasValidatedKey(false);
      }
    } catch {
      setMessage({
        type: 'error',
        text: 'An error occurred while testing the API key',
      });
      setHasValidatedKey(false);
    } finally {
      setIsValidating(false);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    // Set paste flag to prevent timeout validation
    setIsPasteValidating(true);

    // Let the paste happen first, then get the actual new value
    setTimeout(() => {
      const actualNewValue = (e.target as HTMLInputElement).value;
      const validation = validateApiKeyFormat(actualNewValue);
      if (validation.isValid) {
        validateApiKey(actualNewValue);
      }
      // Clear paste flag after a short delay
      setTimeout(
        () => setIsPasteValidating(false),
        API_KEY_VALIDATION.PASTE_VALIDATION_CLEAR_DELAY,
      );
    }, 0);
  };

  const validateKey = (key: string, fromTyping = true) => {
    // Reset all states when key changes
    setHasValidatedKey(false);
    setMessage(null);

    // Clear existing timeout
    if (validationTimeout) {
      clearTimeout(validationTimeout);
      setValidationTimeout(null);
    }

    // Validate format and set error if invalid
    const validation = validateApiKeyFormat(key);
    if (!validation.isValid) {
      setValidationError(validation.error || null);
      return false;
    }

    setValidationError(null);

    // Auto-validate after timeout if key is valid and from typing (not paste)
    if (fromTyping && !isPasteValidating && validation.isValid) {
      const timeout = setTimeout(() => {
        validateApiKey(key);
      }, API_KEY_VALIDATION.AUTO_VALIDATION_TIMEOUT);
      setValidationTimeout(timeout);
    }

    return true;
  };

  return {
    // State
    isValidating,
    message,
    validationError,
    hasValidatedKey,

    // Actions
    validateKey,
    handlePaste,
  };
}
