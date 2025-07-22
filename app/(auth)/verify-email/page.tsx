'use client';

import { useState, useEffect } from 'react';

import { useSearchParams } from 'next/navigation';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  );
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    } else {
      setStatus('error');
      setMessage('Invalid verification link');
    }
  }, [token]);

  const verifyEmail = async (token: string) => {
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage(
          'Email verified successfully! You can now use all features.',
        );
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to verify email');
      }
    } catch {
      setStatus('error');
      setMessage('An error occurred while verifying your email');
    }
  };

  return (
    <div className='flex min-h-screen items-center justify-center bg-gray-50'>
      <div className='w-full max-w-md space-y-8 p-8'>
        <div className='text-center'>
          <h2 className='mt-6 text-3xl font-bold text-gray-900'>
            Email Verification
          </h2>
        </div>

        <div className='mt-8 space-y-6'>
          {status === 'loading' && (
            <div className='text-center'>
              <div className='mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600' />
              <p className='mt-4 text-sm text-gray-600'>
                Verifying your email...
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className='text-center'>
              <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100'>
                <svg
                  className='h-6 w-6 text-green-600'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M5 13l4 4L19 7'
                  />
                </svg>
              </div>
              <p className='mt-4 text-sm text-green-600'>{message}</p>
              <div className='mt-6'>
                <a
                  href='/dashboard'
                  className='flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none'
                >
                  Go to Dashboard
                </a>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className='text-center'>
              <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100'>
                <svg
                  className='h-6 w-6 text-red-600'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M6 18L18 6M6 6l12 12'
                  />
                </svg>
              </div>
              <p className='mt-4 text-sm text-red-600'>{message}</p>
              <div className='mt-6'>
                <a
                  href='/auth'
                  className='flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none'
                >
                  Back to Auth
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
