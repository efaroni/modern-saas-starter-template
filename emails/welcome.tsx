import { Button, Text } from '@react-email/components';

import { EmailLayout } from './components/layout';

interface WelcomeEmailProps {
  userName?: string | null;
  dashboardUrl: string;
}

export function WelcomeEmail({ userName, dashboardUrl }: WelcomeEmailProps) {
  return (
    <EmailLayout preview='Welcome to our platform!'>
      <Text style={heading}>Welcome {userName || 'there'}!</Text>
      <Text style={paragraph}>
        Your account has been successfully created and verified.
      </Text>
      <Text style={paragraph}>
        You can now start using all the features of our platform.
      </Text>
      <Button href={dashboardUrl} style={button}>
        Go to Dashboard
      </Button>
      <Text style={footnote}>
        If you have any questions, feel free to reach out to our support team.
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
