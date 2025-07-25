import { Button, Section, Text } from '@react-email/components';

import { EmailLayout, emailStyles } from '../components/layout';

interface PaymentSuccessEmailProps {
  userName?: string | null;
  amount: number;
  currency: string;
  invoiceUrl?: string;
  billingDetails?: {
    last4?: string;
    brand?: string;
  };
}

export function PaymentSuccessEmail({
  userName,
  amount,
  currency,
  invoiceUrl,
  billingDetails,
}: PaymentSuccessEmailProps) {
  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const buttonStyle = {
    ...emailStyles.button,
    backgroundColor: '#28a745',
  };

  return (
    <EmailLayout preview='Payment Successful'>
      <Section style={emailStyles.content}>
        <Text style={emailStyles.heading}>Payment Successful</Text>
        <Text style={emailStyles.paragraph}>Hello {userName || 'there'},</Text>
        <Text style={emailStyles.paragraph}>
          We&apos;ve successfully processed your payment of{' '}
          <strong>{formatAmount(amount, currency)}</strong>.
        </Text>
        {billingDetails && (
          <Text style={emailStyles.paragraph}>
            Payment method: {billingDetails.brand} ending in{' '}
            {billingDetails.last4}
          </Text>
        )}
        {invoiceUrl && (
          <Button href={invoiceUrl} style={buttonStyle}>
            View Invoice
          </Button>
        )}
        <Text style={emailStyles.footnote}>
          Thank you for your business! If you have any questions about this
          payment, please don&apos;t hesitate to contact our support team.
        </Text>
      </Section>
    </EmailLayout>
  );
}
