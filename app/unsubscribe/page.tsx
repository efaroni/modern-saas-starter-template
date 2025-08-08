'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';

import { useSearchParams } from 'next/navigation';

interface UnsubscribeResult {
  success: boolean;
  message: string;
  error?: string;
}

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [result, setResult] = useState<UnsubscribeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasUnsubscribed, setHasUnsubscribed] = useState(false);

  useEffect(() => {
    // If token is present in URL, automatically unsubscribe
    if (token && !hasUnsubscribed) {
      handleUnsubscribe();
    }
  }, [token, hasUnsubscribed, handleUnsubscribe]);

  const handleUnsubscribe = useCallback(async () => {
    if (!token) {
      setResult({
        success: false,
        message: 'Invalid unsubscribe link',
        error: 'Missing token',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/marketing/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();
      setResult(data);
      setHasUnsubscribed(true);
    } catch {
      setResult({
        success: false,
        message: 'Failed to unsubscribe',
        error: 'Network error',
      });
    } finally {
      setLoading(false);
    }
  }, [token]);

  const handleResubscribe = async () => {
    if (!token) return;

    setLoading(true);
    try {
      // For now, we'll just reset their preferences to default
      // In a real implementation, you might want a separate re-subscribe endpoint
      const response = await fetch('/api/marketing/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();
      if (data.success) {
        setResult({
          success: true,
          message: 'Successfully re-subscribed to marketing emails',
        });
        setHasUnsubscribed(false);
      } else {
        setResult(data);
      }
    } catch {
      setResult({
        success: false,
        message: 'Failed to re-subscribe',
        error: 'Network error',
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
          <p className='text-gray-600'>Processing your request...</p>
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
              This unsubscribe link is invalid or has expired.
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
            Email Preferences
          </h2>

          {result ? (
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
                      {result.message}
                    </p>
                    {result.error && (
                      <p className='mt-1 text-sm text-red-700'>
                        {result.error}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {result.success && hasUnsubscribed && (
                <div className='mt-6 space-y-4'>
                  <p className='text-sm text-gray-600'>
                    You will no longer receive marketing emails from us.
                  </p>
                  <p className='text-sm text-gray-600'>
                    You will still receive important account and billing-related
                    emails.
                  </p>

                  <div className='mt-6'>
                    <button
                      onClick={handleResubscribe}
                      className='flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none'
                    >
                      Re-subscribe to Marketing Emails
                    </button>
                  </div>
                </div>
              )}

              {result.success && !hasUnsubscribed && (
                <div className='mt-6'>
                  <p className='text-sm text-gray-600'>
                    Welcome back! You&apos;re now subscribed to our marketing
                    emails.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className='mt-8'>
              <p className='mb-4 text-sm text-gray-600'>
                Click the button below to unsubscribe from marketing emails.
              </p>
              <button
                onClick={handleUnsubscribe}
                className='flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none'
              >
                Unsubscribe from Marketing Emails
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className='flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8'>
          <div className='w-full max-w-md space-y-8 text-center'>
            <div className='mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600' />
            <p className='text-gray-600'>Loading...</p>
          </div>
        </div>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  );
}
