'use client';

import { useEffect, useState } from 'react';

import { STRIPE_PRODUCTS } from '@/lib/billing/config';

interface BillingStatus {
  email: string;
  customerId: string | null;
  hasSubscription: boolean;
}

interface StatusResponse {
  success: boolean;
  data?: BillingStatus;
  error?: string;
}

export default function BillingTestPage() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const refreshStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test/billing-status', {
        credentials: 'include',
      });

      if (!response.ok) {
        console.error(
          'Status response not ok:',
          response.status,
          response.statusText,
        );
        const text = await response.text();
        console.error('Response body:', text);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: StatusResponse = await response.json();

      if (data.success && data.data) {
        setStatus(data.data);
        setMessage('Status refreshed');
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Status error:', error);
      setMessage(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const resetUser = async () => {
    // eslint-disable-next-line no-alert
    if (!confirm('Reset billing data? This will clear your customer ID.'))
      return;

    setLoading(true);
    try {
      const response = await fetch('/api/test/reset-user', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        console.error(
          'Reset response not ok:',
          response.status,
          response.statusText,
        );
        const text = await response.text();
        console.error('Response body:', text);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setMessage('User reset successfully');
        refreshStatus();
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Reset error:', error);
      setMessage(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const createSubscription = async () => {
    setLoading(true);
    try {
      console.log('Creating subscription...');
      const response = await fetch('/api/billing/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          priceId: STRIPE_PRODUCTS.SUBSCRIPTION.priceId,
          mode: STRIPE_PRODUCTS.SUBSCRIPTION.type,
        }),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        console.error(
          'Checkout response not ok:',
          response.status,
          response.statusText,
        );
        const text = await response.text();
        console.error('Response body:', text);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        window.location.href = data.data.checkoutUrl;
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Subscription error:', error);
      setMessage(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const buyCredits = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/billing/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          priceId: STRIPE_PRODUCTS.CREDITS.priceId,
          mode: STRIPE_PRODUCTS.CREDITS.type,
          metadata: {
            purchaseType: 'credits',
            quantity: '100',
          },
        }),
      });

      if (!response.ok) {
        console.error(
          'Credits response not ok:',
          response.status,
          response.statusText,
        );
        const text = await response.text();
        console.error('Response body:', text);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        window.location.href = data.data.checkoutUrl;
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Credits error:', error);
      setMessage(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const manageBilling = async () => {
    if (!status?.customerId) {
      setMessage('No customer ID - subscribe first');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        console.error(
          'Portal response not ok:',
          response.status,
          response.statusText,
        );
        const text = await response.text();
        console.error('Response body:', text);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        window.location.href = data.data.portalUrl;
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Portal error:', error);
      setMessage(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  return (
    <div className='mx-auto max-w-2xl space-y-6 p-6'>
      <h1 className='text-2xl font-bold'>Billing Test Page</h1>

      {/* Status Display */}
      <div className='rounded-lg border bg-gray-50 p-4'>
        <h2 className='mb-2 text-lg font-semibold'>Current Status</h2>
        {status ? (
          <div className='space-y-2 text-sm'>
            <div>
              <strong>Email:</strong> {status.email}
            </div>
            <div>
              <strong>Customer ID:</strong> {status.customerId || 'None'}
            </div>
            <div>
              <strong>Has Subscription:</strong>{' '}
              {status.hasSubscription ? '✅ Active' : '❌ Inactive'}
            </div>
          </div>
        ) : (
          <div>Loading...</div>
        )}
      </div>

      {/* Action Buttons */}
      <div className='grid grid-cols-2 gap-4'>
        <button
          onClick={refreshStatus}
          disabled={loading}
          className='rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50'
        >
          Refresh Status
        </button>

        <button
          onClick={resetUser}
          disabled={loading}
          className='rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600 disabled:opacity-50'
        >
          Reset User
        </button>

        <button
          onClick={createSubscription}
          disabled={loading}
          className='rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600 disabled:opacity-50'
        >
          Subscribe
        </button>

        <button
          onClick={buyCredits}
          disabled={loading}
          className='rounded bg-purple-500 px-4 py-2 text-white hover:bg-purple-600 disabled:opacity-50'
        >
          Buy Credits
        </button>

        <button
          onClick={manageBilling}
          disabled={loading || !status?.customerId}
          className='col-span-2 rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600 disabled:opacity-50'
        >
          Manage Billing
        </button>
      </div>

      {/* Message Display */}
      {message && (
        <div className='rounded-lg border bg-blue-50 p-3 text-blue-800'>
          {message}
        </div>
      )}

      {/* Test Instructions */}
      <div className='rounded-lg border bg-yellow-50 p-4'>
        <h2 className='mb-2 text-lg font-semibold'>Test Instructions</h2>
        <div className='space-y-2 text-sm'>
          <div>
            <strong>Test Card:</strong> 4242 4242 4242 4242
          </div>
          <div>
            <strong>Expiry:</strong> Any future date
          </div>
          <div>
            <strong>CVC:</strong> Any 3 digits
          </div>
          <div>
            <strong>Test Sequence:</strong>
          </div>
          <ol className='ml-2 list-inside list-decimal space-y-1'>
            <li>Click &quot;Reset User&quot; to start fresh</li>
            <li>
              Click &quot;Subscribe&quot; → Complete checkout with test card
            </li>
            <li>
              Return here → Click &quot;Refresh Status&quot; to see customer ID
            </li>
            <li>
              Wait ~10 seconds → Click &quot;Refresh Status&quot; to see
              subscription
            </li>
            <li>Click &quot;Manage Billing&quot; to test portal</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
