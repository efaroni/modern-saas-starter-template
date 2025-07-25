import { Link, Section, Text } from '@react-email/components';

export function Footer() {
  return (
    <Section style={footerStyle}>
      <Text style={footerText}>
        © {new Date().getFullYear()} Your SaaS. All rights reserved.
      </Text>
      <Text style={footerLinks}>
        <Link href={`${process.env.NEXT_PUBLIC_APP_URL}/privacy`} style={link}>
          Privacy Policy
        </Link>
        {' • '}
        <Link href={`${process.env.NEXT_PUBLIC_APP_URL}/terms`} style={link}>
          Terms of Service
        </Link>
      </Text>
    </Section>
  );
}

const footerStyle = {
  borderTop: '1px solid #e6e6e6',
  marginTop: '32px',
  paddingTop: '20px',
  textAlign: 'center' as const,
};

const footerText = {
  fontSize: '14px',
  color: '#999',
  margin: '0 0 10px 0',
};

const footerLinks = {
  fontSize: '14px',
  color: '#999',
};

const link = {
  color: '#999',
  textDecoration: 'underline',
};
