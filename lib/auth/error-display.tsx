'use client';

import React from 'react';

import { AuthErrorMessageProvider } from './error-messages';

interface ErrorDisplayProps {
  error: unknown
  className?: string
  showRetry?: boolean
  onRetry?: () => void
}

export function AuthErrorDisplay({
  error,
  className = '',
  showRetry = false,
  onRetry,
}: ErrorDisplayProps) {
  const authError = React.useMemo(() => {
    if (!error) return null;
    if (typeof error === 'string') {
      return AuthErrorMessageProvider.getErrorFromString(error);
    }

    if (error instanceof Error) {
      return AuthErrorMessageProvider.getErrorFromString(error.message);
    }

    return AuthErrorMessageProvider.getErrorMessage('SERVER_ERROR');
  }, [error]);

  if (!error || !authError) return null;

  const formatted = AuthErrorMessageProvider.formatErrorForUI(authError);

  const getIconColor = () => {
    switch (formatted.variant) {
      case 'error': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      case 'info': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getBgColor = () => {
    switch (formatted.variant) {
      case 'error': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'info': return 'bg-blue-50 border-blue-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getTextColor = () => {
    switch (formatted.variant) {
      case 'error': return 'text-red-800';
      case 'warning': return 'text-yellow-800';
      case 'info': return 'text-blue-800';
      default: return 'text-gray-800';
    }
  };

  return (
    <div className={`rounded-md border p-4 ${getBgColor()} ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          {formatted.variant === 'error' && (
            <svg className={`h-5 w-5 ${getIconColor()}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
          {formatted.variant === 'warning' && (
            <svg className={`h-5 w-5 ${getIconColor()}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )}
          {formatted.variant === 'info' && (
            <svg className={`h-5 w-5 ${getIconColor()}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${getTextColor()}`}>
            {formatted.title}
          </h3>
          <div className={`mt-2 text-sm ${getTextColor()}`}>
            <p>{formatted.message}</p>
            {formatted.action && (
              <p className="mt-1 font-medium">{formatted.action}</p>
            )}
            {formatted.details && (
              <p className="mt-1 text-xs opacity-75">{formatted.details}</p>
            )}
          </div>
          {showRetry && formatted.canRetry && onRetry && (
            <div className="mt-3">
              <button
                onClick={onRetry}
                className={`text-sm font-medium ${getTextColor()} hover:underline focus:outline-none focus:underline`}
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface InlineErrorProps {
  error: unknown
  className?: string
}

export function InlineAuthError({ error, className = '' }: InlineErrorProps) {
  const authError = React.useMemo(() => {
    if (!error) return null;
    if (typeof error === 'string') {
      return AuthErrorMessageProvider.getErrorFromString(error);
    }

    if (error instanceof Error) {
      return AuthErrorMessageProvider.getErrorFromString(error.message);
    }

    return AuthErrorMessageProvider.getErrorMessage('SERVER_ERROR');
  }, [error]);

  if (!error || !authError) return null;

  return (
    <p className={`text-sm text-red-600 ${className}`}>
      {authError.message}
    </p>
  );
}

// Toast notification version
export interface ToastErrorProps {
  error: unknown
  onDismiss: () => void
}

export function AuthErrorToast({ error, onDismiss }: ToastErrorProps) {
  const authError = React.useMemo(() => {
    if (!error) return null;
    if (typeof error === 'string') {
      return AuthErrorMessageProvider.getErrorFromString(error);
    }

    if (error instanceof Error) {
      return AuthErrorMessageProvider.getErrorFromString(error.message);
    }

    return AuthErrorMessageProvider.getErrorMessage('SERVER_ERROR');
  }, [error]);

  const formatted = React.useMemo(() => {
    if (!error || !authError) return null;
    return AuthErrorMessageProvider.formatErrorForUI(authError);
  }, [error, authError]);

  React.useEffect(() => {
    if (!formatted || formatted.variant === 'error') return;
    // Auto-dismiss after 5 seconds for non-critical errors
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [formatted, onDismiss]);

  if (!error || !authError || !formatted) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full bg-white shadow-lg rounded-lg border border-gray-200">
      <div className="p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-gray-900">
              {formatted.title}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {formatted.message}
            </p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={onDismiss}
              className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}