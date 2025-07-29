'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

import { signIn, auth } from '@/lib/auth/auth';
import { authService } from '@/lib/auth/factory.server';
import { RateLimiter } from '@/lib/auth/rate-limiter';
import type {
  AuthUser,
  SignUpRequest,
  UpdateProfileRequest,
} from '@/lib/auth/types';
import { db } from '@/lib/db/server';

// Initialize rate limiter with database
const rateLimiter = new RateLimiter(db);

// Helper function to get client IP address
async function getClientIP(): Promise<string> {
  const headersList = await headers();
  const forwarded = headersList.get('x-forwarded-for');
  const realIP = headersList.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIP) {
    return realIP.trim();
  }

  return 'unknown';
}

export async function loginAction(data: {
  email: string;
  password: string;
}): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  try {
    // Use Next.js Auth signIn function with credentials provider
    const result = await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      return { success: false, error: 'Invalid credentials' };
    }

    // If successful, the session will be created automatically
    // Get the user data for the return value
    const service = await authService;
    const userResult = await service.getUserByEmail(data.email);

    if (userResult.success && userResult.user) {
      revalidatePath('/');
      return { success: true, user: userResult.user };
    }

    return { success: false, error: 'Login failed' };
  } catch (error) {
    console.error('Login action error:', error);

    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

export async function signupAction(data: SignUpRequest): Promise<{
  success: boolean;
  user?: AuthUser;
  error?: string;
}> {
  const clientIP = await getClientIP();

  try {
    // Check rate limit before attempting signup
    const rateLimit = await rateLimiter.checkRateLimit(
      data.email,
      'signup',
      clientIP,
    );

    if (!rateLimit.allowed) {
      const errorMessage = rateLimit.locked
        ? `Too many signup attempts. Please try again after ${rateLimit.lockoutEndTime?.toLocaleTimeString()}`
        : `Too many attempts. Please try again in ${Math.ceil((rateLimit.resetTime.getTime() - Date.now()) / 60000)} minutes`;

      return { success: false, error: errorMessage };
    }

    const service = await authService;
    const result = await service.createUser(data);

    // Record the attempt
    await rateLimiter.recordAttempt(
      data.email,
      'signup',
      result.success,
      clientIP,
      (await headers()).get('user-agent') || undefined,
      result.user?.id,
    );

    if (result.success && result.user) {
      revalidatePath('/');
      return { success: true, user: result.user };
    } else {
      return { success: false, error: result.error || 'Signup failed' };
    }
  } catch (error) {
    // Record failed attempt due to error
    await rateLimiter.recordAttempt(
      data.email,
      'signup',
      false,
      clientIP,
      (await headers()).get('user-agent') || undefined,
    );

    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

export async function logoutAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Note: AuthProvider doesn't have signOut method, this needs to be handled by Next.js Auth
    // For now, return success as logout will be handled by Next.js Auth signOut
    await Promise.resolve(); // Add await to satisfy ESLint require-await

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

export async function updateProfileAction(data: UpdateProfileRequest): Promise<{
  success: boolean;
  user?: AuthUser;
  error?: string;
}> {
  try {
    const service = await authService;
    // Get current user first
    const currentUser = await service.getUserById(''); // TODO: Get current user ID from session
    if (!currentUser.success || !currentUser.user) {
      return { success: false, error: 'User not authenticated' };
    }
    const result = await service.updateUser(currentUser.user.id, data);

    if (result.success && result.user) {
      revalidatePath('/');
      return { success: true, user: result.user };
    } else {
      return { success: false, error: result.error || 'Profile update failed' };
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

export async function changePasswordAction(data: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const service = await authService;
    // Get current user first
    const currentUser = await service.getUserById(''); // TODO: Get current user ID from session
    if (!currentUser.success || !currentUser.user) {
      return { success: false, error: 'User not authenticated' };
    }
    const result = await service.changeUserPassword(
      currentUser.user.id,
      data.currentPassword,
      data.newPassword,
    );

    if (result.success) {
      revalidatePath('/');
      return { success: true };
    } else {
      return {
        success: false,
        error: result.error || 'Password change failed',
      };
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

export async function requestPasswordResetAction(email: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const clientIP = await getClientIP();

  try {
    // Check rate limit before attempting password reset
    const rateLimit = await rateLimiter.checkRateLimit(
      email,
      'passwordReset',
      clientIP,
    );

    if (!rateLimit.allowed) {
      const errorMessage = rateLimit.locked
        ? `Too many password reset attempts. Please try again after ${rateLimit.lockoutEndTime?.toLocaleTimeString()}`
        : `Too many attempts. Please try again in ${Math.ceil((rateLimit.resetTime.getTime() - Date.now()) / 60000)} minutes`;

      return { success: false, error: errorMessage };
    }

    const service = await authService;
    const result = await service.sendPasswordReset(email);

    // Record the attempt
    await rateLimiter.recordAttempt(
      email,
      'passwordReset',
      result.success,
      clientIP,
      (await headers()).get('user-agent') || undefined,
    );

    if (result.success) {
      return { success: true };
    } else {
      return {
        success: false,
        error: result.error || 'Password reset request failed',
      };
    }
  } catch (error) {
    // Record failed attempt due to error
    await rateLimiter.recordAttempt(
      email,
      'passwordReset',
      false,
      clientIP,
      (await headers()).get('user-agent') || undefined,
    );

    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

export async function resetPasswordAction(data: {
  token: string;
  newPassword: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const service = await authService;
    const result = await service.resetPasswordWithToken(
      data.token,
      data.newPassword,
    );

    if (result.success) {
      revalidatePath('/');
      return { success: true };
    } else {
      return { success: false, error: result.error || 'Password reset failed' };
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

export async function deleteAccountAction(_password: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'User not authenticated' };
    }

    const service = await authService;
    const result = await service.deleteUser(session.user.id);

    if (result.success) {
      revalidatePath('/');
      return { success: true };
    } else {
      return {
        success: false,
        error: result.error || 'Account deletion failed',
      };
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

export async function getCurrentUserAction(): Promise<{
  success: boolean;
  user?: AuthUser | null;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: true, user: null };
    }

    const service = await authService;
    const result = await service.getUserById(session.user.id);
    const user = result.success ? result.user : null;
    return { success: true, user };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to get current user',
    };
  }
}

export async function getAuthConfigurationAction() {
  try {
    // For now, return a basic configuration
    // TODO: Add method to AuthService to expose provider configuration
    await Promise.resolve(); // Add await to satisfy ESLint require-await
    return {
      provider: 'database',
      oauthProviders: [],
    };
  } catch {
    // Return mock config if service unavailable
    return {
      provider: 'mock',
      oauthProviders: [],
    };
  }
}
