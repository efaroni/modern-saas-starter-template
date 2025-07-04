'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createUserApiKey } from '@/app/actions/user-api-keys'

const githubSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().min(1, 'Client Secret is required'),
})

const googleSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().min(1, 'Client Secret is required'),
})

type GitHubFormData = z.infer<typeof githubSchema>
type GoogleFormData = z.infer<typeof googleSchema>

export function OAuthConfig() {
  const [activeProvider, setActiveProvider] = useState<'github' | 'google' | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const githubForm = useForm<GitHubFormData>({
    resolver: zodResolver(githubSchema),
  })

  const googleForm = useForm<GoogleFormData>({
    resolver: zodResolver(googleSchema),
  })

  const onSubmitGitHub = async (data: GitHubFormData) => {
    setIsSubmitting(true)
    setMessage(null)

    try {
      const result = await createUserApiKey({
        provider: 'github',
        privateKey: data.clientSecret,
        publicKey: data.clientId,
      })
      
      if (result.success) {
        setMessage({ type: 'success', text: 'GitHub OAuth configuration added successfully!' })
        githubForm.reset()
        setActiveProvider(null)
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to add GitHub configuration' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const onSubmitGoogle = async (data: GoogleFormData) => {
    setIsSubmitting(true)
    setMessage(null)

    try {
      const result = await createUserApiKey({
        provider: 'google',
        privateKey: data.clientSecret,
        publicKey: data.clientId,
      })
      
      if (result.success) {
        setMessage({ type: 'success', text: 'Google OAuth configuration added successfully!' })
        googleForm.reset()
        setActiveProvider(null)
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to add Google configuration' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg border">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
          <span className="text-white text-sm font-bold">🔐</span>
        </div>
        <div>
          <h3 className="font-semibold">OAuth Providers</h3>
          <p className="text-sm text-gray-600">For social login integration</p>
        </div>
      </div>

      {!activeProvider && (
        <div className="space-y-3">
          <button
            onClick={() => setActiveProvider('github')}
            className="w-full p-3 text-left border rounded-md hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🐙</span>
              <div>
                <p className="font-medium">GitHub</p>
                <p className="text-sm text-gray-600">Add GitHub OAuth</p>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => setActiveProvider('google')}
            className="w-full p-3 text-left border rounded-md hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔍</span>
              <div>
                <p className="font-medium">Google</p>
                <p className="text-sm text-gray-600">Add Google OAuth</p>
              </div>
            </div>
          </button>
        </div>
      )}

      {activeProvider === 'github' && (
        <form onSubmit={githubForm.handleSubmit(onSubmitGitHub)} className="space-y-4">
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setActiveProvider(null)}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              ← Back to providers
            </button>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client ID
            </label>
            <input
              {...githubForm.register('clientId')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Iv1.xxxxxxxxxxxxxxxx"
            />
            {githubForm.formState.errors.clientId && (
              <p className="mt-1 text-sm text-red-600">{githubForm.formState.errors.clientId.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client Secret
            </label>
            <input
              {...githubForm.register('clientSecret')}
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Client secret from GitHub"
            />
            {githubForm.formState.errors.clientSecret && (
              <p className="mt-1 text-sm text-red-600">{githubForm.formState.errors.clientSecret.message}</p>
            )}
          </div>

          <div className="bg-blue-50 p-3 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Callback URL for GitHub:</strong>
            </p>
            <code className="text-xs bg-blue-100 px-2 py-1 rounded mt-1 block">
              http://localhost:3000/api/auth/callback/github
            </code>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Adding...' : 'Add GitHub OAuth'}
          </button>
        </form>
      )}

      {activeProvider === 'google' && (
        <form onSubmit={googleForm.handleSubmit(onSubmitGoogle)} className="space-y-4">
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setActiveProvider(null)}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              ← Back to providers
            </button>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client ID
            </label>
            <input
              {...googleForm.register('clientId')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="xxxxxxxx.apps.googleusercontent.com"
            />
            {googleForm.formState.errors.clientId && (
              <p className="mt-1 text-sm text-red-600">{googleForm.formState.errors.clientId.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client Secret
            </label>
            <input
              {...googleForm.register('clientSecret')}
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Client secret from Google"
            />
            {googleForm.formState.errors.clientSecret && (
              <p className="mt-1 text-sm text-red-600">{googleForm.formState.errors.clientSecret.message}</p>
            )}
          </div>

          <div className="bg-blue-50 p-3 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Callback URL for Google:</strong>
            </p>
            <code className="text-xs bg-blue-100 px-2 py-1 rounded mt-1 block">
              http://localhost:3000/api/auth/callback/google
            </code>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Adding...' : 'Add Google OAuth'}
          </button>
        </form>
      )}

      {message && (
        <div
          className={`mt-4 p-3 rounded-md ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  )
}