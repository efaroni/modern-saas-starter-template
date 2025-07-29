'use client';

import { useState, useEffect } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { LoginForm } from '@/app/(auth)/auth/components/login-form';
import { SignupForm } from '@/app/(auth)/auth/components/signup-form';
import type { AuthUser } from '@/lib/auth/types';

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Check for any messages in search params (e.g., after logout)
  useEffect(() => {
    const msg = searchParams.get('message');
    if (msg === 'logged-out') {
      setMessage({
        type: 'success',
        text: 'You have been successfully logged out.',
      });
    }
  }, [searchParams]);

  const handleLoginSuccess = (_user: AuthUser) => {
    setMessage({
      type: 'success',
      text: 'Successfully signed in! Redirecting...',
    });

    // Redirect to configuration page (API keys) after successful login
    setTimeout(() => {
      router.push('/configuration');
    }, 500);
  };

  const handleSignupSuccess = (_user: AuthUser) => {
    setMessage({
      type: 'success',
      text: 'Account created successfully! Redirecting...',
    });

    // TODO: Implement email verification
    // For now, users can access the app immediately after signup
    // When implementing:
    // 1. Send verification email on signup
    // 2. Restrict certain features until verified
    // 3. Add /verify-email route handler
    // 4. Check emailVerified status in middleware

    // Redirect to configuration page after signup
    setTimeout(() => {
      router.push('/configuration');
    }, 500);
  };

  const handleError = (error: string) => {
    setMessage({
      type: 'error',
      text: error,
    });
  };

  const handleForgotPassword = () => {
    router.push('/reset-password');
  };

  return (
    <div className='flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8'>
      <div className='w-full max-w-md space-y-8'>
        {/* Header */}
        <div className='text-center'>
          <h1 className='text-3xl font-bold text-gray-900'>
            Modern SaaS Starter
          </h1>
          <p className='mt-2 text-sm text-gray-600'>
            Sign in to access your dashboard
          </p>
        </div>

        {/* Main Card */}
        <div className='rounded-lg bg-white px-4 py-8 shadow-lg sm:px-10'>
          {/* Success/Error Messages */}
          {message && (
            <div
              className={`mb-4 rounded-md p-3 text-sm ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800'
                  : 'bg-red-50 text-red-800'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Tabs */}
          <div className='mb-6 flex border-b border-gray-200'>
            <button
              onClick={() => {
                setActiveTab('login');
                setMessage(null);
              }}
              className={`flex-1 border-b-2 py-2 text-sm font-medium transition-colors ${
                activeTab === 'login'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setActiveTab('signup');
                setMessage(null);
              }}
              className={`flex-1 border-b-2 py-2 text-sm font-medium transition-colors ${
                activeTab === 'signup'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Forms */}
          {activeTab === 'login' ? (
            <LoginForm
              onSuccess={handleLoginSuccess}
              onError={handleError}
              onForgotPassword={handleForgotPassword}
            />
          ) : (
            <SignupForm onSuccess={handleSignupSuccess} onError={handleError} />
          )}

          {/* Footer */}
          <div className='mt-6 text-center text-sm text-gray-600'>
            <p>
              By signing in, you agree to our{' '}
              <a href='#' className='text-blue-600 hover:text-blue-500'>
                Terms of Service
              </a>{' '}
              and{' '}
              <a href='#' className='text-blue-600 hover:text-blue-500'>
                Privacy Policy
              </a>
            </p>
          </div>
        </div>

        {/* Development Info */}
        {process.env.NODE_ENV === 'development' && (
          <div className='rounded-md bg-blue-50 p-4 text-sm text-blue-800'>
            <p className='font-medium'>Development Mode</p>
            <p className='mt-1'>
              Test credentials: test@example.com / password123
            </p>
            <p className='mt-1'>OAuth providers: Coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
}
