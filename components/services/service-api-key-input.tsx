'use client';

import { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  createUserApiKey,
  getUserApiKeys,
  testUserApiKey,
  getDisplayMaskedApiKey,
  deleteUserApiKey,
} from '@/app/actions/user-api-keys';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useApiKeyValidation } from '@/lib/hooks/useApiKeyValidation';

const apiKeySchema = z.object({
  key: z.string(), // Removed validation as we'll show masked keys
});

type ApiKeyFormData = z.infer<typeof apiKeySchema>;

interface ServiceApiKeyInputProps {
  service: string;
  title: string;
  description?: string;
}

export function ServiceApiKeyInput({
  service,
  title,
  description,
}: ServiceApiKeyInputProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingExistingKey, setIsLoadingExistingKey] = useState(true);
  const [existingKeyStatus, setExistingKeyStatus] = useState<{
    hasKey: boolean;
    isValid?: boolean;
    error?: string;
    maskedKey?: string;
  }>({ hasKey: false });
  const [isExistingKey, setIsExistingKey] = useState(false);
  const [isEditingExistingKey, setIsEditingExistingKey] = useState(false);
  const [originalMaskedKey, setOriginalMaskedKey] = useState<string | null>(
    null,
  );

  const {
    isValidating,
    message,
    validationError,
    hasValidatedKey,
    validateKey,
    handlePaste,
  } = useApiKeyValidation({ service, title });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ApiKeyFormData>({
    resolver: zodResolver(apiKeySchema),
  });

  // Check for existing API key on mount
  useEffect(() => {
    async function checkExistingKey() {
      try {
        const result = await getUserApiKeys();
        if (result.success && result.data) {
          const existingKey = result.data.find(key => key.provider === service);
          if (existingKey) {
            // We have an existing key, now validate it
            setExistingKeyStatus({ hasKey: true });

            // Test the existing key (don't pass the masked key, let server fetch the real one)
            const [testResult, displayResult] = await Promise.all([
              testUserApiKey(service),
              getDisplayMaskedApiKey(service),
            ]);

            setExistingKeyStatus({
              hasKey: true,
              isValid: testResult.success,
              error: testResult.error,
              maskedKey: displayResult.success
                ? displayResult.maskedKey
                : undefined,
            });
            setIsExistingKey(true);

            // If we have a masked key, set it in the form
            if (displayResult.success && displayResult.maskedKey) {
              setValue('key', displayResult.maskedKey);
              setOriginalMaskedKey(displayResult.maskedKey);
            }
          } else {
            setExistingKeyStatus({ hasKey: false });
          }
        }
      } catch (error) {
        console.error('Failed to check existing API key:', error);
        setExistingKeyStatus({ hasKey: false });
      } finally {
        setIsLoadingExistingKey(false);
      }
    }

    checkExistingKey();
  }, [service, setValue]);

  // Show loading state while checking for existing key
  if (isLoadingExistingKey) {
    return (
      <div className='rounded-lg border bg-white p-6'>
        <div className='mb-4'>
          <h3 className='font-semibold'>{title}</h3>
          {description && (
            <p className='text-sm text-gray-600'>{description}</p>
          )}
        </div>
        <div className='flex items-center justify-center py-8'>
          <Spinner size='md' />
        </div>
      </div>
    );
  }

  const onSubmit = async (data: ApiKeyFormData) => {
    // Don't submit if this is the original masked key
    if (isExistingKey && !isEditingExistingKey) return;
    if (data.key === originalMaskedKey) return;

    setIsSubmitting(true);

    try {
      const result = await createUserApiKey({
        provider: service,
        privateKey: data.key,
      });

      if (result.success) {
        // If we were editing an existing key, we've successfully replaced it
        if (isEditingExistingKey) {
          setIsEditingExistingKey(false);
          setIsExistingKey(true);
          setOriginalMaskedKey(null); // Will be refetched

          // Refetch the key status
          const testResult = await testUserApiKey(service);
          setExistingKeyStatus({
            hasKey: true,
            isValid: testResult.success,
            error: testResult.error,
            maskedKey: undefined, // Will show the masked version after reload
          });
        } else {
          reset();
        }
        // Success handled by the validation hook
      } else {
        // Handle the duplicate key error specially for existing keys
        if (result.errorCode === 'API_KEY_DUPLICATE' && isEditingExistingKey) {
          // Try to delete the existing key and retry
          const confirmDelete =
            typeof window !== 'undefined' &&
            // eslint-disable-next-line no-alert
            window.confirm(
              'An API key already exists. Do you want to replace it with the new one?',
            );
          if (confirmDelete) {
            const deleteResult = await deleteUserApiKey(service);
            if (deleteResult.success) {
              // Retry creating the key
              const retryResult = await createUserApiKey({
                provider: service,
                privateKey: data.key,
              });
              if (retryResult.success) {
                setIsEditingExistingKey(false);
                setIsExistingKey(true);
                // Refetch the key status
                const testResult = await testUserApiKey(service);
                setExistingKeyStatus({
                  hasKey: true,
                  isValid: testResult.success,
                  error: testResult.error,
                });
                return;
              }
            }
          }
        }
        console.error('Failed to save API key:', result.error);
      }
    } catch (error) {
      console.error('Unexpected error saving API key:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='rounded-lg border bg-white p-6'>
      <div className='mb-4'>
        <h3 className='font-semibold'>{title}</h3>
        {description && <p className='text-sm text-gray-600'>{description}</p>}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
        <div>
          <label
            htmlFor={`${service}-key`}
            className='mb-1 block text-sm font-medium text-gray-700'
          >
            API Key
          </label>
          <div className='flex items-center gap-2'>
            <Input
              {...register('key', {
                onChange: e => {
                  const newValue = e.target.value;

                  // Check if user is editing an existing key (inline check)
                  const isEditingExisting =
                    isExistingKey && newValue !== originalMaskedKey;

                  // If user starts typing over the masked key, they're editing
                  if (isEditingExisting) {
                    setIsEditingExistingKey(true);
                  }

                  // Validate if it's a new key or edited existing key (use inline check)
                  if (!isExistingKey || isEditingExisting) {
                    validateKey(newValue);
                  }
                },
              })}
              type='password'
              id={`${service}-key`}
              variant={(() => {
                if (isExistingKey && !isEditingExistingKey) {
                  return existingKeyStatus.isValid ? 'success' : 'error';
                }
                if (!isValidating && message?.type === 'error') return 'error';
                if (!isValidating && hasValidatedKey) return 'success';
                return 'default';
              })()}
              className='flex-1'
              placeholder={
                isExistingKey && !isEditingExistingKey
                  ? ''
                  : 'Enter your API key...'
              }
              onPaste={handlePaste}
            />

            {/* Validation spinner */}
            {isValidating && (
              <div className='flex h-6 w-6 items-center justify-center'>
                <Spinner size='sm' />
              </div>
            )}

            {((hasValidatedKey && !isExistingKey) ||
              (isExistingKey && isEditingExistingKey && hasValidatedKey)) && (
              <button
                type='submit'
                disabled={isSubmitting}
                className='rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50'
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
          {(errors.key || validationError) && (
            <p className='mt-1 text-sm text-red-600'>
              {errors.key?.message || validationError}
            </p>
          )}
        </div>

        {/* Show initial validation status for existing keys */}
        {existingKeyStatus.hasKey &&
          existingKeyStatus.isValid !== undefined &&
          !isEditingExistingKey && (
            <div
              className={`mb-4 rounded-md p-3 ${
                existingKeyStatus.isValid
                  ? 'border border-green-200 bg-green-50 text-green-800'
                  : 'border border-red-200 bg-red-50 text-red-800'
              }`}
            >
              {existingKeyStatus.isValid
                ? '✓ API key is configured and valid'
                : `✗ ${existingKeyStatus.error || 'API key is invalid or expired'}`}
            </div>
          )}

        {message && (
          <div
            className={`rounded-md p-3 ${(() => {
              if (message.type === 'success')
                return 'bg-green-50 text-green-800';
              if (message.type === 'error') return 'bg-red-50 text-red-800';
              return 'bg-blue-50 text-blue-800';
            })()}`}
          >
            {message.text}
          </div>
        )}

        {isExistingKey && !isEditingExistingKey && (
          <p className='mt-4 text-sm text-gray-600'>
            Start typing to update your API key.
          </p>
        )}

        {isEditingExistingKey && (
          <div className='mt-4 space-y-2'>
            <p className='text-sm text-gray-600'>
              You&apos;re updating your existing API key. Click Save when you&apos;re
              done.
            </p>
            <button
              type='button'
              onClick={() => {
                // Reset to original masked key
                if (originalMaskedKey) {
                  setValue('key', originalMaskedKey);
                  setIsEditingExistingKey(false);
                }
              }}
              className='text-sm text-blue-600 hover:text-blue-700'
            >
              Cancel changes
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
