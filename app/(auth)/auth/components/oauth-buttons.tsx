'use client';

import { useState } from 'react';

import { Spinner } from '@/components/ui/spinner';
import type { AuthUser } from '@/lib/auth/types';

interface OAuthButtonsProps {
  onSuccess: (user: AuthUser) => void;
  onError: (error: string) => void;
}

export function OAuthButtons({
  onSuccess: _onSuccess,
  onError,
}: OAuthButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const oauthProviders = []; // TODO: Implement OAuth server actions

  if (oauthProviders.length === 0) {
    return null;
  }

  const handleOAuthSignIn = (providerId: string) => {
    setLoadingProvider(providerId);
    try {
      // TODO: Implement OAuth server action
      onError('OAuth sign-in not yet implemented');
      setLoadingProvider(null);
    } catch {
      onError('An unexpected error occurred during OAuth sign in');
      setLoadingProvider(null);
    }
  };

  return (
    <div className='space-y-3'>
      <div className='relative'>
        <div className='absolute inset-0 flex items-center'>
          <div className='w-full border-t border-gray-300' />
        </div>
        <div className='relative flex justify-center text-sm'>
          <span className='bg-white px-2 text-gray-500'>Or continue with</span>
        </div>
      </div>

      <div className='grid grid-cols-1 gap-3'>
        {oauthProviders.map(provider => (
          <button
            key={provider.id}
            type='button'
            onClick={() => handleOAuthSignIn(provider.id)}
            disabled={loadingProvider !== null}
            className={`inline-flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${loadingProvider === provider.id ? 'bg-gray-50' : ''} `}
          >
            {loadingProvider === provider.id ? (
              <Spinner size='sm' className='mr-2' />
            ) : (
              <span className='mr-2'>
                {provider.id === 'google' && '🔍'}
                {provider.id === 'github' && '🐙'}
              </span>
            )}
            {loadingProvider === provider.id
              ? `Signing in with ${provider.name}...`
              : `Sign in with ${provider.name}`}
          </button>
        ))}
      </div>
    </div>
  );
}
