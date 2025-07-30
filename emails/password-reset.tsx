import { Button, Text } from '@react-email/components';

import { EmailLayout } from './components/layout';

interface PasswordResetEmailProps {
  resetUrl: string;
  userName?: string | null;
}

export function PasswordResetEmail({
  resetUrl,
  userName,
}: PasswordResetEmailProps) {
  return (
    <EmailLayout preview='Reset your password'>
      <Text style={heading}>Reset Your Password</Text>
      <Text style={paragraph}>Hello {userName || 'there'},</Text>
      <Text style={paragraph}>
        You requested to reset your password. Click the link below to set a new
        password:
      </Text>
      <Button href={resetUrl} style={button}>
        Reset Password
      </Button>
      <Text style={footnote}>
        If you didn&apos;t request this, you can safely ignore this email.
      </Text>
      <Text style={footnote}>This link will expire in 1 hour.</Text>
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
