import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

import { EmailLayout } from './components/layout';

interface TestEmailProps {
  timestamp?: Date;
}

export function TestEmail({ timestamp = new Date() }: TestEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Test Email - Your email service is working!</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailLayout>
            <Section style={content}>
              <Text style={heading}>✅ Test Email Successful</Text>
              <Text style={paragraph}>
                This is a test email to verify that your email service is
                working correctly.
              </Text>
              <Section style={infoBox}>
                <Text style={infoText}>
                  <strong>Sent at:</strong>{' '}
                  {timestamp.toLocaleString('en-US', {
                    timeZone: 'UTC',
                    dateStyle: 'full',
                    timeStyle: 'long',
                  })}
                </Text>
              </Section>
              <Text style={paragraph}>
                If you received this email, your email configuration is working
                properly! 🎉
              </Text>
              <Text style={footnote}>
                This test email was sent from your SaaS application&apos;s email
                settings page.
              </Text>
            </Section>
          </EmailLayout>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const content = {
  padding: '0 20px',
};

const heading = {
  fontSize: '24px',
  fontWeight: '600',
  color: '#16a34a',
  marginBottom: '20px',
  textAlign: 'center' as const,
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#374151',
  marginBottom: '20px',
};

const infoBox = {
  backgroundColor: '#f8f9fa',
  padding: '15px',
  borderRadius: '4px',
  margin: '20px 0',
  border: '1px solid #e5e7eb',
};

const infoText = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '0',
};

const footnote = {
  fontSize: '12px',
  color: '#9ca3af',
  marginTop: '30px',
  textAlign: 'center' as const,
};
