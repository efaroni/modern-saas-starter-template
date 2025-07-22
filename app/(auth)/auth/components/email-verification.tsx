'use client';

import { useState } from 'react';

interface EmailVerificationProps {
  email: string
  onVerificationSent?: () => void
}

export function EmailVerification({ email, onVerificationSent }: EmailVerificationProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const sendVerificationEmail = async () => {
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setMessage('Verification email sent successfully! Please check your inbox.');
        onVerificationSent?.();
      } else {
        setMessage(data.error || 'Failed to send verification email');
      }
    } catch {
      setMessage('An error occurred while sending verification email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800">
            Email Verification Required
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>
              Your email address <strong>{email}</strong> needs to be verified before you can use all features.
            </p>
          </div>
          <div className="mt-4">
            <div className="-mx-2 -my-1.5 flex">
              <button
                type="button"
                onClick={sendVerificationEmail}
                disabled={loading || success}
                className="bg-yellow-50 px-2 py-1.5 rounded-md text-sm font-medium text-yellow-800 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-yellow-50 focus:ring-yellow-600 disabled:opacity-50"
              >
                {loading ? 'Sending...' : success ? 'Email Sent!' : 'Send Verification Email'}
              </button>
            </div>
          </div>
          {message && (
            <div className={`mt-3 text-sm ${success ? 'text-green-700' : 'text-red-700'}`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}