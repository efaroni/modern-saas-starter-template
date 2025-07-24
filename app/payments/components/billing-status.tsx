'use client';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Subscription } from '@/lib/db/schema';

interface BillingStatusProps {
  subscription: Subscription | null;
  isActive: boolean;
}

export function BillingStatus({ subscription, isActive }: BillingStatusProps) {
  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='text-lg'>Billing Status</CardTitle>
          <CardDescription>
            You don't have an active subscription
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex items-center gap-2'>
            <Badge variant='outline'>Free Plan</Badge>
            <span className='text-sm text-gray-600'>
              Upgrade to unlock premium features
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string, active: boolean) => {
    if (active && status === 'active') {
      return <Badge className='bg-green-600 text-white'>Active</Badge>;
    }

    if (status === 'canceled') {
      return <Badge variant='destructive'>Cancelled</Badge>;
    }

    if (status === 'past_due') {
      return <Badge className='bg-yellow-600 text-white'>Past Due</Badge>;
    }

    if (status === 'unpaid') {
      return <Badge variant='destructive'>Unpaid</Badge>;
    }

    return (
      <Badge variant='outline' className='capitalize'>
        {status}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-lg'>Billing Status</CardTitle>
        <CardDescription>Your current subscription details</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='flex items-center justify-between'>
          <span className='text-sm font-medium'>Status:</span>
          {getStatusBadge(subscription.status, isActive)}
        </div>

        <div className='flex items-center justify-between'>
          <span className='text-sm font-medium'>Current Period Ends:</span>
          <span className='text-sm text-gray-600'>
            {subscription.currentPeriodEnd.toLocaleDateString()}
          </span>
        </div>

        <div className='flex items-center justify-between'>
          <span className='text-sm font-medium'>Subscription ID:</span>
          <span className='font-mono text-sm text-gray-600'>
            {subscription.stripeSubscriptionId.substring(0, 20)}...
          </span>
        </div>

        {subscription.status === 'active' &&
          subscription.currentPeriodEnd < new Date() && (
            <div className='mt-4 rounded-md border border-yellow-200 bg-yellow-50 p-3'>
              <p className='text-sm text-yellow-800'>
                Your subscription has expired. Please update your payment
                method.
              </p>
            </div>
          )}

        {subscription.status === 'past_due' && (
          <div className='mt-4 rounded-md border border-red-200 bg-red-50 p-3'>
            <p className='text-sm text-red-800'>
              Your payment is past due. Please update your payment method to
              avoid service interruption.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
