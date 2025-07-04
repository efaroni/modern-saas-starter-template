'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createUserApiKey, testUserApiKey } from '@/app/actions/user-api-keys'

const resendSchema = z.object({
  key: z.string().min(1, 'API key is required').startsWith('re_', 'Resend keys must start with re_'),
})

type ResendFormData = z.infer<typeof resendSchema>

export function ResendConfig() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors },
  } = useForm<ResendFormData>({
    resolver: zodResolver(resendSchema),
  })

  const onSubmit = async (data: ResendFormData) => {
    setIsSubmitting(true)
    setMessage(null)

    try {
      const result = await createUserApiKey({
        provider: 'resend',
        privateKey: data.key,
      })
      
      if (result.success) {
        setMessage({ type: 'success', text: 'Resend API key added successfully!' })
        reset()
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to add API key' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTest = async () => {
    const { key } = getValues()
    
    if (!key) {
      setMessage({ type: 'error', text: 'Please enter an API key' })
      return
    }

    setIsTesting(true)
    setMessage(null)

    try {
      const result = await testUserApiKey('resend', key)
      
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: result.message || 'Resend API key is valid!'
        })
      } else {
        setMessage({ 
          type: 'error', 
          text: result.error || 'API key validation failed'
        })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while testing the API key' })
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg border">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center">
          <span className="text-white text-sm font-bold">@</span>
        </div>
        <div>
          <h3 className="font-semibold">Resend</h3>
          <p className="text-sm text-gray-600">For sending transactional emails</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="resend-key" className="block text-sm font-medium text-gray-700 mb-1">
            API Key
          </label>
          <input
            {...register('key')}
            type="password"
            id="resend-key"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="re_..."
          />
          {errors.key && (
            <p className="mt-1 text-sm text-red-600">{errors.key.message}</p>
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

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleTest}
            disabled={isTesting}
            className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTesting ? 'Testing...' : 'Test Key'}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Adding...' : 'Add Key'}
          </button>
        </div>
      </form>
    </div>
  )
}