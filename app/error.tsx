'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to Sentry or other error monitoring service
    console.error('Global error:', error);

    // In production, you would send this to your error monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error)
    }
  }, [error]);

  return (
    <div className='flex min-h-screen items-center justify-center bg-gray-50'>
      <div className='mx-auto max-w-md p-6 text-center'>
        <div className='mb-6'>
          <h2 className='mb-2 text-2xl font-bold text-gray-900'>
            Something went wrong!
          </h2>
          <p className='text-gray-600'>
            We encountered an unexpected error. Please try again.
          </p>
        </div>

        <div className='space-y-4'>
          <Button onClick={reset} className='w-full'>
            Try again
          </Button>

          <Button
            variant='outline'
            onClick={() => (window.location.href = '/')}
            className='w-full'
          >
            Go to homepage
          </Button>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <details className='mt-6 text-left'>
            <summary className='cursor-pointer text-sm text-gray-500 hover:text-gray-700'>
              Error details (development only)
            </summary>
            <pre className='mt-2 overflow-auto rounded bg-gray-100 p-2 text-xs'>
              {error.message}
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
