import Link from 'next/link';

import { SignedIn, SignedOut } from '@clerk/nextjs';

export default function HomePage() {
  return (
    <div className='flex min-h-screen items-center justify-center bg-gray-50'>
      <div className='text-center'>
        <h1 className='mb-4 text-4xl font-bold text-gray-900'>
          Modern SaaS Starter Template
        </h1>
        <p className='mb-8 text-lg text-gray-600'>
          A comprehensive SaaS starter template with authentication, payments,
          AI, and more
        </p>

        <SignedOut>
          <div className='space-x-4'>
            <Link
              href='/sign-in'
              className='rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700'
            >
              Sign In
            </Link>
            <Link
              href='/sign-up'
              className='rounded-md bg-gray-200 px-6 py-2 text-gray-900 hover:bg-gray-300'
            >
              Sign Up
            </Link>
          </div>
        </SignedOut>

        <SignedIn>
          <Link
            href='/configuration'
            className='rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700'
          >
            Go to Dashboard
          </Link>
        </SignedIn>
      </div>
    </div>
  );
}
