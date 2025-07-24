import { MockPaymentProvider } from './providers/mock';
import { StripePaymentProvider } from './providers/stripe';
import { PaymentServiceImpl } from './service';

import type {
  PaymentService,
  PaymentConfig,
  PaymentProviderType,
} from './types';

export function createPaymentService(config?: PaymentConfig): PaymentService {
  const providerType: PaymentProviderType =
    config?.provider || getDefaultProvider();

  switch (providerType) {
    case 'stripe':
      if (!config?.stripe?.secretKey || !config?.stripe?.webhookSecret) {
        console.warn(
          'Stripe configuration missing, falling back to mock provider',
        );
        return new PaymentServiceImpl(new MockPaymentProvider());
      }
      return new PaymentServiceImpl(
        new StripePaymentProvider(
          config.stripe.secretKey,
          config.stripe.webhookSecret,
        ),
      );

    case 'mock':
      return new PaymentServiceImpl(new MockPaymentProvider());

    default:
      console.warn(`Unknown payment provider: ${providerType}, using mock`);
      return new PaymentServiceImpl(new MockPaymentProvider());
  }
}

function getDefaultProvider(): PaymentProviderType {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // Use Stripe if credentials are available, otherwise use mock
  if (stripeSecretKey && stripeWebhookSecret) {
    return 'stripe';
  }

  return 'mock';
}

export function getPaymentConfig(): PaymentConfig {
  const provider = getDefaultProvider();

  if (provider === 'stripe') {
    return {
      provider: 'stripe',
      stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY!,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
      },
    };
  }

  return {
    provider: 'mock',
  };
}

// Export a default service instance
export const paymentService = createPaymentService(getPaymentConfig());
