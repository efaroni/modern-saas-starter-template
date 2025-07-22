'use client';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { requestPasswordResetAction } from '@/app/actions/auth';

const passwordResetSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type PasswordResetFormData = z.infer<typeof passwordResetSchema>;

interface PasswordResetRequestFormProps {
  onSuccess: (message: string) => void;
  onError: (error: string) => void;
  onBackToLogin: () => void;
}

export function PasswordResetRequestForm({
  onSuccess,
  onError,
  onBackToLogin,
}: PasswordResetRequestFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordResetFormData>({
    resolver: zodResolver(passwordResetSchema),
  });

  const onSubmit = async (data: PasswordResetFormData) => {
    setIsLoading(true);

    try {
      const result = await requestPasswordResetAction(data.email);

      if (result.success) {
        onSuccess(
          'If an account with that email exists, we have sent you a password reset link.',
        );
      } else {
        onError(result.error || 'Failed to request password reset');
      }
    } catch {
      onError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-lg font-medium text-gray-900'>Reset Password</h2>
        <p className='mt-1 text-sm text-gray-600'>
          Enter your email address and we&apos;ll send you a link to reset your
          password.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className='space-y-4' noValidate>
        <div>
          <label
            htmlFor='email'
            className='block text-sm font-medium text-gray-700'
          >
            Email address
          </label>
          <input
            id='email'
            type='email'
            {...register('email')}
            className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none'
            placeholder='Enter your email'
          />
          {errors.email && (
            <p className='mt-1 text-sm text-red-600'>{errors.email.message}</p>
          )}
        </div>

        <button
          type='submit'
          disabled={isLoading}
          className='flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50'
        >
          {isLoading ? 'Sending...' : 'Send Reset Link'}
        </button>

        <button
          type='button'
          onClick={onBackToLogin}
          className='flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none'
        >
          Back to Login
        </button>
      </form>
    </div>
  );
}
