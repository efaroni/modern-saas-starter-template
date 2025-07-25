import { Heading, Text } from '@react-email/components';
import EmailLayout from '../components/layout';
import EmailButton from '../components/button';

interface SubscriptionConfirmationProps {
  userName?: string;
  planName: string;
  dashboardUrl: string;
}

export default function SubscriptionConfirmationTemplate({
  userName,
  planName,
  dashboardUrl,
  unsubscribeUrl,
}: SubscriptionConfirmationProps & { unsubscribeUrl?: string }) {
  return (
    <EmailLayout
      previewText='Subscription confirmed!'
      unsubscribeUrl={unsubscribeUrl}
    >
      <Heading style={heading}>Subscription Confirmed!</Heading>

      <Text style={text}>Hello {userName || 'there'},</Text>

      <Text style={text}>
        Your subscription to <strong>{planName}</strong> has been confirmed!
      </Text>

      <Text style={text}>
        You now have access to all premium features. Visit your dashboard to get
        started.
      </Text>

      <EmailButton href={dashboardUrl} variant='secondary'>
        Access Dashboard
      </EmailButton>

      <Text style={smallText}>Thank you for choosing our platform!</Text>
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
