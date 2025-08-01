import { Button, Text } from '@react-email/components';

import { EmailLayout } from './components/layout';

interface VerifyEmailProps {
  verificationUrl: string;
  userName?: string | null;
}

export function VerifyEmail({ verificationUrl, userName }: VerifyEmailProps) {
  return (
    <EmailLayout preview='Verify your email address'>
      <Text style={heading}>Verify Your Email Address</Text>
      <Text style={paragraph}>Hello {userName || 'there'},</Text>
      <Text style={paragraph}>
        Thank you for signing up! Please click the link below to verify your
        email address:
      </Text>
      <Button href={verificationUrl} style={button}>
        Verify Email
      </Button>
      <Text style={footnote}>
        If you didn&apos;t create an account, you can safely ignore this email.
      </Text>
      <Text style={footnote}>This link will expire in 24 hours.</Text>
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
  backgroundColor: '#007bff',
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
