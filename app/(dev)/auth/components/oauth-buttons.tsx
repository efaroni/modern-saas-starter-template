'use client'

import { useState } from 'react'
import { Spinner } from '@/components/ui/spinner'
import { authService } from '@/lib/auth/factory'
import type { AuthUser } from '@/lib/auth/types'

interface OAuthButtonsProps {
  onSuccess: (user: AuthUser) => void
  onError: (error: string) => void
}

export function OAuthButtons({ onSuccess, onError }: OAuthButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null)
  const oauthProviders = authService.getAvailableOAuthProviders()

  if (oauthProviders.length === 0) {
    return null
  }

  const handleOAuthSignIn = async (providerId: string) => {
    setLoadingProvider(providerId)
    try {
      const result = await authService.signInWithOAuth(providerId)
      
      if (result.success && result.redirectUrl) {
        // Redirect to OAuth provider
        window.location.href = result.redirectUrl
      } else if (result.success && result.user) {
        onSuccess(result.user)
      } else {
        onError(result.error || 'OAuth sign in failed')
        setLoadingProvider(null)
      }
    } catch {
      onError('An unexpected error occurred during OAuth sign in')
      setLoadingProvider(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or continue with</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-3">
        {oauthProviders.map((provider) => (
          <button
            key={provider.id}
            type="button"
            onClick={() => handleOAuthSignIn(provider.id)}
            disabled={loadingProvider !== null}
            className={`
              w-full inline-flex justify-center items-center px-4 py-2 
              border border-gray-300 rounded-md shadow-sm 
              text-sm font-medium text-gray-700 bg-white
              hover:bg-gray-50 focus:outline-none focus:ring-2 
              focus:ring-offset-2 focus:ring-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed
              ${loadingProvider === provider.id ? 'bg-gray-50' : ''}
            `}
          >
            {loadingProvider === provider.id ? (
              <Spinner size="sm" className="mr-2" />
            ) : (
              <span className="mr-2">
                {provider.id === 'google' && '🔍'}
                {provider.id === 'github' && '🐙'}
              </span>
            )}
            {loadingProvider === provider.id 
              ? `Signing in with ${provider.name}...`
              : `Sign in with ${provider.name}`
            }
          </button>
        ))}
      </div>
    </div>
  )
}