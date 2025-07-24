import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth/auth';
import { paymentService } from '@/lib/payments/factory';
import { getSubscriptionStatus } from '@/lib/payments/middleware';

import { BillingStatus } from './components/billing-status';
import { ManageBillingButton } from './components/manage-billing-button';
import { PricingCard } from './components/pricing-card';
import { PaymentsClient } from './payments-client';

export default async function PaymentsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/auth');
  }

  // Get subscription status and available plans
  const [subscriptionStatus, plans] = await Promise.all([
    getSubscriptionStatus(session.user.id),
    paymentService.getAvailablePlans(),
  ]);

  return (
    <div className='container mx-auto max-w-6xl px-4 py-8'>
      <div className='mb-8'>
        <h1 className='mb-2 text-3xl font-bold'>Billing & Subscriptions</h1>
        <p className='text-gray-600'>
          Manage your subscription and billing preferences
        </p>
      </div>

      <div className='grid grid-cols-1 gap-8 lg:grid-cols-3'>
        {/* Current Subscription Status */}
        <div className='lg:col-span-1'>
          <div className='space-y-6'>
            <BillingStatus
              subscription={subscriptionStatus.subscription}
              isActive={subscriptionStatus.isActive}
            />

            <div className='flex flex-col space-y-3'>
              <ManageBillingButton
                hasSubscription={subscriptionStatus.hasSubscription}
              />

              {!subscriptionStatus.isActive && (
                <div className='text-center'>
                  <p className='mb-2 text-sm text-gray-600'>
                    Need help? Contact support
                  </p>
                  <a
                    href='mailto:support@yourapp.com'
                    className='text-sm text-blue-600 underline hover:text-blue-700'
                  >
                    support@yourapp.com
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Available Plans */}
        <div className='lg:col-span-2'>
          <div className='mb-6'>
            <h2 className='mb-2 text-2xl font-bold'>Available Plans</h2>
            <p className='text-gray-600'>
              Choose the plan that best fits your needs
            </p>
          </div>

          {plans.length > 0 ? (
            <PaymentsClient
              plans={plans}
              currentSubscription={subscriptionStatus.subscription}
            />
          ) : (
            <div className='py-12 text-center'>
              <div className='rounded-lg bg-gray-50 p-8'>
                <h3 className='mb-2 text-lg font-semibold'>
                  No Plans Available
                </h3>
                <p className='mb-4 text-gray-600'>
                  Plans are being configured. Please check back later.
                </p>
                <div className='text-sm text-gray-500'>
                  Using mock payment provider - add plans via database or Stripe
                  dashboard
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Additional Information */}
      <div className='mt-12 grid grid-cols-1 gap-8 md:grid-cols-2'>
        <div className='rounded-lg bg-blue-50 p-6'>
          <h3 className='mb-2 font-semibold text-blue-900'>Secure Payments</h3>
          <p className='text-sm text-blue-800'>
            All payments are processed securely through Stripe. Your payment
            information is encrypted and never stored on our servers.
          </p>
        </div>

        <div className='rounded-lg bg-green-50 p-6'>
          <h3 className='mb-2 font-semibold text-green-900'>Cancel Anytime</h3>
          <p className='text-sm text-green-800'>
            You can cancel your subscription at any time through the billing
            portal. You'll continue to have access until the end of your billing
            period.
          </p>
        </div>
      </div>
    </div>
  );
}
