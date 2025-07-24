import { Button } from '@react-email/components';

interface EmailButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
}

export default function EmailButton({
  href,
  children,
  variant = 'primary',
}: EmailButtonProps) {
  const getButtonStyles = () => {
    const baseStyles = {
      display: 'inline-block',
      padding: '12px 24px',
      borderRadius: '4px',
      textDecoration: 'none',
      fontSize: '16px',
      fontWeight: '600',
      textAlign: 'center' as const,
      margin: '16px 0',
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyles,
          backgroundColor: '#007bff',
          color: '#ffffff',
        };
      case 'secondary':
        return {
          ...baseStyles,
          backgroundColor: '#28a745',
          color: '#ffffff',
        };
      case 'danger':
        return {
          ...baseStyles,
          backgroundColor: '#dc3545',
          color: '#ffffff',
        };
      default:
        return {
          ...baseStyles,
          backgroundColor: '#007bff',
          color: '#ffffff',
        };
    }
  };

  return (
    <Button href={href} style={getButtonStyles()}>
      {children}
    </Button>
  );
}
