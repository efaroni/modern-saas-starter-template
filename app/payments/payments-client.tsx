'use client';

import { useState } from 'react';

import type { Plan, Subscription } from '@/lib/db/schema';

import { PricingCard } from './components/pricing-card';

interface PaymentsClientProps {
  plans: Plan[];
  currentSubscription: Subscription | null;
}

export function PaymentsClient({
  plans,
  currentSubscription,
}: PaymentsClientProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubscribe = async (priceId: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          successUrl: `${window.location.origin}/payments?success=true`,
          cancelUrl: `${window.location.origin}/payments?canceled=true`,
        }),
      });

      const data = await response.json();

      if (data.success && data.data.url) {
        window.location.href = data.data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Unable to start checkout. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
      {plans.map(plan => (
        <PricingCard
          key={plan.id}
          plan={plan}
          isCurrentPlan={
            currentSubscription?.stripeSubscriptionId === plan.stripePriceId
          }
          onSubscribe={handleSubscribe}
        />
      ))}
    </div>
  );
}
