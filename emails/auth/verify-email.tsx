import { Button, Section, Text } from '@react-email/components';
import { EmailLayout, emailStyles } from '../components/layout';

interface VerifyEmailProps {
  verificationUrl: string;
  userName?: string | null;
}

export function VerifyEmail({ verificationUrl, userName }: VerifyEmailProps) {
  const buttonStyle = {
    ...emailStyles.button,
    backgroundColor: '#007bff',
  };

  return (
    <EmailLayout preview='Verify your email address'>
      <Section style={emailStyles.content}>
        <Text style={emailStyles.heading}>Verify Your Email Address</Text>
        <Text style={emailStyles.paragraph}>Hello {userName || 'there'},</Text>
        <Text style={emailStyles.paragraph}>
          Thank you for signing up! Please click the link below to verify your
          email address:
        </Text>
        <Button href={verificationUrl} style={buttonStyle}>
          Verify Email
        </Button>
        <Text style={emailStyles.footnote}>
          If you didn't create an account, you can safely ignore this email.
        </Text>
        <Text style={emailStyles.footnote}>
          This link will expire in 24 hours.
        </Text>
      </Section>
    </EmailLayout>
  );
}
