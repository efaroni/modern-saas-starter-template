import { redirect } from 'next/navigation';

import { auth } from '@clerk/nextjs/server';

import { DesignAnalyzer } from '@/components/design-analyzer';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Design System Analyzer',
  description:
    'Extract design patterns from screenshots to create custom styling files',
};

export default async function StylingPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }
  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='mx-auto max-w-6xl'>
        <div className='mb-8 text-center'>
          <h1 className='mb-4 text-4xl font-bold'>Design System Analyzer</h1>
          <p className='mx-auto max-w-3xl text-xl text-gray-600'>
            Upload screenshots of your favorite designs to generate custom
            styling files that help you escape the generic AI look. Get tailored
            Tailwind configs, CSS variables, and comprehensive style guides.
          </p>
        </div>

        <div className='mb-8 grid grid-cols-1 gap-6 text-center md:grid-cols-3'>
          <div className='space-y-2'>
            <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100'>
              <svg
                className='h-6 w-6 text-blue-600'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12'
                />
              </svg>
            </div>
            <h3 className='font-semibold'>Upload Screenshots</h3>
            <p className='text-sm text-gray-600'>
              Share design references that inspire you
            </p>
          </div>

          <div className='space-y-2'>
            <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-green-100'>
              <svg
                className='h-6 w-6 text-green-600'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z'
                />
              </svg>
            </div>
            <h3 className='font-semibold'>AI Analysis</h3>
            <p className='text-sm text-gray-600'>
              Extract colors, typography, and spacing patterns
            </p>
          </div>

          <div className='space-y-2'>
            <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100'>
              <svg
                className='h-6 w-6 text-purple-600'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4'
                />
              </svg>
            </div>
            <h3 className='font-semibold'>Generate Files</h3>
            <p className='text-sm text-gray-600'>
              Get ready-to-use Tailwind config, CSS, and docs
            </p>
          </div>
        </div>

        <DesignAnalyzer />
      </div>
    </div>
  );
}
