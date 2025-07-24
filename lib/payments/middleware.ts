import { type NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth/auth';

import { paymentService } from './factory';

export interface SubscriptionMiddlewareOptions {
  requiredFeatures?: string[];
  requireActive?: boolean;
  redirectUrl?: string;
}

export async function withSubscription(
  request: NextRequest,
  options: SubscriptionMiddlewareOptions = {},
) {
  const {
    requiredFeatures = [],
    requireActive = true,
    redirectUrl = '/payments',
  } = options;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Check if subscription is required and active
    if (requireActive) {
      const isActive = await paymentService.isSubscriptionActive(
        session.user.id,
      );
      if (!isActive) {
        return NextResponse.json(
          {
            success: false,
            error: 'Active subscription required',
            redirectUrl,
          },
          { status: 403 },
        );
      }
    }

    // Check specific feature requirements
    for (const feature of requiredFeatures) {
      const hasFeature = await paymentService.hasFeature(
        session.user.id,
        feature,
      );
      if (!hasFeature) {
        return NextResponse.json(
          {
            success: false,
            error: `Feature '${feature}' not available in your plan`,
            redirectUrl,
          },
          { status: 403 },
        );
      }
    }

    return null; // No blocking response, continue with request
  } catch (error) {
    console.error('Subscription middleware error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// Higher-order function for API routes
export function requiresSubscription(options?: SubscriptionMiddlewareOptions) {
  return async function (
    handler: (request: NextRequest) => Promise<NextResponse>,
  ) {
    return async function (request: NextRequest) {
      const middlewareResponse = await withSubscription(request, options);
      if (middlewareResponse) {
        return middlewareResponse;
      }
      return handler(request);
    };
  };
}

// Utility function to check subscription status in components/pages
export async function getSubscriptionStatus(userId: string) {
  try {
    const subscription = await paymentService.getUserSubscription(userId);
    const isActive = await paymentService.isSubscriptionActive(userId);

    return {
      subscription,
      isActive,
      hasSubscription: !!subscription,
    };
  } catch (error) {
    console.error('Error getting subscription status:', error);
    return {
      subscription: null,
      isActive: false,
      hasSubscription: false,
    };
  }
}

// Feature access check utility
export async function hasFeatureAccess(
  userId: string,
  featureName: string,
): Promise<boolean> {
  try {
    return await paymentService.hasFeature(userId, featureName);
  } catch (error) {
    console.error(`Error checking feature access for ${featureName}:`, error);
    return false;
  }
}
