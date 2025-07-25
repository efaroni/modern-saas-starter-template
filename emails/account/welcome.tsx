import { Button, Section, Text } from '@react-email/components';
import { EmailLayout, emailStyles } from '../components/layout';

interface WelcomeEmailProps {
  dashboardUrl: string;
  userName?: string | null;
}

export function WelcomeEmail({ dashboardUrl, userName }: WelcomeEmailProps) {
  const buttonStyle = {
    ...emailStyles.button,
    backgroundColor: '#28a745',
  };

  return (
    <EmailLayout preview='Welcome to our platform!'>
      <Section style={emailStyles.content}>
        <Text style={emailStyles.heading}>Welcome {userName || 'there'}!</Text>
        <Text style={emailStyles.paragraph}>
          Your account has been successfully created and verified.
        </Text>
        <Text style={emailStyles.paragraph}>
          You can now start using all the features of our platform.
        </Text>
        <Button href={dashboardUrl} style={buttonStyle}>
          Go to Dashboard
        </Button>
        <Text style={emailStyles.footnote}>
          If you have any questions, feel free to reach out to our support team.
        </Text>
      </Section>
    </EmailLayout>
  );
}
