import { Heading, Text } from '@react-email/components';
import EmailLayout from '../components/layout';
import EmailButton from '../components/button';

interface SubscriptionEndingProps {
  userName?: string;
  planName: string;
  reason: 'cancelled' | 'failed_payment';
  dashboardUrl: string;
}

export default function SubscriptionEndingTemplate({
  userName,
  planName,
  reason,
  dashboardUrl,
  unsubscribeUrl,
}: SubscriptionEndingProps & { unsubscribeUrl?: string }) {
  const reasonText =
    reason === 'cancelled'
      ? 'has been cancelled'
      : 'has ended due to a payment issue';

  return (
    <EmailLayout
      previewText='Subscription update'
      unsubscribeUrl={unsubscribeUrl}
    >
      <Heading style={heading}>Subscription Update</Heading>

      <Text style={text}>Hello {userName || 'there'},</Text>

      <Text style={text}>
        Your subscription to <strong>{planName}</strong> {reasonText}.
      </Text>

      <Text style={text}>
        You can reactivate your subscription at any time from your dashboard.
      </Text>

      <EmailButton href={dashboardUrl} variant='primary'>
        Manage Subscription
      </EmailButton>

      <Text style={smallText}>Thank you for using our platform!</Text>
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
