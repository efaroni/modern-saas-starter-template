import { Button, Section, Text } from '@react-email/components';
import { EmailLayout, emailStyles } from '../components/layout';

interface PaymentFailedEmailProps {
  userName?: string | null;
  amount: number;
  currency: string;
  billingDetails?: {
    last4?: string;
    brand?: string;
  };
}

export function PaymentFailedEmail({
  userName,
  amount,
  currency,
  billingDetails,
}: PaymentFailedEmailProps) {
  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const buttonStyle = {
    ...emailStyles.button,
    backgroundColor: '#dc3545',
  };

  return (
    <EmailLayout preview='Payment Failed'>
      <Section style={emailStyles.content}>
        <Text style={emailStyles.heading}>Payment Failed</Text>
        <Text style={emailStyles.paragraph}>Hello {userName || 'there'},</Text>
        <Text style={emailStyles.paragraph}>
          We were unable to process your payment of{' '}
          <strong>{formatAmount(amount, currency)}</strong>.
        </Text>
        {billingDetails && (
          <Text style={emailStyles.paragraph}>
            Payment method attempted: {billingDetails.brand} ending in{' '}
            {billingDetails.last4}
          </Text>
        )}
        <Text style={emailStyles.paragraph}>
          This could be due to insufficient funds, an expired card, or other
          issues with your payment method.
        </Text>
        <Button
          href={`${process.env.NEXT_PUBLIC_APP_URL}/billing`}
          style={buttonStyle}
        >
          Update Payment Method
        </Button>
        <Text style={emailStyles.footnote}>
          Please update your payment information to continue using our services.
          If you need assistance, please contact our support team.
        </Text>
      </Section>
    </EmailLayout>
  );
}
