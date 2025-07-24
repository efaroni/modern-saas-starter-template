import { Heading, Text } from '@react-email/components';
import EmailLayout from '../components/layout';
import EmailButton from '../components/button';

interface EmailVerificationProps {
  userName?: string;
  verificationUrl: string;
}

export default function EmailVerificationTemplate({
  userName,
  verificationUrl,
}: EmailVerificationProps) {
  return (
    <EmailLayout previewText='Verify your email address'>
      <Heading style={heading}>Verify Your Email Address</Heading>

      <Text style={text}>Hello {userName || 'there'},</Text>

      <Text style={text}>
        Thank you for signing up! Please click the link below to verify your
        email address:
      </Text>

      <EmailButton href={verificationUrl} variant='primary'>
        Verify Email
      </EmailButton>

      <Text style={smallText}>
        If you didn't create an account, you can safely ignore this email.
      </Text>

      <Text style={smallText}>This link will expire in 24 hours.</Text>
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
