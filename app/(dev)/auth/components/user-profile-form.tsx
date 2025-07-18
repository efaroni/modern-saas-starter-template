'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { authService } from '@/lib/auth/factory'
import type { AuthUser } from '@/lib/auth/types'
import { AvatarUpload } from './avatar-upload'

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().min(1, 'Email is required').email('Invalid email format'),
  image: z.string().url('Invalid image URL').optional().or(z.literal(''))
})

type ProfileFormData = z.infer<typeof profileSchema>

interface UserProfileFormProps {
  user: AuthUser
  onSuccess: (user: AuthUser) => void
  onError: (error: string) => void
}

export function UserProfileForm({ user, onSuccess, onError }: UserProfileFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailVerified, setEmailVerified] = useState(!!user.emailVerified)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name || '',
      email: user.email,
      image: user.image || ''
    }
  })

  const watchedEmail = watch('email')
  const hasEmailChanged = watchedEmail !== user.email

  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true)
    try {
      const result = await authService.updateUserProfile(user.id, {
        name: data.name,
        email: data.email,
        image: data.image || undefined
      })

      if (result.success && result.user) {
        setEmailVerified(!!result.user.emailVerified)
        onSuccess(result.user)
      } else {
        onError(result.error || 'Profile update failed')
      }
    } catch {
      onError('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyEmail = async () => {
    try {
      const result = await authService.verifyEmail(user.id)
      
      if (result.success && result.user) {
        setEmailVerified(true)
        onSuccess(result.user)
      } else {
        onError(result.error || 'Email verification failed')
      }
    } catch {
      onError('An unexpected error occurred during email verification')
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Profile Information</h3>
        
        {/* Avatar Upload Section */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Avatar</h4>
          <AvatarUpload 
            user={user} 
            onSuccess={onSuccess} 
            onError={onError} 
          />
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="profile-name" className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <Input
              {...register('name')}
              type="text"
              id="profile-name"
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
            <label htmlFor="profile-email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <Input
              {...register('email')}
              type="email"
              id="profile-email"
              variant={errors.email ? 'error' : 'default'}
              className="mt-1 block w-full"
              placeholder="Enter your email"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">
                {errors.email.message}
              </p>
            )}
            
            {/* Email verification status */}
            <div className="mt-2 flex items-center gap-2">
              {emailVerified && !hasEmailChanged ? (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <span>✅</span>
                  <span>Email verified</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <span>⚠️</span>
                  <span>Email not verified</span>
                  {!hasEmailChanged && (
                    <button
                      type="button"
                      onClick={handleVerifyEmail}
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      Verify now
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="profile-image" className="block text-sm font-medium text-gray-700">
              Profile Image URL
            </label>
            <Input
              {...register('image')}
              type="url"
              id="profile-image"
              variant={errors.image ? 'error' : 'default'}
              className="mt-1 block w-full"
              placeholder="https://example.com/avatar.jpg"
            />
            {errors.image && (
              <p className="mt-1 text-sm text-red-600">
                {errors.image.message}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting && <Spinner size="sm" />}
              {isSubmitting ? 'Updating...' : 'Update Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}