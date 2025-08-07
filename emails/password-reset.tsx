import * as React from 'react';

interface PasswordResetEmailProps {
  resetUrl: string;
  userName: string;
}

export function PasswordResetEmail({
  resetUrl,
  userName,
}: PasswordResetEmailProps) {
  return (
    <div
      style={{
        fontFamily: 'Arial, sans-serif',
        maxWidth: '600px',
        margin: '0 auto',
        padding: '20px',
      }}
    >
      <h2>Reset Your Password</h2>
      <p>Hello {userName},</p>
      <p>
        We received a request to reset your password. Click the button below to
        reset it:
      </p>
      <a
        href={resetUrl}
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
        Reset Password
      </a>
      <p>If you didn&apos;t request this, you can safely ignore this email.</p>
      <p>This link will expire in 24 hours.</p>
    </div>
  );
}
