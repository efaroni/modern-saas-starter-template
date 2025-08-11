'use client';

import { useState, useEffect } from 'react';

interface UnsubscribeResult {
  success: boolean;
  message?: string;
  error?: string;
  category?: string;
}

interface UnsubscribePageProps {
  params: {
    token: string;
  };
}

export default function UnsubscribeTokenPage({ params }: UnsubscribePageProps) {
  const { token } = params;
  const [result, setResult] = useState<UnsubscribeResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Automatically process the token on page load
    if (token) {
      handleUnsubscribe();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleUnsubscribe = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/unsubscribe/${token}`, {
        method: 'GET',
      });

      const data = await response.json();
      setResult(data);
    } catch {
      setResult({
        success: false,
        error: 'Network error occurred while processing your request',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8'>
        <div className='w-full max-w-md space-y-8 text-center'>
          <div className='mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600' />
          <p className='text-gray-600'>
            Processing your unsubscribe request...
          </p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8'>
        <div className='w-full max-w-md space-y-8'>
          <div className='text-center'>
            <h2 className='mt-6 text-3xl font-extrabold text-gray-900'>
              Invalid Link
            </h2>
            <p className='mt-2 text-sm text-gray-600'>
              This unsubscribe link is missing required information.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8'>
      <div className='w-full max-w-md space-y-8'>
        <div className='text-center'>
          <h2 className='mt-6 text-3xl font-extrabold text-gray-900'>
            Email Preferences Updated
          </h2>

          {result && (
            <div className='mt-8'>
              <div
                className={`rounded-md p-4 ${
                  result.success
                    ? 'border border-green-200 bg-green-50'
                    : 'border border-red-200 bg-red-50'
                }`}
              >
                <div className='flex'>
                  <div className='ml-3'>
                    <p
                      className={`text-sm font-medium ${
                        result.success ? 'text-green-800' : 'text-red-800'
                      }`}
                    >
                      {result.message ||
                        (result.success
                          ? 'Successfully updated your email preferences'
                          : 'Failed to update your email preferences')}
                    </p>
                    {result.error && (
                      <p className='mt-1 text-sm text-red-700'>
                        {result.error}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {result.success && (
                <div className='mt-6 space-y-4'>
                  <p className='text-sm text-gray-600'>
                    Your email preferences have been updated successfully.
                  </p>
                  <p className='text-sm text-gray-600'>
                    You will still receive important account-related and
                    security emails.
                  </p>
                  <p className='text-xs text-gray-500'>
                    Note: This unsubscribe link has been used and is no longer
                    valid.
                  </p>

                  <div className='mt-6'>
                    <a
                      href='/emails'
                      className='flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none'
                    >
                      Manage Email Preferences
                    </a>
                  </div>
                </div>
              )}

              {!result.success && (
                <div className='mt-6 space-y-4'>
                  <p className='text-sm text-gray-600'>
                    This unsubscribe link may be invalid, expired, or already
                    used.
                  </p>

                  <div className='mt-6'>
                    <a
                      href='/emails'
                      className='flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none'
                    >
                      Manage Email Preferences
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
