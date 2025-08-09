import * as React from 'react';

interface WelcomeEmailProps {
  userName: string;
  dashboardUrl: string;
  unsubscribeUrl?: string;
}

export function WelcomeEmail({
  userName,
  dashboardUrl,
  unsubscribeUrl,
}: WelcomeEmailProps) {
  return (
    <div
      style={{
        fontFamily: 'Arial, sans-serif',
        maxWidth: '600px',
        margin: '0 auto',
        padding: '20px',
      }}
    >
      <h2>Welcome to our Platform!</h2>
      <p>Hello {userName},</p>
      <p>Welcome to our platform! We&apos;re excited to have you on board.</p>
      <p>Get started by visiting your dashboard:</p>
      <a
        href={dashboardUrl}
        style={{
          display: 'inline-block',
          padding: '12px 24px',
          backgroundColor: '#007bff',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '4px',
          margin: '16px 0',
        }}
      >
        Go to Dashboard
      </a>
      <p>
        If you have any questions, feel free to reach out to our support team.
      </p>
      <p>
        Best regards,
        <br />
        The Team
      </p>
      {unsubscribeUrl && (
        <div
          style={{
            marginTop: '30px',
            paddingTop: '20px',
            borderTop: '1px solid #eee',
            fontSize: '12px',
            color: '#666',
          }}
        >
          <a href={unsubscribeUrl} style={{ color: '#666' }}>
            Unsubscribe from marketing emails
          </a>
        </div>
      )}
    </div>
  );
}
