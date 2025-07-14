'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { authService } from '@/lib/auth/factory'
import type { AuthUser } from '@/lib/auth/types'
import { OAuthButtons } from './oauth-buttons'

const loginSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
  password: z.string()
    .min(1, 'Password is required')
})

type LoginFormData = z.infer<typeof loginSchema>

interface LoginFormProps {
  onSuccess: (user: AuthUser) => void
  onError: (error: string) => void
  onForgotPassword: () => void
}

export function LoginForm({ onSuccess, onError, onForgotPassword }: LoginFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const authConfig = authService.getConfiguration()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true)
    try {
      const result = await authService.signIn({
        email: data.email,
        password: data.password
      })

      if (result.success && result.user) {
        onSuccess(result.user)
      } else {
        onError(result.error || 'Login failed')
      }
    } catch {
      onError('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Service Status */}
      <div className="p-3 bg-gray-50 rounded-md">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">Auth Service Status:</span>
          <span className="text-green-600">✅</span>
          <span className="text-gray-600">
            {authConfig.provider === 'mock' ? 'Mock Auth' : 'Real Auth'} Configured
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <Input
            {...register('email')}
            type="text"
            id="email"
            variant={errors.email ? 'error' : 'default'}
            className="mt-1 block w-full"
            placeholder="Enter your email"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <Input
            {...register('password')}
            type="password"
            id="password"
            variant={errors.password ? 'error' : 'default'}
            className="mt-1 block w-full"
            placeholder="Enter your password"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm text-blue-600 hover:text-blue-500 focus:outline-none focus:underline"
          >
            Forgot your password?
          </button>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting && <Spinner size="sm" />}
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      {/* OAuth Buttons */}
      <OAuthButtons onSuccess={onSuccess} onError={onError} />

      {/* Test Credentials for Mock */}
      {authConfig.provider === 'mock' && (
        <div className="p-3 bg-blue-50 rounded-md">
          <div className="text-sm">
            <p className="font-medium text-blue-800">Test Credentials:</p>
            <p className="text-blue-700">Email: test@example.com</p>
            <p className="text-blue-700">Password: password</p>
          </div>
        </div>
      )}
    </div>
  )
}