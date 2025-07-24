import { Heading, Text } from '@react-email/components';
import EmailLayout from '../components/layout';
import EmailButton from '../components/button';

interface PasswordResetProps {
  userName?: string;
  resetUrl: string;
}

export default function PasswordResetTemplate({
  userName,
  resetUrl,
}: PasswordResetProps) {
  return (
    <EmailLayout previewText='Reset your password'>
      <Heading style={heading}>Reset Your Password</Heading>

      <Text style={text}>Hello {userName || 'there'},</Text>

      <Text style={text}>
        You requested to reset your password. Click the link below to set a new
        password:
      </Text>

      <EmailButton href={resetUrl} variant='danger'>
        Reset Password
      </EmailButton>

      <Text style={smallText}>
        If you didn't request this, you can safely ignore this email.
      </Text>

      <Text style={smallText}>This link will expire in 1 hour.</Text>
    </EmailLayout>
  );
}

const heading = {
  color: '#333333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 20px',
};

const text = {
  color: '#666666',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 20px',
};

const smallText = {
  color: '#666666',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '20px 0 0',
};
