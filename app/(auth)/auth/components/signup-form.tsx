'use client';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { signupAction } from '@/app/actions/auth';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import type { AuthUser } from '@/lib/auth/types';

const signupSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters'),
  name: z.string()
    .min(1, 'Name is required'),
});

type SignupFormData = z.infer<typeof signupSchema>

interface SignupFormProps {
  onSuccess: (user: AuthUser) => void
  onError: (error: string) => void
}

export function SignupForm({ onSuccess, onError }: SignupFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormData) => {
    setIsSubmitting(true);
    try {
      const result = await signupAction({
        email: data.email,
        password: data.password,
        name: data.name,
      });

      if (result.success && result.user) {
        onSuccess(result.user);
      } else {
        onError(result.error || 'Signup failed');
      }
    } catch {
      onError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Service Status */}
      <div className="p-3 bg-gray-50 rounded-md">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">Auth Service Status:</span>
          <span className="text-green-600">✅</span>
          <span className="text-gray-600">
            Server-side Auth Configured
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label htmlFor="signup-name" className="block text-sm font-medium text-gray-700">
            Name
          </label>
          <Input
            {...register('name')}
            type="text"
            id="signup-name"
            variant={errors.name ? 'error' : 'default'}
            className="mt-1 block w-full"
            placeholder="Enter your name"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">
              {errors.name.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <Input
            {...register('email')}
            type="email"
            id="signup-email"
            variant={errors.email ? 'error' : 'default'}
            className="mt-1 block w-full"
            placeholder="Enter your email"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <Input
            {...register('password')}
            type="password"
            id="signup-password"
            variant={errors.password ? 'error' : 'default'}
            className="mt-1 block w-full"
            placeholder="Enter your password"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">
              {errors.password.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting && <Spinner size="sm" />}
          {isSubmitting ? 'Signing up...' : 'Sign up'}
        </button>
      </form>

      {/* Note for Development */}
      <div className="p-3 bg-green-50 rounded-md">
        <div className="text-sm">
          <p className="font-medium text-green-800">Development Mode:</p>
          <p className="text-green-700">You can create any new user account for testing</p>
        </div>
      </div>
    </div>
  );
}