import { Button, Text } from '@react-email/components';

import { EmailLayout } from './components/layout';

interface PaymentSuccessEmailProps {
  userName?: string | null;
  amount: number;
  currency: string;
  invoiceUrl?: string;
}

export function PaymentSuccessEmail({
  userName,
  amount,
  currency,
  invoiceUrl,
}: PaymentSuccessEmailProps) {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);

  return (
    <EmailLayout preview='Payment Successful'>
      <Text style={heading}>Payment Successful</Text>
      <Text style={paragraph}>Hello {userName || 'there'},</Text>
      <Text style={paragraph}>
        Your payment of <strong>{formattedAmount}</strong> has been processed
        successfully.
      </Text>
      {invoiceUrl && (
        <Button href={invoiceUrl} style={button}>
          View Invoice
        </Button>
      )}
      <Text style={footnote}>
        Thank you for your business! If you have any questions, please contact
        our support team.
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
  backgroundColor: '#28a745',
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
