'use client'

import { useState } from 'react'
import { LoginForm } from './components/login-form'
import { SignupForm } from './components/signup-form'
import { authService } from '@/lib/auth/factory'
import type { AuthUser } from '@/lib/auth/types'

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)

  const handleSuccess = (user: AuthUser) => {
    setCurrentUser(user)
    setMessage({
      type: 'success',
      text: `Successfully ${activeTab === 'login' ? 'signed in' : 'signed up'}!`
    })
  }

  const handleError = (error: string) => {
    setMessage({
      type: 'error',
      text: error
    })
  }

  const handleSignOut = async () => {
    await authService.signOut()
    setCurrentUser(null)
    setMessage(null)
  }

  const authConfig = authService.getConfiguration()

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Authentication & User Management
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              Section 2: Auth.js + user CRUD + OAuth
            </p>
          </div>

          {/* Service Status */}
          <div className="mb-6 p-4 bg-gray-50 rounded-md">
            <h3 className="font-medium text-gray-900 mb-2">Auth Service Status</h3>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-green-600">✅ Configured</span>
                <span className="text-gray-600">
                  {authConfig.provider === 'mock' ? 'Mock Auth' : 'Real Auth'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-blue-600">🔧 OAuth:</span>
                <span className="text-gray-600">
                  {authConfig.oauthProviders.join(', ')} (coming soon)
                </span>
              </div>
            </div>
          </div>

          {/* Success/Error Messages */}
          {message && (
            <div
              className={`p-3 rounded-md mb-4 ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800'
                  : 'bg-red-50 text-red-800'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Current User Info */}
          {currentUser && (
            <div className="mb-6 p-4 bg-blue-50 rounded-md">
              <h3 className="font-medium text-blue-900 mb-2">Current User</h3>
              <div className="text-sm text-blue-800">
                <p><strong>ID:</strong> {currentUser.id}</p>
                <p><strong>Email:</strong> {currentUser.email}</p>
                {currentUser.name && <p><strong>Name:</strong> {currentUser.name}</p>}
              </div>
              <button
                onClick={handleSignOut}
                className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Sign Out
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-2 px-4 text-sm font-medium ${
                activeTab === 'login'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              role="tab"
            >
              Login
            </button>
            <button
              onClick={() => setActiveTab('signup')}
              className={`flex-1 py-2 px-4 text-sm font-medium ${
                activeTab === 'signup'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              role="tab"
            >
              Sign Up
            </button>
          </div>

          {/* Forms */}
          {activeTab === 'login' ? (
            <LoginForm onSuccess={handleSuccess} onError={handleError} />
          ) : (
            <SignupForm onSuccess={handleSuccess} onError={handleError} />
          )}
        </div>
      </div>
    </div>
  )
}