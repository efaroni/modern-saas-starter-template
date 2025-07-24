'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

interface ManageBillingButtonProps {
  hasSubscription: boolean;
  disabled?: boolean;
}

export function ManageBillingButton({
  hasSubscription,
  disabled = false,
}: ManageBillingButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleManageBilling = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          returnUrl: window.location.href,
        }),
      });

      const data = await response.json();

      if (data.success && data.data.url) {
        window.location.href = data.data.url;
      } else {
        throw new Error(data.error || 'Failed to create portal session');
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
      alert('Unable to open billing portal. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasSubscription) {
    return null;
  }

  return (
    <Button
      variant='outline'
      onClick={handleManageBilling}
      disabled={disabled || isLoading}
      className='w-full sm:w-auto'
    >
      {isLoading ? (
        <>
          <Spinner className='mr-2 h-4 w-4' />
          Opening Portal...
        </>
      ) : (
        'Manage Billing'
      )}
    </Button>
  );
}
