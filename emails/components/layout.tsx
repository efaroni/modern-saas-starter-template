import {
  Body,
  Container,
  Head,
  Html,
  Text,
  Link,
} from '@react-email/components';

interface EmailLayoutProps {
  children: React.ReactNode;
  previewText?: string;
  unsubscribeUrl?: string;
}

export default function EmailLayout({
  children,
  previewText,
  unsubscribeUrl,
}: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      {previewText && (
        <Text style={{ display: 'none', opacity: 0, color: 'transparent' }}>
          {previewText}
        </Text>
      )}
      <Body style={main}>
        <Container style={container}>
          <div style={header}>
            <Text style={logoText}>Your Platform</Text>
          </div>

          <div style={content}>{children}</div>

          <div style={footer}>
            <Text style={footerText}>
              © 2024 Your Platform. All rights reserved.
            </Text>
            {unsubscribeUrl && (
              <Text style={footerText}>
                <Link href={unsubscribeUrl} style={unsubscribeLink}>
                  Unsubscribe
                </Link>
              </Text>
            )}
          </div>
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

const header = {
  padding: '20px 40px',
  borderBottom: '1px solid #e6ebf1',
};

const logoText = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#333333',
  margin: '0',
};

const content = {
  padding: '40px',
};

const footer = {
  padding: '20px 40px',
  borderTop: '1px solid #e6ebf1',
  textAlign: 'center' as const,
};

const footerText = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '4px 0',
};

const unsubscribeLink = {
  color: '#8898aa',
  textDecoration: 'underline',
};
