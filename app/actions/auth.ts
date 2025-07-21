'use server'

import { authService } from '@/lib/auth/factory'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import type { AuthUser, SignUpRequest, UpdateProfileRequest } from '@/lib/auth/types'
import { RateLimiter } from '@/lib/auth/rate-limiter'
import { db } from '@/lib/db/server'

// Initialize rate limiter with database
const rateLimiter = new RateLimiter(db)

// Helper function to get client IP address
function getClientIP(): string {
  const headersList = headers()
  const forwarded = headersList.get('x-forwarded-for')
  const realIP = headersList.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP.trim()
  }
  
  return 'unknown'
}

export async function loginAction(data: {
  email: string
  password: string
}): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  const clientIP = getClientIP()
  
  try {
    // Check rate limit before attempting login (with error handling)
    let rateLimit
    try {
      rateLimit = await rateLimiter.checkRateLimit(data.email, 'login', clientIP)
      
      if (!rateLimit.allowed) {
        const errorMessage = rateLimit.locked 
          ? `Too many failed attempts. Account locked until ${rateLimit.lockoutEndTime?.toLocaleTimeString()}`
          : `Too many attempts. Please try again in ${Math.ceil((rateLimit.resetTime.getTime() - Date.now()) / 60000)} minutes`
        
        return { success: false, error: errorMessage }
      }
    } catch (rateLimitError) {
      // If rate limiting fails, continue with authentication (fail open)
      console.warn('Rate limiting check failed:', rateLimitError)
    }
    
    const service = await authService
    const result = await service.signIn(data)
    
    // Record the attempt (with error handling)
    try {
      await rateLimiter.recordAttempt(
        data.email, 
        'login', 
        result.success, 
        clientIP,
        headers().get('user-agent') || undefined,
        result.user?.id
      )
    } catch (recordError) {
      // If recording fails, log but don't fail the auth request
      console.warn('Failed to record auth attempt:', recordError)
    }
    
    if (result.success && result.user) {
      revalidatePath('/')
      return { success: true, user: result.user }
    } else {
      return { success: false, error: result.error || 'Login failed' }
    }
  } catch (error) {
    // Try to record failed attempt due to error, but don't let it fail
    try {
      await rateLimiter.recordAttempt(data.email, 'login', false, clientIP, headers().get('user-agent') || undefined)
    } catch (recordError) {
      console.warn('Failed to record failed auth attempt:', recordError)
    }
    
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
  const clientIP = getClientIP()
  
  try {
    // Check rate limit before attempting signup
    const rateLimit = await rateLimiter.checkRateLimit(data.email, 'signup', clientIP)
    
    if (!rateLimit.allowed) {
      const errorMessage = rateLimit.locked 
        ? `Too many signup attempts. Please try again after ${rateLimit.lockoutEndTime?.toLocaleTimeString()}`
        : `Too many attempts. Please try again in ${Math.ceil((rateLimit.resetTime.getTime() - Date.now()) / 60000)} minutes`
      
      return { success: false, error: errorMessage }
    }
    
    const service = await authService
    const result = await service.signUp(data)
    
    // Record the attempt
    await rateLimiter.recordAttempt(
      data.email, 
      'signup', 
      result.success, 
      clientIP,
      headers().get('user-agent') || undefined,
      result.user?.id
    )
    
    if (result.success && result.user) {
      revalidatePath('/')
      return { success: true, user: result.user }
    } else {
      return { success: false, error: result.error || 'Signup failed' }
    }
  } catch (error) {
    // Record failed attempt due to error
    await rateLimiter.recordAttempt(data.email, 'signup', false, clientIP, headers().get('user-agent') || undefined)
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }
  }
}

export async function logoutAction(): Promise<{ success: boolean; error?: string }> {
  try {
    const service = await authService
    const result = await service.signOut()
    
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
    const service = await authService
    // Get current user first
    const currentUser = await service.getUser()
    if (!currentUser.success || !currentUser.user) {
      return { success: false, error: 'User not authenticated' }
    }
    const result = await service.updateUserProfile(currentUser.user.id, data)
    
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
    const service = await authService
    // Get current user first
    const currentUser = await service.getUser()
    if (!currentUser.success || !currentUser.user) {
      return { success: false, error: 'User not authenticated' }
    }
    const result = await service.changePassword(currentUser.user.id, {
      currentPassword: data.currentPassword,
      newPassword: data.newPassword
    })
    
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
  const clientIP = getClientIP()
  
  try {
    // Check rate limit before attempting password reset
    const rateLimit = await rateLimiter.checkRateLimit(email, 'passwordReset', clientIP)
    
    if (!rateLimit.allowed) {
      const errorMessage = rateLimit.locked 
        ? `Too many password reset attempts. Please try again after ${rateLimit.lockoutEndTime?.toLocaleTimeString()}`
        : `Too many attempts. Please try again in ${Math.ceil((rateLimit.resetTime.getTime() - Date.now()) / 60000)} minutes`
      
      return { success: false, error: errorMessage }
    }
    
    const service = await authService
    const result = await service.requestPasswordReset(email)
    
    // Record the attempt
    await rateLimiter.recordAttempt(
      email, 
      'passwordReset', 
      result.success, 
      clientIP,
      headers().get('user-agent') || undefined
    )
    
    if (result.success) {
      return { success: true }
    } else {
      return { success: false, error: result.error || 'Password reset request failed' }
    }
  } catch (error) {
    // Record failed attempt due to error
    await rateLimiter.recordAttempt(email, 'passwordReset', false, clientIP, headers().get('user-agent') || undefined)
    
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
    const service = await authService
    const result = await service.resetPasswordWithToken(data.token, data.newPassword)
    
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
    const service = await authService
    // Get current user first
    const currentUser = await service.getUser()
    if (!currentUser.success || !currentUser.user) {
      return { success: false, error: 'User not authenticated' }
    }
    const result = await service.deleteUserAccount(currentUser.user.id)
    
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
    const service = await authService
    const result = await service.getUser()
    const user = result.success ? result.user : null
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
    // For now, return a basic configuration
    // TODO: Add method to AuthService to expose provider configuration
    return {
      provider: 'database',
      oauthProviders: []
    }
  } catch {
    // Return mock config if service unavailable
    return {
      provider: 'mock',
      oauthProviders: []
    }
  }
}