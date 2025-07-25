import { Button, Section, Text } from '@react-email/components';
import { EmailLayout, emailStyles } from '../components/layout';

interface MarketingEmailProps {
  subject: string;
  content: string;
  ctaText?: string;
  ctaUrl?: string;
  unsubscribeUrl?: string;
}

export function MarketingEmail({
  subject,
  content,
  ctaText,
  ctaUrl,
  unsubscribeUrl,
}: MarketingEmailProps) {
  const buttonStyle = {
    ...emailStyles.button,
    backgroundColor: '#007bff',
  };

  const unsubscribeStyle = {
    fontSize: '12px',
    color: '#999',
    textAlign: 'center' as const,
    marginTop: '20px',
    borderTop: '1px solid #e6e6e6',
    paddingTop: '20px',
  };

  return (
    <EmailLayout preview={subject}>
      <Section style={emailStyles.content}>
        <Text style={emailStyles.heading}>{subject}</Text>
        <div dangerouslySetInnerHTML={{ __html: content }} />
        {ctaText && ctaUrl && (
          <Button href={ctaUrl} style={buttonStyle}>
            {ctaText}
          </Button>
        )}
        {unsubscribeUrl && (
          <Text style={unsubscribeStyle}>
            Don't want to receive these emails?{' '}
            <a href={unsubscribeUrl} style={{ color: '#999' }}>
              Unsubscribe
            </a>
          </Text>
        )}
      </Section>
    </EmailLayout>
  );
}
