import { NextResponse, type NextRequest } from 'next/server';

import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

import { billingService } from '@/lib/billing/service';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

export async function POST(_request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
      columns: {
        id: true,
        email: true,
        billingCustomerId: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 },
      );
    }

    // Check if user has billing customer ID
    if (!user.billingCustomerId) {
      console.warn('Portal session failed: User has no billing customer ID', {
        userId: user.id,
        email: user.email,
      });
      return NextResponse.json(
        { success: false, error: 'User billing not set up' },
        { status: 400 },
      );
    }

    // Verify customer exists in Stripe before creating portal session
    console.warn(
      'Verifying customer exists in Stripe before portal creation:',
      {
        customerId: user.billingCustomerId,
        userId: user.id,
        email: user.email,
      },
    );

    const customerData = await billingService.verifyCustomer(
      user.billingCustomerId,
    );

    if (!customerData) {
      console.error(
        'Customer verification failed: Customer not found in Stripe',
        {
          customerId: user.billingCustomerId,
          userId: user.id,
          email: user.email,
        },
      );
      return NextResponse.json(
        {
          success: false,
          error:
            'Customer not found in Stripe. Please subscribe first to create a customer record.',
        },
        { status: 404 },
      );
    }

    if (customerData.deleted) {
      console.error(
        'Customer verification failed: Customer is deleted in Stripe',
        {
          customerId: user.billingCustomerId,
          userId: user.id,
          email: user.email,
        },
      );
      return NextResponse.json(
        {
          success: false,
          error:
            'Customer record is deleted in Stripe. Please contact support.',
        },
        { status: 400 },
      );
    }

    console.warn('Customer verified successfully, creating portal session:', {
      customerId: user.billingCustomerId,
      stripeEmail: customerData.email,
      userEmail: user.email,
    });

    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`;

    const { url } = await billingService.createPortalSession(
      user.billingCustomerId,
      returnUrl,
    );

    console.warn('Portal session created successfully:', {
      customerId: user.billingCustomerId,
      returnUrl,
      portalUrl: url.substring(0, 50) + '...', // Log partial URL for privacy
    });

    return NextResponse.json({
      success: true,
      data: { portalUrl: url },
    });
  } catch (error) {
    console.error('Portal session creation failed:', error);

    // Enhanced error handling for Stripe-specific errors
    if (error instanceof Stripe.errors.StripeError) {
      console.error('Stripe API Error Details:', {
        type: error.type,
        code: error.code,
        param: error.param,
        message: error.message,
        statusCode: error.statusCode,
        requestId: error.requestId,
      });

      // Return more specific error messages based on Stripe error type
      switch (error.code) {
        case 'resource_missing':
          return NextResponse.json(
            {
              success: false,
              error: 'Customer not found in Stripe. Please subscribe first.',
            },
            { status: 404 },
          );
        case 'customer_portal_not_configured':
          return NextResponse.json(
            {
              success: false,
              error: 'Customer portal not configured. Please contact support.',
            },
            { status: 500 },
          );
        case 'invalid_request_error':
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid portal request. Please try again.',
            },
            { status: 400 },
          );
        default:
          return NextResponse.json(
            { success: false, error: `Stripe error: ${error.message}` },
            { status: 500 },
          );
      }
    }

    // Generic error handling for non-Stripe errors
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create portal session. Please try again.',
      },
      { status: 500 },
    );
  }
}
