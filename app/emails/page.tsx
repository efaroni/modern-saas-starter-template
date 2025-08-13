'use client';

import { useState, useEffect } from 'react';

import { useUser } from '@clerk/nextjs';

interface EmailPreferences {
  marketing: boolean;
  transactional: boolean;
}

interface UserData {
  emailPreferences: EmailPreferences;
}

export default function EmailsPage() {
  const { user, isLoaded } = useUser();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [originalPreferences, setOriginalPreferences] =
    useState<EmailPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Test email state
  const [testEmail, setTestEmail] = useState('');
  const [sendingMarketingTest, setSendingMarketingTest] = useState(false);
  const [sendingTransactionalTest, setSendingTransactionalTest] =
    useState(false);
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
        setOriginalPreferences(data.emailPreferences);
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
        setOriginalPreferences(newPreferences);
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

  const hasChanges = () => {
    if (!userData || !originalPreferences) return false;
    return (
      userData.emailPreferences.marketing !== originalPreferences.marketing ||
      userData.emailPreferences.transactional !==
        originalPreferences.transactional
    );
  };

  const sendTestEmail = async (emailType: 'marketing' | 'transactional') => {
    if (!testEmail) return;

    // Check if marketing email is allowed (use saved preferences, not unsaved UI state)
    if (
      emailType === 'marketing' &&
      originalPreferences &&
      !originalPreferences.marketing
    ) {
      setTestMessage({
        type: 'error',
        text: 'Cannot send marketing test email - marketing emails are disabled in your preferences',
      });
      return;
    }

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

    const setSending =
      emailType === 'marketing'
        ? setSendingMarketingTest
        : setSendingTransactionalTest;
    setSending(true);
    setTestMessage(null);

    try {
      const response = await fetch('/api/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testEmail,
          emailType: emailType,
        }),
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
          text: data.message || `Test ${emailType} email sent successfully!`,
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
      setSending(false);
    }
  };

  const isTestButtonDisabled = (emailType: 'marketing' | 'transactional') => {
    const isSending =
      emailType === 'marketing'
        ? sendingMarketingTest
        : sendingTransactionalTest;
    if (isSending) return true;
    if (testTimeoutUntil && currentTime < testTimeoutUntil.getTime())
      return true;
    if (lastTestSent && currentTime - lastTestSent.getTime() < 5000)
      return true;
    // Additional check for marketing emails (use saved preferences, not unsaved UI state)
    if (
      emailType === 'marketing' &&
      originalPreferences &&
      !originalPreferences.marketing
    )
      return true;
    return false;
  };

  const getTestButtonText = (emailType: 'marketing' | 'transactional') => {
    const isSending =
      emailType === 'marketing'
        ? sendingMarketingTest
        : sendingTransactionalTest;
    if (isSending) return 'Sending...';
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
    if (
      emailType === 'marketing' &&
      originalPreferences &&
      !originalPreferences.marketing
    ) {
      return 'Marketing Disabled';
    }
    return emailType === 'marketing'
      ? 'Send Marketing Test'
      : 'Send Transactional Test';
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
                    Send test emails to verify your email configuration and see
                    how different email types behave based on your preferences.
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

                  <div className='space-y-4'>
                    <div>
                      <label
                        htmlFor='test-email-input'
                        className='mb-2 block text-sm font-medium text-gray-700'
                      >
                        Email Address
                      </label>
                      <input
                        id='test-email-input'
                        type='email'
                        value={testEmail}
                        onChange={e => setTestEmail(e.target.value)}
                        placeholder='Enter email address'
                        className='block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
                        disabled={
                          sendingMarketingTest || sendingTransactionalTest
                        }
                      />
                    </div>

                    <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                      <div className='space-y-2'>
                        <button
                          type='button'
                          onClick={() => sendTestEmail('marketing')}
                          disabled={
                            isTestButtonDisabled('marketing') || !testEmail
                          }
                          className={`w-full rounded-md px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none ${
                            isTestButtonDisabled('marketing') || !testEmail
                              ? 'cursor-not-allowed bg-gray-300 text-gray-500'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {getTestButtonText('marketing')}
                        </button>
                        <p className='text-xs text-gray-500'>
                          Marketing test email - respects your marketing email
                          preference
                        </p>
                      </div>

                      <div className='space-y-2'>
                        <button
                          type='button'
                          onClick={() => sendTestEmail('transactional')}
                          disabled={
                            isTestButtonDisabled('transactional') || !testEmail
                          }
                          className={`w-full rounded-md px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none ${
                            isTestButtonDisabled('transactional') || !testEmail
                              ? 'cursor-not-allowed bg-gray-300 text-gray-500'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          {getTestButtonText('transactional')}
                        </button>
                        <p className='text-xs text-gray-500'>
                          Transactional test email - always sends regardless of
                          preferences
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className='mt-4 text-xs text-gray-500'>
                    Rate limit: Maximum 5 test emails total, then 2-minute
                    cooldown.
                  </p>
                </div>

                {/* Email Preferences */}
                <div>
                  <h3 className='mb-4 text-lg font-medium text-gray-900'>
                    Email Preferences
                  </h3>
                  <div className='space-y-6'>
                    <div className='flex items-start'>
                      <div className='flex h-5 items-center'>
                        <input
                          id='marketing'
                          type='checkbox'
                          checked={userData.emailPreferences.marketing}
                          onChange={e =>
                            setUserData(prev =>
                              prev
                                ? {
                                    ...prev,
                                    emailPreferences: {
                                      ...prev.emailPreferences,
                                      marketing: e.target.checked,
                                    },
                                  }
                                : null,
                            )
                          }
                          className='h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                        />
                      </div>
                      <div className='ml-3 text-sm'>
                        <label
                          htmlFor='marketing'
                          className='font-medium text-gray-700'
                        >
                          Marketing Emails
                        </label>
                        <p className='text-gray-500'>
                          Receive emails about new features, product updates,
                          and promotional content.
                        </p>
                      </div>
                    </div>

                    <div className='flex items-start'>
                      <div className='flex h-5 items-center'>
                        <input
                          id='transactional'
                          type='checkbox'
                          checked={userData.emailPreferences.transactional}
                          disabled
                          className='h-4 w-4 cursor-not-allowed rounded border-gray-300 text-blue-600 opacity-50 focus:ring-blue-500'
                        />
                      </div>
                      <div className='ml-3 text-sm'>
                        <label
                          htmlFor='transactional'
                          className='font-medium text-gray-700'
                        >
                          Transactional Emails
                        </label>
                        <p className='text-gray-500'>
                          Essential emails including security notifications,
                          billing updates, password resets, and account-related
                          communications.
                          <strong className='mt-1 block'>
                            These emails cannot be disabled for your account
                            security.
                          </strong>
                        </p>
                      </div>
                    </div>

                    <div className='flex justify-end'>
                      <button
                        onClick={() =>
                          userData &&
                          updateEmailPreferences(userData.emailPreferences)
                        }
                        disabled={saving || !userData || !hasChanges()}
                        className='inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50'
                      >
                        {(() => {
                          if (saving) {
                            return (
                              <>
                                <div className='mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white' />
                                Saving...
                              </>
                            );
                          }
                          return hasChanges()
                            ? 'Save Preferences'
                            : 'No Changes to Save';
                        })()}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Unsubscribe Information */}
                <div className='border-t border-gray-200 pt-6'>
                  <h3 className='mb-4 text-lg font-medium text-gray-900'>
                    Unsubscribe Information
                  </h3>
                  <div className='rounded-md bg-blue-50 p-4'>
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
                        <h4 className='text-sm font-medium text-blue-800'>
                          How Unsubscribe Works
                        </h4>
                        <div className='mt-2 text-sm text-blue-700'>
                          <p>
                            Each marketing email includes a personalized, secure
                            unsubscribe link. Test emails sent from this page
                            also include unsubscribe links so you can test the
                            functionality.
                          </p>
                        </div>
                      </div>
                    </div>
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
