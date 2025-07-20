'use server'

import { authService } from '@/lib/auth/factory'
import { revalidatePath } from 'next/cache'
import type { AuthUser, SignUpRequest, UpdateProfileRequest } from '@/lib/auth/types'

export async function loginAction(data: {
  email: string
  password: string
}): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  try {
    const result = await authService.signIn(data)
    
    if (result.success && result.user) {
      revalidatePath('/')
      return { success: true, user: result.user }
    } else {
      return { success: false, error: result.error || 'Login failed' }
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }
  }
}

export async function signupAction(data: SignUpRequest): Promise<{ 
  success: boolean; 
  user?: AuthUser; 
  error?: string 
}> {
  try {
    const result = await authService.signup(data)
    
    if (result.success && result.user) {
      revalidatePath('/')
      return { success: true, user: result.user }
    } else {
      return { success: false, error: result.error || 'Signup failed' }
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }
  }
}

export async function logoutAction(): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await authService.logout()
    
    if (result.success) {
      revalidatePath('/')
      return { success: true }
    } else {
      return { success: false, error: result.error || 'Logout failed' }
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }
  }
}

export async function updateProfileAction(data: UpdateProfileRequest): Promise<{ 
  success: boolean; 
  user?: AuthUser; 
  error?: string 
}> {
  try {
    const result = await authService.updateProfile(data)
    
    if (result.success && result.user) {
      revalidatePath('/')
      return { success: true, user: result.user }
    } else {
      return { success: false, error: result.error || 'Profile update failed' }
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }
  }
}

export async function changePasswordAction(data: {
  currentPassword: string
  newPassword: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await authService.changePassword(data.currentPassword, data.newPassword)
    
    if (result.success) {
      revalidatePath('/')
      return { success: true }
    } else {
      return { success: false, error: result.error || 'Password change failed' }
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }
  }
}

export async function requestPasswordResetAction(email: string): Promise<{ 
  success: boolean; 
  error?: string 
}> {
  try {
    const result = await authService.requestPasswordReset(email)
    
    if (result.success) {
      return { success: true }
    } else {
      return { success: false, error: result.error || 'Password reset request failed' }
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }
  }
}

export async function resetPasswordAction(data: {
  token: string
  newPassword: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await authService.resetPassword(data.token, data.newPassword)
    
    if (result.success) {
      revalidatePath('/')
      return { success: true }
    } else {
      return { success: false, error: result.error || 'Password reset failed' }
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }
  }
}

export async function deleteAccountAction(password: string): Promise<{ 
  success: boolean; 
  error?: string 
}> {
  try {
    const result = await authService.deleteAccount(password)
    
    if (result.success) {
      revalidatePath('/')
      return { success: true }
    } else {
      return { success: false, error: result.error || 'Account deletion failed' }
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }
  }
}

export async function getCurrentUserAction(): Promise<{ 
  success: boolean; 
  user?: AuthUser | null; 
  error?: string 
}> {
  try {
    const user = await authService.getCurrentUser()
    return { success: true, user }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get current user' 
    }
  }
}

export async function getAuthConfigurationAction() {
  try {
    const config = authService.getConfiguration()
    return config
  } catch {
    // Return mock config if service unavailable
    return {
      provider: 'mock',
      oauthProviders: []
    }
  }
}