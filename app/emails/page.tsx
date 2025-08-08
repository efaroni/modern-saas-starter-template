'use client';

import { useState, useEffect } from 'react';

import { useUser } from '@clerk/nextjs';

interface EmailPreferences {
  marketing: boolean;
  productUpdates: boolean;
  securityAlerts: boolean;
}

interface UserData {
  emailPreferences: EmailPreferences;
  unsubscribeToken: string;
}

export default function EmailsPage() {
  const { user, isLoaded } = useUser();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Test email state
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testSendCount, setTestSendCount] = useState(0);
  const [lastTestSent, setLastTestSent] = useState<Date | null>(null);
  const [testTimeoutUntil, setTestTimeoutUntil] = useState<Date | null>(null);
  const [testMessage, setTestMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    if (isLoaded && user) {
      fetchUserData();
      // Set default test email to user's email
      if (user.emailAddresses?.[0]?.emailAddress) {
        setTestEmail(user.emailAddresses[0].emailAddress);
      }
    }
  }, [isLoaded, user]);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/user/email-preferences');
      if (response.ok) {
        const data = await response.json();
        setUserData(data);
      } else {
        console.error('Failed to fetch user data');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateEmailPreferences = async (newPreferences: EmailPreferences) => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/user/email-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailPreferences: newPreferences }),
      });

      if (response.ok) {
        setUserData(prev =>
          prev ? { ...prev, emailPreferences: newPreferences } : null,
        );
        setMessage({
          type: 'success',
          text: 'Email preferences updated successfully',
        });
      } else {
        const errorData = await response.json();
        setMessage({
          type: 'error',
          text: errorData.error || 'Failed to update preferences',
        });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error occurred' });
    } finally {
      setSaving(false);
    }
  };

  const handlePreferenceChange = (
    key: keyof EmailPreferences,
    value: boolean,
  ) => {
    if (!userData) return;

    const newPreferences = {
      ...userData.emailPreferences,
      [key]: value,
    };

    updateEmailPreferences(newPreferences);
  };

  const getUnsubscribeUrl = () => {
    if (!userData?.unsubscribeToken) return '';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    return `${baseUrl}/unsubscribe?token=${userData.unsubscribeToken}`;
  };

  const sendTestEmail = async () => {
    if (!testEmail) return;

    // Check timeout
    if (testTimeoutUntil && new Date() < testTimeoutUntil) {
      const remainingTime = Math.ceil(
        (testTimeoutUntil.getTime() - Date.now()) / 1000,
      );
      setTestMessage({
        type: 'error',
        text: `Please wait ${remainingTime} seconds before sending another test email`,
      });
      return;
    }

    // Check cooldown
    if (lastTestSent && new Date().getTime() - lastTestSent.getTime() < 5000) {
      const remainingTime = Math.ceil(
        (5000 - (new Date().getTime() - lastTestSent.getTime())) / 1000,
      );
      setTestMessage({
        type: 'error',
        text: `Please wait ${remainingTime} seconds before sending another test email`,
      });
      return;
    }

    setSendingTest(true);
    setTestMessage(null);

    try {
      const response = await fetch('/api/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: testEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        const newCount = testSendCount + 1;
        setTestSendCount(newCount);
        setLastTestSent(new Date());

        // If this is the 5th send, set 2-minute timeout
        if (newCount >= 5) {
          const timeout = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes
          setTestTimeoutUntil(timeout);
          setTestSendCount(0); // Reset counter
        }

        setTestMessage({
          type: 'success',
          text: data.message || 'Test email sent successfully!',
        });
      } else {
        setTestMessage({
          type: 'error',
          text: data.error || 'Failed to send test email',
        });
      }
    } catch {
      setTestMessage({
        type: 'error',
        text: 'Network error occurred while sending test email',
      });
    } finally {
      setSendingTest(false);
    }
  };

  const isTestButtonDisabled = () => {
    if (sendingTest) return true;
    if (testTimeoutUntil && currentTime < testTimeoutUntil.getTime())
      return true;
    if (lastTestSent && currentTime - lastTestSent.getTime() < 5000)
      return true;
    return false;
  };

  const getTestButtonText = () => {
    if (sendingTest) return 'Sending...';
    if (testTimeoutUntil && currentTime < testTimeoutUntil.getTime()) {
      const remainingTime = Math.ceil(
        (testTimeoutUntil.getTime() - currentTime) / 1000,
      );
      return `Wait ${remainingTime}s`;
    }
    if (lastTestSent && currentTime - lastTestSent.getTime() < 5000) {
      const remainingTime = Math.ceil(
        (5000 - (currentTime - lastTestSent.getTime())) / 1000,
      );
      return `Wait ${remainingTime}s`;
    }
    return 'Send Test Email';
  };

  // Update button text every second when there's a cooldown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
      if (testTimeoutUntil && new Date() >= testTimeoutUntil) {
        setTestTimeoutUntil(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [testTimeoutUntil]);

  if (!isLoaded || loading) {
    return (
      <div className='mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8'>
        <div className='mx-auto max-w-2xl'>
          <div className='rounded-lg bg-white p-6 shadow'>
            <div className='animate-pulse'>
              <div className='mb-6 h-8 rounded bg-gray-200' />
              <div className='space-y-4'>
                <div className='h-6 rounded bg-gray-200' />
                <div className='h-6 rounded bg-gray-200' />
                <div className='h-6 rounded bg-gray-200' />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className='mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8'>
        <div className='mx-auto max-w-2xl'>
          <div className='rounded-lg bg-white p-6 shadow'>
            <h1 className='mb-6 text-2xl font-bold text-gray-900'>
              Access Denied
            </h1>
            <p className='text-gray-600'>
              Please log in to access email management.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8'>
      <div className='mx-auto max-w-2xl'>
        <div className='rounded-lg bg-white shadow'>
          <div className='border-b border-gray-200 px-6 py-4'>
            <h1 className='text-2xl font-bold text-gray-900'>
              Email Management
            </h1>
            <p className='mt-1 text-sm text-gray-600'>
              Manage your email preferences and test email functionality
            </p>
          </div>

          <div className='px-6 py-4'>
            {message && (
              <div
                className={`mb-6 rounded-md p-4 ${
                  message.type === 'success'
                    ? 'border border-green-200 bg-green-50 text-green-800'
                    : 'border border-red-200 bg-red-50 text-red-800'
                }`}
              >
                {message.text}
              </div>
            )}

            {userData ? (
              <div className='space-y-6'>
                {/* Test Email Section */}
                <div>
                  <h3 className='mb-4 text-lg font-medium text-gray-900'>
                    Test Email Service
                  </h3>
                  <p className='mb-4 text-sm text-gray-600'>
                    Send a test email to verify your email configuration is
                    working.
                  </p>

                  {testMessage && (
                    <div
                      className={`mb-4 rounded-md p-3 ${
                        testMessage.type === 'success'
                          ? 'border border-green-200 bg-green-50 text-green-800'
                          : 'border border-red-200 bg-red-50 text-red-800'
                      }`}
                    >
                      {testMessage.text}
                    </div>
                  )}

                  <div className='flex space-x-4'>
                    <div className='flex-1'>
                      <label className='mb-2 block text-sm font-medium text-gray-700'>
                        Email Address
                      </label>
                      <input
                        type='email'
                        value={testEmail}
                        onChange={e => setTestEmail(e.target.value)}
                        placeholder='Enter email address'
                        className='block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
                        disabled={sendingTest}
                      />
                    </div>
                    <div className='flex items-end'>
                      <button
                        type='button'
                        onClick={sendTestEmail}
                        disabled={isTestButtonDisabled() || !testEmail}
                        className={`rounded-md px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none ${
                          isTestButtonDisabled() || !testEmail
                            ? 'cursor-not-allowed bg-gray-300 text-gray-500'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {getTestButtonText()}
                      </button>
                    </div>
                  </div>

                  <p className='mt-2 text-xs text-gray-500'>
                    Rate limit: Maximum 5 test emails, then 2-minute cooldown.
                  </p>
                </div>

                {/* Email Preferences */}
                <div>
                  <h3 className='mb-4 text-lg font-medium text-gray-900'>
                    Email Preferences
                  </h3>
                  <div className='space-y-4'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <label className='text-sm font-medium text-gray-700'>
                          Marketing Emails
                        </label>
                        <p className='text-sm text-gray-500'>
                          Product updates, feature announcements, and
                          promotional content
                        </p>
                      </div>
                      <button
                        type='button'
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none ${
                          userData.emailPreferences.marketing
                            ? 'bg-blue-600'
                            : 'bg-gray-200'
                        }`}
                        onClick={() =>
                          handlePreferenceChange(
                            'marketing',
                            !userData.emailPreferences.marketing,
                          )
                        }
                        disabled={saving}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            userData.emailPreferences.marketing
                              ? 'translate-x-5'
                              : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    <div className='flex items-center justify-between'>
                      <div>
                        <label className='text-sm font-medium text-gray-700'>
                          Product Updates
                        </label>
                        <p className='text-sm text-gray-500'>
                          Important product changes and new features
                        </p>
                      </div>
                      <button
                        type='button'
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none ${
                          userData.emailPreferences.productUpdates
                            ? 'bg-blue-600'
                            : 'bg-gray-200'
                        }`}
                        onClick={() =>
                          handlePreferenceChange(
                            'productUpdates',
                            !userData.emailPreferences.productUpdates,
                          )
                        }
                        disabled={saving}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            userData.emailPreferences.productUpdates
                              ? 'translate-x-5'
                              : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    <div className='flex items-center justify-between'>
                      <div>
                        <label className='text-sm font-medium text-gray-700'>
                          Security Alerts
                        </label>
                        <p className='text-sm text-gray-500'>
                          Account security notifications and alerts (always
                          enabled)
                        </p>
                      </div>
                      <button
                        type='button'
                        className='relative inline-flex h-6 w-11 flex-shrink-0 cursor-not-allowed rounded-full border-2 border-transparent bg-blue-600 opacity-50'
                        disabled
                      >
                        <span className='pointer-events-none inline-block h-5 w-5 translate-x-5 transform rounded-full bg-white shadow ring-0' />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Unsubscribe Link */}
                <div className='border-t border-gray-200 pt-6'>
                  <h3 className='mb-4 text-lg font-medium text-gray-900'>
                    Quick Unsubscribe
                  </h3>
                  <p className='mb-4 text-sm text-gray-600'>
                    You can quickly unsubscribe from all marketing emails using
                    this link:
                  </p>
                  <div className='rounded-md bg-gray-50 p-4'>
                    <code className='text-sm break-all text-gray-800'>
                      {getUnsubscribeUrl()}
                    </code>
                  </div>
                  <div className='mt-4'>
                    <a
                      href={getUnsubscribeUrl()}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none'
                    >
                      Test Unsubscribe Link
                    </a>
                  </div>
                </div>

                {/* Important Note */}
                <div className='border-t border-gray-200 pt-6'>
                  <div className='rounded-md border border-blue-200 bg-blue-50 p-4'>
                    <div className='flex'>
                      <div className='flex-shrink-0'>
                        <svg
                          className='h-5 w-5 text-blue-400'
                          viewBox='0 0 20 20'
                          fill='currentColor'
                        >
                          <path
                            fillRule='evenodd'
                            d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z'
                            clipRule='evenodd'
                          />
                        </svg>
                      </div>
                      <div className='ml-3'>
                        <h3 className='text-sm font-medium text-blue-800'>
                          Important Note
                        </h3>
                        <div className='mt-2 text-sm text-blue-700'>
                          <p>
                            You will always receive critical emails such as:
                          </p>
                          <ul className='mt-1 list-inside list-disc space-y-1'>
                            <li>Payment confirmations and billing notices</li>
                            <li>Security alerts and account changes</li>
                            <li>Password reset and verification emails</li>
                            <li>Legal notices and policy updates</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className='text-gray-600'>
                Unable to load email settings. Please try again later.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
