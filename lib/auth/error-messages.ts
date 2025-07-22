export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'USER_NOT_FOUND'
  | 'EMAIL_ALREADY_EXISTS'
  | 'WEAK_PASSWORD'
  | 'RATE_LIMITED'
  | 'ACCOUNT_LOCKED'
  | 'EMAIL_NOT_VERIFIED'
  | 'INVALID_TOKEN'
  | 'EXPIRED_TOKEN'
  | 'OAUTH_ERROR'
  | 'NETWORK_ERROR'
  | 'SERVER_ERROR'
  | 'VALIDATION_ERROR'
  | 'PASSWORD_REUSE'
  | 'EMAIL_SEND_FAILED'
  | 'SESSION_EXPIRED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN';

export interface AuthErrorMessage {
  code: AuthErrorCode;
  title: string;
  message: string;
  action?: string;
  details?: string;
  retryable: boolean;
  severity: 'low' | 'medium' | 'high';
}

export class AuthErrorMessageProvider {
  private static readonly ERROR_MESSAGES: Record<
    AuthErrorCode,
    AuthErrorMessage
  > = {
    INVALID_CREDENTIALS: {
      code: 'INVALID_CREDENTIALS',
      title: 'Invalid Credentials',
      message: 'The email or password you entered is incorrect.',
      action: 'Please check your credentials and try again.',
      retryable: true,
      severity: 'low',
    },

    USER_NOT_FOUND: {
      code: 'USER_NOT_FOUND',
      title: 'Account Not Found',
      message: 'No account found with this email address.',
      action: 'Please check your email or sign up for a new account.',
      retryable: false,
      severity: 'low',
    },

    EMAIL_ALREADY_EXISTS: {
      code: 'EMAIL_ALREADY_EXISTS',
      title: 'Email Already Registered',
      message: 'An account with this email address already exists.',
      action: 'Please sign in instead or use a different email address.',
      retryable: false,
      severity: 'low',
    },

    WEAK_PASSWORD: {
      code: 'WEAK_PASSWORD',
      title: 'Weak Password',
      message: "Your password doesn't meet the security requirements.",
      action:
        'Please choose a stronger password with at least 8 characters, including uppercase, lowercase, numbers, and symbols.',
      retryable: true,
      severity: 'medium',
    },

    RATE_LIMITED: {
      code: 'RATE_LIMITED',
      title: 'Too Many Attempts',
      message: "You've made too many attempts in a short period.",
      action: 'Please wait a few minutes before trying again.',
      retryable: true,
      severity: 'medium',
    },

    ACCOUNT_LOCKED: {
      code: 'ACCOUNT_LOCKED',
      title: 'Account Temporarily Locked',
      message:
        'Your account has been temporarily locked due to multiple failed login attempts.',
      action: 'Please try again later or reset your password.',
      retryable: true,
      severity: 'high',
    },

    EMAIL_NOT_VERIFIED: {
      code: 'EMAIL_NOT_VERIFIED',
      title: 'Email Not Verified',
      message: 'Please verify your email address to continue.',
      action: 'Check your email for a verification link or request a new one.',
      retryable: false,
      severity: 'medium',
    },

    INVALID_TOKEN: {
      code: 'INVALID_TOKEN',
      title: 'Invalid Link',
      message: 'This link is invalid or has been used already.',
      action: 'Please request a new verification or reset link.',
      retryable: false,
      severity: 'low',
    },

    EXPIRED_TOKEN: {
      code: 'EXPIRED_TOKEN',
      title: 'Link Expired',
      message: 'This link has expired and is no longer valid.',
      action: 'Please request a new verification or reset link.',
      retryable: false,
      severity: 'low',
    },

    OAUTH_ERROR: {
      code: 'OAUTH_ERROR',
      title: 'Sign-in Error',
      message: 'There was a problem signing in with your selected provider.',
      action: 'Please try again or use a different sign-in method.',
      retryable: true,
      severity: 'medium',
    },

    NETWORK_ERROR: {
      code: 'NETWORK_ERROR',
      title: 'Connection Problem',
      message: 'Unable to connect to our servers.',
      action: 'Please check your internet connection and try again.',
      retryable: true,
      severity: 'medium',
    },

    SERVER_ERROR: {
      code: 'SERVER_ERROR',
      title: 'Server Error',
      message: 'Something went wrong on our end.',
      action: 'Please try again in a few moments.',
      details: 'If the problem persists, please contact support.',
      retryable: true,
      severity: 'high',
    },

    VALIDATION_ERROR: {
      code: 'VALIDATION_ERROR',
      title: 'Invalid Input',
      message: 'Please check your input and try again.',
      action: 'Make sure all required fields are filled correctly.',
      retryable: true,
      severity: 'low',
    },

    PASSWORD_REUSE: {
      code: 'PASSWORD_REUSE',
      title: 'Password Previously Used',
      message: 'You cannot reuse a recent password.',
      action:
        "Please choose a different password that you haven't used before.",
      retryable: true,
      severity: 'medium',
    },

    EMAIL_SEND_FAILED: {
      code: 'EMAIL_SEND_FAILED',
      title: 'Email Delivery Failed',
      message: "We couldn't send the email to your address.",
      action: 'Please check your email address and try again.',
      details: 'If the problem persists, please contact support.',
      retryable: true,
      severity: 'medium',
    },

    SESSION_EXPIRED: {
      code: 'SESSION_EXPIRED',
      title: 'Session Expired',
      message: 'Your session has expired for security reasons.',
      action: 'Please sign in again to continue.',
      retryable: false,
      severity: 'low',
    },

    UNAUTHORIZED: {
      code: 'UNAUTHORIZED',
      title: 'Not Authorized',
      message: 'You need to be signed in to access this resource.',
      action: 'Please sign in and try again.',
      retryable: false,
      severity: 'low',
    },

    FORBIDDEN: {
      code: 'FORBIDDEN',
      title: 'Access Denied',
      message: "You don't have permission to access this resource.",
      action: 'Please contact support if you believe this is an error.',
      retryable: false,
      severity: 'medium',
    },
  };

