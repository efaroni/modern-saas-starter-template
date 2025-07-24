import { Heading, Text } from '@react-email/components';
import EmailLayout from '../components/layout';
import EmailButton from '../components/button';

interface WelcomeEmailProps {
  userName?: string;
  dashboardUrl: string;
}

export default function WelcomeEmail({
  userName,
  dashboardUrl,
}: WelcomeEmailProps) {
  return (
    <EmailLayout previewText='Welcome to our platform!'>
      <Heading style={heading}>Welcome {userName || 'there'}!</Heading>

      <Text style={text}>
        Your account has been successfully created and verified.
      </Text>

      <Text style={text}>
        You can now start using all the features of our platform.
      </Text>

      <EmailButton href={dashboardUrl} variant='secondary'>
        Go to Dashboard
      </EmailButton>

      <Text style={smallText}>
        If you have any questions, feel free to reach out to our support team.
      </Text>
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
