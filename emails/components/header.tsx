import { Img, Section } from '@react-email/components';

export function Header() {
  return (
    <Section style={headerStyle}>
      <Img
        src={`${process.env.NEXT_PUBLIC_APP_URL}/logo.png`}
        width='150'
        height='50'
        alt='Your SaaS'
      />
    </Section>
  );
}

const headerStyle = {
  padding: '20px 0',
  borderBottom: '1px solid #e6e6e6',
  marginBottom: '20px',
};
