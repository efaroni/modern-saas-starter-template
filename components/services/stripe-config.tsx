'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createUserApiKey, testUserApiKey } from '@/app/actions/user-api-keys'

const stripeSchema = z.object({
  secretKey: z.string().min(1, 'Secret key is required').startsWith('sk_', 'Stripe secret keys must start with sk_'),
  publicKey: z.string().min(1, 'Public key is required').startsWith('pk_', 'Stripe public keys must start with pk_'),
})

type StripeFormData = z.infer<typeof stripeSchema>

export function StripeConfig() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string; details?: any } | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors },
  } = useForm<StripeFormData>({
    resolver: zodResolver(stripeSchema),
  })

  const onSubmit = async (data: StripeFormData) => {
    setIsSubmitting(true)
    setMessage(null)

    try {
      const result = await createUserApiKey({
        provider: 'stripe',
        privateKey: data.secretKey,
        publicKey: data.publicKey,
      })
      
      if (result.success) {
        setMessage({ type: 'success', text: 'Stripe configuration added successfully!' })
        reset()
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to add Stripe configuration' })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'An unexpected error occurred' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTest = async () => {
    const { secretKey } = getValues()
    
    if (!secretKey) {
      setMessage({ type: 'error', text: 'Please enter a secret key' })
      return
    }

    setIsTesting(true)
    setMessage(null)

    try {
      const result = await testUserApiKey('stripe', secretKey)
      
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: result.message || 'Stripe secret key is valid!',
          details: result.details
        })
      } else {
        setMessage({ 
          type: 'error', 
          text: result.error || 'API key validation failed',
          details: result.details
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
        <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center">
          <span className="text-white text-sm font-bold">$</span>
        </div>
        <div>
          <h3 className="font-semibold">Stripe (Owner Keys)</h3>
          <p className="text-sm text-gray-600">Your payment processing keys for collecting payments</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="stripe-secret" className="block text-sm font-medium text-gray-700 mb-1">
            Secret Key
          </label>
          <input
            {...register('secretKey')}
            type="password"
            id="stripe-secret"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="sk_test_... or sk_live_..."
          />
          {errors.secretKey && (
            <p className="mt-1 text-sm text-red-600">{errors.secretKey.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="stripe-public" className="block text-sm font-medium text-gray-700 mb-1">
            Public Key
          </label>
          <input
            {...register('publicKey')}
            type="text"
            id="stripe-public"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="pk_test_... or pk_live_..."
          />
          {errors.publicKey && (
            <p className="mt-1 text-sm text-red-600">{errors.publicKey.message}</p>
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
            <div>{message.text}</div>
            {message.details && message.type === 'success' && (
              <div className="mt-2 text-sm">
                {message.details.accountName && (
                  <p>• Account: {message.details.accountName}</p>
                )}
                {message.details.isTestMode !== undefined && (
                  <p>• Mode: {message.details.isTestMode ? 'Test' : 'Live'}</p>
                )}
                {message.details.country && (
                  <p>• Country: {message.details.country}</p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleTest}
            disabled={isTesting}
            className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTesting ? 'Testing...' : 'Test Secret Key'}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Adding...' : 'Add Configuration'}
          </button>
        </div>
      </form>
    </div>
  )
}