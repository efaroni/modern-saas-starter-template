import { Body, Container, Head, Html, Preview } from '@react-email/components';

import { Footer } from './footer';
import { Header } from './header';

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
}

export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Header />
          {children}
          <Footer />
        </Container>
      </Body>
    </Html>
  );
}

// Consistent styles across all templates
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
};

export const emailStyles = {
  content: {
    padding: '0 20px',
  },
  heading: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '20px',
  },
  paragraph: {
    fontSize: '16px',
    lineHeight: '24px',
    color: '#666',
    marginBottom: '20px',
  },
  button: {
    backgroundColor: '#dc3545',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'block',
    padding: '12px 24px',
    margin: '16px 0',
  },
  footnote: {
    fontSize: '14px',
    color: '#666',
    marginTop: '20px',
  },
};
