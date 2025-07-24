'use client';

import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import type { Plan } from '@/lib/db/schema';

interface PricingCardProps {
  plan: Plan;
  isCurrentPlan?: boolean;
  onSubscribe: (priceId: string) => Promise<void>;
}

export function PricingCard({
  plan,
  isCurrentPlan = false,
  onSubscribe,
}: PricingCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      await onSubscribe(plan.stripePriceId);
    } catch (error) {
      console.error('Subscription error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const features = Object.entries(plan.features).filter(
    ([_, enabled]) => enabled,
  );

  return (
    <Card
      className={`relative ${isCurrentPlan ? 'border-blue-500 shadow-lg' : ''}`}
    >
      {isCurrentPlan && (
        <div className='absolute -top-3 left-1/2 -translate-x-1/2 transform'>
          <Badge variant='default' className='bg-blue-600 text-white'>
            Current Plan
          </Badge>
        </div>
      )}

      <CardHeader className='text-center'>
        <CardTitle className='text-xl font-bold'>{plan.name}</CardTitle>
        <CardDescription>
          Perfect for getting started with premium features
        </CardDescription>
      </CardHeader>

      <CardContent className='space-y-4'>
        <div className='text-center'>
          <div className='text-3xl font-bold'>
            {plan.name.toLowerCase().includes('free') ? 'Free' : '$29'}
          </div>
          {!plan.name.toLowerCase().includes('free') && (
            <div className='text-sm text-gray-500'>per month</div>
          )}
        </div>

        <div className='space-y-2'>
          <h4 className='text-sm font-semibold'>Features included:</h4>
          <ul className='space-y-1 text-sm'>
            {features.length > 0 ? (
              features.map(([featureName]) => (
                <li key={featureName} className='flex items-center gap-2'>
                  <div className='h-1.5 w-1.5 rounded-full bg-green-500' />
                  {formatFeatureName(featureName)}
                </li>
              ))
            ) : (
              <li className='flex items-center gap-2'>
                <div className='h-1.5 w-1.5 rounded-full bg-green-500' />
                Basic features included
              </li>
            )}
          </ul>
        </div>
      </CardContent>

      <CardFooter className='pt-0'>
        {isCurrentPlan ? (
          <Button disabled className='w-full'>
            Current Plan
          </Button>
        ) : (
          <Button
            onClick={handleSubscribe}
            disabled={isLoading}
            className='w-full'
          >
            {isLoading ? (
              <>
                <Spinner className='mr-2 h-4 w-4' />
                Processing...
              </>
            ) : plan.name.toLowerCase().includes('free') ? (
              'Get Started'
            ) : (
              'Subscribe'
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function formatFeatureName(featureName: string): string {
  return featureName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
