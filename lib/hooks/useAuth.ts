'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  loginAction, 
  signupAction, 
  logoutAction, 
  getCurrentUserAction,
  updateProfileAction,
  changePasswordAction,
  requestPasswordResetAction,
  resetPasswordAction,
  deleteAccountAction
} from '@/app/actions/auth'
import type { AuthUser, SignUpRequest, UpdateProfileRequest } from '@/lib/auth/types'

interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  error: string | null
}

interface AuthActions {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signup: (data: SignUpRequest) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<{ success: boolean; error?: string }>
  updateProfile: (data: UpdateProfileRequest) => Promise<{ success: boolean; error?: string }>
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>
  requestPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; error?: string }>
  deleteAccount: (password: string) => Promise<{ success: boolean; error?: string }>
  refreshUser: () => Promise<void>
  clearError: () => void
}

export function useAuth(): AuthState & AuthActions {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null
  })

  // Load current user on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const result = await getCurrentUserAction()
        if (result.success && result.user) {
          setState(prev => ({ ...prev, user: result.user || null, isLoading: false }))
        } else {
          setState(prev => ({ ...prev, user: null, isLoading: false }))
        }
      } catch {
        setState(prev => ({ ...prev, user: null, isLoading: false }))
      }
    }

    loadUser()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const result = await loginAction({ email, password })
      
      if (result.success && result.user) {
        setState(prev => ({ ...prev, user: result.user || null, isLoading: false }))
        return { success: true }
      } else {
        setState(prev => ({ ...prev, error: result.error || 'Login failed', isLoading: false }))
        return { success: false, error: result.error || 'Login failed' }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed'
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }))
      return { success: false, error: errorMessage }
    }
  }, [])

  const signup = useCallback(async (data: SignUpRequest) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const result = await signupAction(data)
      
      if (result.success && result.user) {
        setState(prev => ({ ...prev, user: result.user || null, isLoading: false }))
        return { success: true }
      } else {
        setState(prev => ({ ...prev, error: result.error || 'Signup failed', isLoading: false }))
        return { success: false, error: result.error || 'Signup failed' }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Signup failed'
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }))
      return { success: false, error: errorMessage }
    }
  }, [])

  const logout = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const result = await logoutAction()
      setState(prev => ({ ...prev, user: null, isLoading: false }))
      return { success: result.success, error: result.error }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Logout failed'
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }))
      return { success: false, error: errorMessage }
    }
  }, [])

  const updateProfile = useCallback(async (data: UpdateProfileRequest) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const result = await updateProfileAction(data)
      
      if (result.success && result.user) {
        setState(prev => ({ ...prev, user: result.user || null, isLoading: false }))
        return { success: true }
      } else {
        setState(prev => ({ ...prev, error: result.error || 'Profile update failed', isLoading: false }))
        return { success: false, error: result.error || 'Profile update failed' }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Profile update failed'
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }))
      return { success: false, error: errorMessage }
    }
  }, [])

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const result = await changePasswordAction({ currentPassword, newPassword })
      setState(prev => ({ ...prev, isLoading: false }))
      return { success: result.success, error: result.error }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password change failed'
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }))
      return { success: false, error: errorMessage }
    }
  }, [])

  const requestPasswordReset = useCallback(async (email: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const result = await requestPasswordResetAction({ email })
      setState(prev => ({ ...prev, isLoading: false }))
      return { success: result.success, error: result.error }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password reset request failed'
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }))
      return { success: false, error: errorMessage }
    }
  }, [])

  const resetPassword = useCallback(async (token: string, newPassword: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const result = await resetPasswordAction({ token, newPassword })
      setState(prev => ({ ...prev, isLoading: false }))
      return { success: result.success, error: result.error }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password reset failed'
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }))
      return { success: false, error: errorMessage }
    }
  }, [])

  const deleteAccount = useCallback(async (password: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const result = await deleteAccountAction(password)
      
      if (result.success) {
        setState(prev => ({ ...prev, user: null, isLoading: false }))
      } else {
        setState(prev => ({ ...prev, isLoading: false }))
      }
      
      return { success: result.success, error: result.error }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Account deletion failed'
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }))
      return { success: false, error: errorMessage }
    }
  }, [])

  const refreshUser = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }))
    
    try {
      const result = await getCurrentUserAction()
      setState(prev => ({ 
        ...prev, 
        user: result.success ? result.user || null : null, 
        isLoading: false 
      }))
    } catch {
      setState(prev => ({ ...prev, user: null, isLoading: false }))
    }
  }, [])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    ...state,
    login,
    signup,
    logout,
    updateProfile,
    changePassword,
    requestPasswordReset,
    resetPassword,
    deleteAccount,
    refreshUser,
    clearError
  }
}