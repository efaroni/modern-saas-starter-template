'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createUserApiKey } from '@/app/actions/user-api-keys'
import { useApiKeyValidation } from '@/lib/hooks/useApiKeyValidation'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { API_KEY_VALIDATION } from '@/lib/constants/validation'

const apiKeySchema = z.object({
  key: z.string()
    .min(1, 'API key is required')
    .refine(val => val === val.trim(), 'API key cannot have leading or trailing whitespace')
    .refine(val => val.length >= API_KEY_VALIDATION.MIN_LENGTH, `API key must be at least ${API_KEY_VALIDATION.MIN_LENGTH} characters`)
})

type ApiKeyFormData = z.infer<typeof apiKeySchema>

interface ServiceApiKeyInputProps {
  service: string
  title: string
  description?: string
}

export function ServiceApiKeyInput({ service, title, description }: ServiceApiKeyInputProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const {
    isValidating,
    message,
    validationError,
    hasValidatedKey,
    validateKey,
    handlePaste,
  } = useApiKeyValidation({ service, title })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ApiKeyFormData>({
    resolver: zodResolver(apiKeySchema),
  })

  const onSubmit = async (data: ApiKeyFormData) => {
    setIsSubmitting(true)

    try {
      const result = await createUserApiKey({
        provider: service,
        privateKey: data.key,
      })
      
      if (result.success) {
        reset()
        // Success handled by the validation hook
      } else {
        // Error handling could be improved here
        console.error('Failed to save API key:', result.error)
      }
    } catch (error) {
      console.error('Unexpected error saving API key:', error)
    } finally {
      setIsSubmitting(false)
    }
  }



  return (
    <div className="bg-white p-6 rounded-lg border">
      <div className="mb-4">
        <h3 className="font-semibold">{title}</h3>
        {description && <p className="text-sm text-gray-600">{description}</p>}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor={`${service}-key`} className="block text-sm font-medium text-gray-700 mb-1">
            API Key
          </label>
          <div className="flex gap-2 items-center">
            <Input
              {...register('key', {
                onChange: (e) => validateKey(e.target.value)
              })}
              type="password"
              id={`${service}-key`}
              variant={
                !isValidating && message?.type === 'error'
                  ? 'error'
                  : !isValidating && hasValidatedKey
                  ? 'success'
                  : 'default'
              }
              className="flex-1"
              placeholder="Enter your API key..."
              onPaste={handlePaste}
            />
            
            {/* Validation spinner */}
            {isValidating && (
              <div className="w-6 h-6 flex items-center justify-center">
                <Spinner size="sm" />
              </div>
            )}
            
            {hasValidatedKey && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
          {(errors.key || validationError) && (
            <p className="mt-1 text-sm text-red-600">
              {errors.key?.message || validationError}
            </p>
          )}
        </div>

        {message && (
          <div
            className={`p-3 rounded-md ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800'
                : message.type === 'error'
                ? 'bg-red-50 text-red-800'
                : 'bg-blue-50 text-blue-800'
            }`}
          >
            {message.text}
          </div>
        )}
      </form>
    </div>
  )
}