import { Button, Section, Text } from '@react-email/components';
import { EmailLayout, emailStyles } from '../components/layout';

interface SubscriptionChangeEmailProps {
  userName?: string | null;
  previousPlan: string;
  newPlan: string;
  effectiveDate: Date;
}

export function SubscriptionChangeEmail({
  userName,
  previousPlan,
  newPlan,
  effectiveDate,
}: SubscriptionChangeEmailProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const buttonStyle = {
    ...emailStyles.button,
    backgroundColor: '#007bff',
  };

  const isUpgrade = newPlan !== 'Free' && previousPlan === 'Free';
  const isDowngrade = newPlan === 'Free' && previousPlan !== 'Free';

  return (
    <EmailLayout preview='Subscription Updated'>
      <Section style={emailStyles.content}>
        <Text style={emailStyles.heading}>Subscription Updated</Text>
        <Text style={emailStyles.paragraph}>Hello {userName || 'there'},</Text>
        <Text style={emailStyles.paragraph}>
          Your subscription has been{' '}
          {isUpgrade ? 'upgraded' : isDowngrade ? 'cancelled' : 'changed'}.
        </Text>
        <Text style={emailStyles.paragraph}>
          <strong>Previous plan:</strong> {previousPlan}
          <br />
          <strong>New plan:</strong> {newPlan}
          <br />
          <strong>Effective date:</strong> {formatDate(effectiveDate)}
        </Text>
        {isUpgrade && (
          <Text style={emailStyles.paragraph}>
            Welcome to {newPlan}! You now have access to all the premium
            features.
          </Text>
        )}
        {isDowngrade && (
          <Text style={emailStyles.paragraph}>
            Your subscription has been cancelled. You'll continue to have access
            to premium features until {formatDate(effectiveDate)}.
          </Text>
        )}
        <Button
          href={`${process.env.NEXT_PUBLIC_APP_URL}/billing`}
          style={buttonStyle}
        >
          Manage Subscription
        </Button>
        <Text style={emailStyles.footnote}>
          If you have any questions about this change, please contact our
          support team.
        </Text>
      </Section>
    </EmailLayout>
  );
}
