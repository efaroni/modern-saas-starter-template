'use client';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { resetPasswordAction } from '@/app/actions/auth';

const passwordResetCompletionSchema = z
  .object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters'),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type PasswordResetCompletionFormData = z.infer<
  typeof passwordResetCompletionSchema
>;

interface PasswordResetCompletionFormProps {
  token: string;
  onSuccess: (message: string) => void;
  onError: (error: string) => void;
  onBackToLogin: () => void;
}

export function PasswordResetCompletionForm({
  token,
  onSuccess,
  onError,
  onBackToLogin,
}: PasswordResetCompletionFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordResetCompletionFormData>({
    resolver: zodResolver(passwordResetCompletionSchema),
  });

  const onSubmit = async (data: PasswordResetCompletionFormData) => {
    setIsLoading(true);

    try {
      const result = await resetPasswordAction({
        token,
        newPassword: data.newPassword,
      });

      if (result.success) {
        onSuccess(
          'Your password has been reset successfully. You can now log in with your new password.',
        );
      } else {
        onError(result.error || 'Failed to reset password');
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
        <h2 className='text-lg font-medium text-gray-900'>Set New Password</h2>
        <p className='mt-1 text-sm text-gray-600'>
          Enter your new password below.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
        <div>
          <label
            htmlFor='newPassword'
            className='block text-sm font-medium text-gray-700'
          >
            New Password
          </label>
          <input
            id='newPassword'
            type='password'
            {...register('newPassword')}
            className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none'
            placeholder='Enter new password'
          />
          {errors.newPassword && (
            <p className='mt-1 text-sm text-red-600'>
              {errors.newPassword.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor='confirmPassword'
            className='block text-sm font-medium text-gray-700'
          >
            Confirm New Password
          </label>
          <input
            id='confirmPassword'
            type='password'
            {...register('confirmPassword')}
            className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none'
            placeholder='Confirm new password'
          />
          {errors.confirmPassword && (
            <p className='mt-1 text-sm text-red-600'>
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <button
          type='submit'
          disabled={isLoading}
          className='flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50'
        >
          {isLoading ? 'Resetting...' : 'Reset Password'}
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
