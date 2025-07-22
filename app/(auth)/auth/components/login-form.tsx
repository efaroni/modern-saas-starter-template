'use client';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { loginAction } from '@/app/actions/auth';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import type { AuthUser } from '@/lib/auth/types';

import { OAuthButtons } from './oauth-buttons';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSuccess: (user: AuthUser) => void;
  onError: (error: string) => void;
  onForgotPassword: () => void;
}

export function LoginForm({
  onSuccess,
  onError,
  onForgotPassword,
}: LoginFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    try {
      const result = await loginAction({
        email: data.email,
        password: data.password,
      });

      if (result.success && result.user) {
        onSuccess(result.user);
      } else {
        onError(result.error || 'Login failed');
      }
    } catch {
      onError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='space-y-4'>
      <form onSubmit={handleSubmit(onSubmit)} className='space-y-4' noValidate>
        <div>
          <label
            htmlFor='email'
            className='block text-sm font-medium text-gray-700'
          >
            Email
          </label>
          <Input
            {...register('email')}
            type='email'
            id='email'
            variant={errors.email ? 'error' : 'default'}
            className='mt-1 block w-full'
            placeholder='Enter your email'
          />
          {errors.email && (
            <p className='mt-1 text-sm text-red-600'>{errors.email.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor='password'
            className='block text-sm font-medium text-gray-700'
          >
            Password
          </label>
          <Input
            {...register('password')}
            type='password'
            id='password'
            variant={errors.password ? 'error' : 'default'}
            className='mt-1 block w-full'
            placeholder='Enter your password'
          />
          {errors.password && (
            <p className='mt-1 text-sm text-red-600'>
              {errors.password.message}
            </p>
          )}
        </div>

        <div className='flex items-center justify-between'>
          <button
            type='button'
            onClick={onForgotPassword}
            className='text-sm text-blue-600 hover:text-blue-500 focus:underline focus:outline-none'
          >
            Forgot your password?
          </button>
        </div>

        <button
          type='submit'
          disabled={isSubmitting}
          className='flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50'
        >
          {isSubmitting && <Spinner size='sm' />}
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      {/* OAuth Buttons */}
      <OAuthButtons onSuccess={onSuccess} onError={onError} />
    </div>
  );
}
