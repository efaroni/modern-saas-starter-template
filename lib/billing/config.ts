/**
 * Stripe configuration and price management
 * Centralizes all Stripe-related configuration with environment variable validation
 */

// Stripe price IDs from environment variables
const SUBSCRIPTION_PRICE_ID =
  process.env.NEXT_PUBLIC_STRIPE_SUBSCRIPTION_PRICE_ID;
const ONE_TIME_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_ONE_TIME_PRICE_ID;

// Validation helper
function validatePriceId(priceId: string | undefined, name: string): string {
  if (!priceId) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  if (!priceId.startsWith('price_')) {
    throw new Error(`Invalid price ID format for ${name}: ${priceId}`);
  }
  return priceId;
}

// Validated price IDs
export const STRIPE_PRICE_IDS = {
  SUBSCRIPTION: validatePriceId(
    SUBSCRIPTION_PRICE_ID,
    'NEXT_PUBLIC_STRIPE_SUBSCRIPTION_PRICE_ID',
  ),
  ONE_TIME: validatePriceId(
    ONE_TIME_PRICE_ID,
    'NEXT_PUBLIC_STRIPE_ONE_TIME_PRICE_ID',
  ),
} as const;

// Price configuration with metadata
export const STRIPE_PRODUCTS = {
  SUBSCRIPTION: {
    priceId: STRIPE_PRICE_IDS.SUBSCRIPTION,
    name: 'Pro Plan',
    type: 'subscription' as const,
    description: 'Monthly subscription with full access',
  },
  ONE_TIME: {
    priceId: STRIPE_PRICE_IDS.ONE_TIME,
    name: 'Pro Access',
    type: 'payment' as const,
    description: 'One-time payment for pro access',
  },
} as const;

// Type exports for better TypeScript support
export type StripePriceId =
  (typeof STRIPE_PRICE_IDS)[keyof typeof STRIPE_PRICE_IDS];
export type StripeProductKey = keyof typeof STRIPE_PRODUCTS;
export type StripeProduct = (typeof STRIPE_PRODUCTS)[StripeProductKey];

// Helper function to get product by price ID
export function getProductByPriceId(
  priceId: string,
): StripeProduct | undefined {
  return Object.values(STRIPE_PRODUCTS).find(
    product => product.priceId === priceId,
  );
}

// Validation function to check if all required env vars are set
export function validateStripeConfig(): void {
  try {
    // This will throw if any required env vars are missing
    Object.values(STRIPE_PRICE_IDS);
    console.warn('✅ Stripe configuration validated successfully');
  } catch (error) {
    console.error('❌ Stripe configuration error:', error);
    throw error;
  }
}
