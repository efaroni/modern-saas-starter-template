'use client';

import React from 'react';

import { authLogger } from './logger';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorBoundaryFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryFallbackProps {
  error: Error;
  errorInfo: React.ErrorInfo;
  resetError: () => void;
}

export class AuthErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to our auth logger
    authLogger.log('error', 'Auth component error caught by boundary', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });

    // Log as a security event if it might be malicious
    if (this.isPotentialSecurityError(error)) {
      authLogger.logSecurityEvent({
        type: 'brute_force',
        severity: 'medium',
        details: {
          errorMessage: error.message,
          errorStack: error.stack,
          componentStack: errorInfo.componentStack,
          userAgent: navigator.userAgent,
        },
        timestamp: new Date(),
        actionTaken: 'error_boundary_triggered',
      });
    }

    this.setState({
      errorInfo,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  private isPotentialSecurityError(error: Error): boolean {
    const suspiciousPatterns = [
      'script',
      'eval',
      'innerHTML',
      'document.write',
      'javascript:', // eslint-disable-line no-script-url
      'data:',
      'vbscript:',
      'onload',
      'onerror',
      'onclick',
    ];

    const errorMessage = error.message.toLowerCase();
    return suspiciousPatterns.some(pattern => errorMessage.includes(pattern));
  }

  private resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultAuthErrorFallback;
      return (
        <FallbackComponent
          error={this.state.error || new Error('Unknown error')}
          errorInfo={this.state.errorInfo || { componentStack: '' }}
          resetError={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

const DefaultAuthErrorFallback: React.FC<ErrorBoundaryFallbackProps> = ({
  error,
  resetError,
}) => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className='flex min-h-screen items-center justify-center bg-gray-50'>
      <div className='w-full max-w-md space-y-8 p-8'>
        <div className='text-center'>
          <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100'>
            <svg
              className='h-6 w-6 text-red-600'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
              />
            </svg>
          </div>
          <h2 className='mt-6 text-3xl font-bold text-gray-900'>
            Authentication Error
          </h2>
          <p className='mt-2 text-sm text-gray-600'>
            Something went wrong with the authentication system.
          </p>
        </div>

        {isDevelopment && (
          <div className='rounded-md border border-red-200 bg-red-50 p-4'>
            <h3 className='text-sm font-medium text-red-800'>
              Error Details (Development Only)
            </h3>
            <pre className='mt-2 text-xs whitespace-pre-wrap text-red-700'>
              {error.message}
            </pre>
          </div>
        )}

        <div className='flex space-x-4'>
          <button
            onClick={resetError}
            className='flex flex-1 justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none'
          >
            Try Again
          </button>
          <button
            onClick={() => (window.location.href = '/')}
            className='flex flex-1 justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none'
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
};

// Higher-order component for wrapping auth components
export function withAuthErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<ErrorBoundaryFallbackProps>,
) {
  const WrappedComponent: React.FC<P> = props => {
    return (
      <AuthErrorBoundary fallback={fallback}>
        <Component {...props} />
      </AuthErrorBoundary>
    );
  };

  WrappedComponent.displayName = `withAuthErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Hook for handling errors in functional components
export function useAuthErrorHandler() {
  const handleError = React.useCallback((error: Error, context?: string) => {
    authLogger.log('error', `Auth error in ${context || 'component'}`, {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    // In development, re-throw for debugging
    if (process.env.NODE_ENV === 'development') {
      throw error;
    }
  }, []);

  return handleError;
}
