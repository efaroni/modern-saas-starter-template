import { Button, Text } from '@react-email/components';

import { EmailLayout } from './components/layout';

interface MarketingEmailProps {
  subject: string;
  content: string;
  ctaText?: string;
  ctaUrl?: string;
  unsubscribeUrl: string;
}

export function MarketingEmail({
  subject,
  content,
  ctaText,
  ctaUrl,
  unsubscribeUrl,
}: MarketingEmailProps) {
  return (
    <EmailLayout preview={subject}>
      <div dangerouslySetInnerHTML={{ __html: content }} />

      {ctaText && ctaUrl && (
        <Button href={ctaUrl} style={button}>
          {ctaText}
        </Button>
      )}

      <div style={footer}>
        <Text style={footerText}>
          You received this email because you subscribed to our newsletter.
        </Text>
        <Text style={footerText}>
          <a href={unsubscribeUrl} style={unsubscribeLink}>
            Unsubscribe from marketing emails
          </a>
        </Text>
      </div>
    </EmailLayout>
  );
}

const button = {
  backgroundColor: '#007bff',
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

const footer = {
  marginTop: '40px',
  paddingTop: '20px',
  borderTop: '1px solid #e6e6e6',
};

const footerText = {
  fontSize: '12px',
  color: '#666',
  margin: '5px 0',
};

const unsubscribeLink = {
  color: '#666',
  textDecoration: 'underline',
};
