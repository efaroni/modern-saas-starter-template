'use client';

import { useState, useEffect, useCallback } from 'react';

interface ValidationResult {
  isValid: boolean;
  isLoading: boolean;
  error: {
    code: string;
    message: string;
    details?: string;
    action?: { text: string; url: string };
  } | null;
  hasVisionModel?: boolean;
  lastValidated?: Date;
}

interface ValidationResponse {
  success: boolean;
  error?: string;
  message: string;
  details?:
    | string
    | { hasVisionModel: boolean; modelCount: number; validated: boolean };
  action?: { text: string; url: string };
}

interface CheckKeyResponse {
  hasKey: boolean;
}

const CACHE_KEY = 'openai_key_validation';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useOpenAIKeyValidation() {
  const [result, setResult] = useState<ValidationResult>(() => {
    // Try to load cached result on initial state
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        const cacheAge = Date.now() - new Date(parsed.timestamp).getTime();

        if (cacheAge <= CACHE_DURATION) {
          return {
            ...parsed.result,
            lastValidated: new Date(parsed.result.lastValidated),
            isLoading: false, // Important: not loading if we have cache
          };
        }
      }
    } catch {
      // Ignore errors
    }

    // Default state if no cache
    return {
      isValid: false,
      isLoading: true,
      error: null,
    };
  });

  // Load cached result from localStorage
  const loadCachedResult = useCallback((): ValidationResult | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const parsed = JSON.parse(cached);
      const cacheAge = Date.now() - new Date(parsed.timestamp).getTime();

      if (cacheAge > CACHE_DURATION) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }

      return {
        ...parsed.result,
        lastValidated: new Date(parsed.result.lastValidated),
      };
    } catch {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
  }, []);

  // Save result to localStorage
  const cacheResult = useCallback((validationResult: ValidationResult) => {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          result: validationResult,
          timestamp: new Date().toISOString(),
        }),
      );
    } catch {
      // Ignore cache errors
    }
  }, []);

  const validateKey = useCallback(
    async (force = false, fullValidation = false) => {
      // Skip if already loading (unless forced)
      // Note: We don't check result.isLoading here to avoid stale closure issues

      // Check cache first unless forced
      if (!force) {
        const cached = loadCachedResult();
        if (cached) {
          setResult(cached);
          return;
        }
      }

      // Starting validation
      setResult(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        // Step 1: Quick check if user has a key configured
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const checkResponse = await fetch('/api/ai/check-key', {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle session/auth issues gracefully
        if (!checkResponse.ok && checkResponse.status === 401) {
          // User not authenticated, don't show error, just set as not valid
          const noAuthResult: ValidationResult = {
            isValid: false,
            isLoading: false,
            error: null, // Don't show error for auth issues
            lastValidated: new Date(),
          };
          setResult(noAuthResult);
          // Auth check failed, user not authenticated
          return;
        }

        const checkData: CheckKeyResponse = await checkResponse.json();
        // Check-key response received

        if (!checkData.hasKey) {
          const noKeyResult: ValidationResult = {
            isValid: false,
            isLoading: false,
            error: {
              code: 'NO_API_KEY',
              message: 'No OpenAI API key found',
              details:
                'Please add your OpenAI API key in the configuration page to use AI features.',
              action: {
                text: 'Add API Key',
                url: '/configuration',
              },
            },
            lastValidated: new Date(),
          };
          setResult(noKeyResult);
          cacheResult(noKeyResult);
          return;
        }

        // Step 2: If fullValidation is requested, validate with OpenAI API
        if (fullValidation) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

          const response = await fetch('/api/ai/validate-key', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          const data: ValidationResponse = await response.json();

          if (data.success) {
            const details = data.details as
              | {
                  hasVisionModel: boolean;
                  modelCount: number;
                  validated: boolean;
                }
              | undefined;
            const validResult: ValidationResult = {
              isValid: true,
              isLoading: false,
              error: null,
              hasVisionModel: details?.hasVisionModel ?? false,
              lastValidated: new Date(),
            };
            setResult(validResult);
            cacheResult(validResult);
          } else {
            const errorResult: ValidationResult = {
              isValid: false,
              isLoading: false,
              error: {
                code: data.error || 'UNKNOWN_ERROR',
                message: data.message,
                details:
                  typeof data.details === 'string' ? data.details : undefined,
                action: data.action,
              },
              lastValidated: new Date(),
            };
            setResult(errorResult);
            cacheResult(errorResult);
          }
        } else {
          // For quick checks, just assume the key is valid if it exists
          const quickResult: ValidationResult = {
            isValid: true,
            isLoading: false,
            error: null,
            hasVisionModel: undefined, // Unknown without full validation
            lastValidated: new Date(),
          };
          setResult(quickResult);
          cacheResult(quickResult);
          // Quick check complete - key exists
        }
      } catch (error) {
        console.error('[useOpenAIKeyValidation] Validation failed:', error);

        let errorMessage = 'Network error';
        let errorDetails =
          'Unable to validate API key. Please check your connection and try again.';

        if (error instanceof Error && error.name === 'AbortError') {
          errorMessage = 'Request timeout';
          errorDetails = 'The validation request timed out. Please try again.';
          // Request timed out
        }

        const errorResult: ValidationResult = {
          isValid: false,
          isLoading: false,
          error: {
            code: 'NETWORK_ERROR',
            message: errorMessage,
            details: errorDetails,
          },
          lastValidated: new Date(),
        };
        setResult(errorResult);
        cacheResult(errorResult);
      }
    },
    [loadCachedResult, cacheResult],
  );

  // Auto-validate on mount (quick check only) - but skip if we already have cached result
  useEffect(() => {
    // Mount effect

    // If we already have a valid result from cache (not loading), skip validation
    if (!result.isLoading && result.lastValidated) {
      const cacheAge = Date.now() - result.lastValidated.getTime();
      if (cacheAge < CACHE_DURATION) {
        // Using cached result, skipping validation
        return; // Skip validation, use cached result
      }
    }

    // Small delay to ensure session is established
    const timer = setTimeout(() => {
      // Running auto-validation after delay
      validateKey();
    }, 100);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps to run only on mount

  // Global timeout failsafe - force stop loading after 5 seconds
  useEffect(() => {
    if (!result.isLoading) return;

    const failsafeTimer = setTimeout(() => {
      // OpenAI key validation timeout - forcing completion
      setResult({
        isValid: false,
        isLoading: false,
        error: {
          code: 'TIMEOUT',
          message: 'Validation timeout',
          details: 'The validation took too long. Please try again.',
        },
        lastValidated: new Date(),
      });
    }, 5000);

    return () => clearTimeout(failsafeTimer);
  }, [result.isLoading]);

  const retry = useCallback(() => {
    validateKey(true, true); // Force full validation
  }, [validateKey]);

  const quickCheck = useCallback(() => {
    validateKey(false, false); // Quick check only
  }, [validateKey]);

  const fullValidation = useCallback(() => {
    validateKey(false, true); // Full validation
  }, [validateKey]);

  return {
    ...result,
    validateKey: retry,
    refresh: retry,
    quickCheck,
    fullValidation,
  };
}
