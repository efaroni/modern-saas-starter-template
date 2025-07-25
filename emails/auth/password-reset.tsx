import { Button, Section, Text } from '@react-email/components';
import { EmailLayout, emailStyles } from '../components/layout';

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
      <Section style={emailStyles.content}>
        <Text style={emailStyles.heading}>Reset Your Password</Text>
        <Text style={emailStyles.paragraph}>Hello {userName || 'there'},</Text>
        <Text style={emailStyles.paragraph}>
          You requested to reset your password. Click the link below to set a
          new password:
        </Text>
        <Button href={resetUrl} style={emailStyles.button}>
          Reset Password
        </Button>
        <Text style={emailStyles.footnote}>
          If you didn't request this, you can safely ignore this email.
        </Text>
        <Text style={emailStyles.footnote}>
          This link will expire in 1 hour.
        </Text>
      </Section>
    </EmailLayout>
  );
}
