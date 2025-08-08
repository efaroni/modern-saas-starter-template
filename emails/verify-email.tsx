import * as React from 'react';

interface VerifyEmailProps {
  verificationUrl: string;
  userName: string;
}

export function VerifyEmail({ verificationUrl, userName }: VerifyEmailProps) {
  return (
    <div
      style={{
        fontFamily: 'Arial, sans-serif',
        maxWidth: '600px',
        margin: '0 auto',
        padding: '20px',
      }}
    >
      <h2>Verify Your Email</h2>
      <p>Hello {userName},</p>
      <p>
        Thank you for signing up! Please verify your email address by clicking
        the button below:
      </p>
      <a
        href={verificationUrl}
        style={{
          display: 'inline-block',
          padding: '12px 24px',
          backgroundColor: '#28a745',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '4px',
          margin: '16px 0',
        }}
      >
        Verify Email
      </a>
      <p>
        If you didn&apos;t create an account, you can safely ignore this email.
      </p>
    </div>
  );
}