  static getErrorMessage(code: AuthErrorCode): AuthErrorMessage {
    return this.ERROR_MESSAGES[code] || this.ERROR_MESSAGES.SERVER_ERROR;
  }

  static getErrorFromString(error: string): AuthErrorMessage {
    // Map common error strings to error codes
    const errorLower = error.toLowerCase();

    if (
      errorLower.includes('invalid credentials') ||
      errorLower.includes('incorrect password')
    ) {
      return this.getErrorMessage('INVALID_CREDENTIALS');
    }

    if (
      errorLower.includes('user not found') ||
      errorLower.includes('account not found')
    ) {
      return this.getErrorMessage('USER_NOT_FOUND');
    }

    if (
      errorLower.includes('email already exists') ||
      errorLower.includes('already registered')
    ) {
      return this.getErrorMessage('EMAIL_ALREADY_EXISTS');
    }

    if (
      errorLower.includes('password') &&
      (errorLower.includes('weak') || errorLower.includes('requirements'))
    ) {
      return this.getErrorMessage('WEAK_PASSWORD');
    }

    if (
      errorLower.includes('rate limit') ||
      errorLower.includes('too many attempts')
    ) {
      return this.getErrorMessage('RATE_LIMITED');
    }

    if (
      errorLower.includes('account locked') ||
      errorLower.includes('temporarily locked')
    ) {
      return this.getErrorMessage('ACCOUNT_LOCKED');
    }

    if (
      errorLower.includes('email not verified') ||
      errorLower.includes('verify email')
    ) {
      return this.getErrorMessage('EMAIL_NOT_VERIFIED');
    }

    if (
      errorLower.includes('invalid token') ||
      errorLower.includes('invalid link')
    ) {
      return this.getErrorMessage('INVALID_TOKEN');
    }

    if (
      errorLower.includes('expired token') ||
      errorLower.includes('expired link')
    ) {
      return this.getErrorMessage('EXPIRED_TOKEN');
    }

    if (errorLower.includes('oauth') || errorLower.includes('provider')) {
      return this.getErrorMessage('OAUTH_ERROR');
    }

    if (errorLower.includes('network') || errorLower.includes('connection')) {
      return this.getErrorMessage('NETWORK_ERROR');
    }

    if (
      errorLower.includes('reuse') ||
      errorLower.includes('recent password')
    ) {
      return this.getErrorMessage('PASSWORD_REUSE');
    }

    if (errorLower.includes('email') && errorLower.includes('send')) {
      return this.getErrorMessage('EMAIL_SEND_FAILED');
    }

    if (
      errorLower.includes('session expired') ||
      errorLower.includes('session invalid')
    ) {
      return this.getErrorMessage('SESSION_EXPIRED');
    }

    if (
      errorLower.includes('unauthorized') ||
      errorLower.includes('not authorized')
    ) {
      return this.getErrorMessage('UNAUTHORIZED');
    }

    if (
      errorLower.includes('forbidden') ||
      errorLower.includes('access denied')
    ) {
      return this.getErrorMessage('FORBIDDEN');
    }

    if (
      errorLower.includes('validation') ||
      errorLower.includes('invalid input')
    ) {
      return this.getErrorMessage('VALIDATION_ERROR');
    }

    // Default to server error for unknown errors
    return this.getErrorMessage('SERVER_ERROR');
  }

  static formatErrorForUI(error: AuthErrorMessage): {
    title: string;
    message: string;
    action?: string;
    details?: string;
    variant: 'error' | 'warning' | 'info';
    canRetry: boolean;
  } {
    let variant: 'error' | 'warning' | 'info';
    if (error.severity === 'high') {
      variant = 'error';
    } else if (error.severity === 'medium') {
      variant = 'warning';
    } else {
      variant = 'info';
    }

    return {
      title: error.title,
      message: error.message,
      action: error.action,
      details: error.details,
      variant,
      canRetry: error.retryable,
    };
  }
}

// Utility function to handle auth errors consistently
export function handleAuthError(error: unknown): AuthErrorMessage {
  if (typeof error === 'string') {
    return AuthErrorMessageProvider.getErrorFromString(error);
  }

  if (error instanceof Error) {
    return AuthErrorMessageProvider.getErrorFromString(error.message);
  }

  return AuthErrorMessageProvider.getErrorMessage('SERVER_ERROR');
}

// React hook for handling auth errors
export function useAuthErrorHandler() {
  const formatError = (error: unknown) => {
    const authError = handleAuthError(error);
    return AuthErrorMessageProvider.formatErrorForUI(authError);
  };

  return { formatError };
}
