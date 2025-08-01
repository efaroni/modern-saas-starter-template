import { Button, Text } from '@react-email/components';

import { EmailLayout } from './components/layout';

interface PaymentFailedEmailProps {
  userName?: string | null;
  amount: number;
  currency: string;
  retryUrl?: string;
}

export function PaymentFailedEmail({
  userName,
  amount,
  currency,
  retryUrl,
}: PaymentFailedEmailProps) {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);

  return (
    <EmailLayout preview='Payment Failed'>
      <Text style={heading}>Payment Failed</Text>
      <Text style={paragraph}>Hello {userName || 'there'},</Text>
      <Text style={paragraph}>
        We were unable to process your payment of{' '}
        <strong>{formattedAmount}</strong>.
      </Text>
      <Text style={paragraph}>
        This could be due to insufficient funds, an expired card, or other
        issues with your payment method.
      </Text>
      {retryUrl && (
        <Button href={retryUrl} style={button}>
          Update Payment Method
        </Button>
      )}
      <Text style={footnote}>
        If you continue to have issues, please contact our support team for
        assistance.
      </Text>
    </EmailLayout>
  );
}

const heading = {
  fontSize: '24px',
  fontWeight: '600',
  color: '#333',
  marginBottom: '20px',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#666',
  marginBottom: '20px',
};

const button = {
  backgroundColor: '#dc3545',
  borderRadius: '4px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 24px',
  margin: '16px 0',
};

const footnote = {
  fontSize: '14px',
  color: '#666',
  marginTop: '20px',
};
