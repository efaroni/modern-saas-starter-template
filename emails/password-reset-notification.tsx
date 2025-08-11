import { Text } from '@react-email/components';

import { EmailLayout } from './components/layout';

interface PasswordResetNotificationProps {
  userName?: string | null;
  resetTime: Date;
  ipAddress?: string;
  userAgent?: string;
}

export function PasswordResetNotificationEmail({
  userName,
  resetTime,
  ipAddress,
  userAgent,
}: PasswordResetNotificationProps) {
  return (
    <EmailLayout preview='Your password has been successfully reset'>
      <Text style={heading}>Password Reset Successful</Text>

      <Text style={paragraph}>Hello {userName || 'there'},</Text>

      <Text style={paragraph}>
        This email confirms that your password has been successfully reset on{' '}
        {resetTime.toLocaleDateString()} at {resetTime.toLocaleTimeString()}.
      </Text>

      <div style={securityBox}>
        <Text style={securityTitle}>Security Details</Text>
        <div style={detailRow}>
          <span style={detailLabel}>Date & Time:</span>
          <span style={detailValue}>
            {resetTime.toLocaleDateString()} at {resetTime.toLocaleTimeString()}
          </span>
        </div>
        {ipAddress && (
          <div style={detailRow}>
            <span style={detailLabel}>IP Address:</span>
            <span style={detailValue}>{ipAddress}</span>
          </div>
        )}
        {userAgent && (
          <div style={detailRow}>
            <span style={detailLabel}>Device/Browser:</span>
            <span style={detailValue}>{userAgent}</span>
          </div>
        )}
      </div>

      <Text style={paragraph}>
        If you did not request this password reset, please contact our support
        team immediately as this could indicate that your account has been
        compromised.
      </Text>

      <div style={warningBox}>
        <Text style={warningText}>
          <strong>Security Reminder:</strong> Never share your password with
          anyone. We will never ask you for your password via email or phone.
        </Text>
      </div>

      <Text style={paragraph}>For your security, we recommend:</Text>

      <ul style={recommendationsList}>
        <li style={recommendationItem}>Use a unique, strong password</li>
        <li style={recommendationItem}>
          Enable two-factor authentication if available
        </li>
        <li style={recommendationItem}>
          Regularly review your account activity
        </li>
        <li style={recommendationItem}>Keep your email account secure</li>
      </ul>

      <Text style={footerText}>
        Best regards,
        <br />
        The Security Team
      </Text>
    </EmailLayout>
  );
}

const heading = {
  fontSize: '24px',
  fontWeight: '600',
  color: '#333',
  marginBottom: '20px',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#666',
  marginBottom: '20px',
};

const securityBox = {
  backgroundColor: '#f8f9fa',
  border: '1px solid #e9ecef',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
};

const securityTitle = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#495057',
  marginBottom: '15px',
  margin: '0 0 15px 0',
};

const detailRow = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '10px',
  fontSize: '14px',
};

const detailLabel = {
  fontWeight: '500',
  color: '#6c757d',
};

const detailValue = {
  color: '#212529',
};

const warningBox = {
  backgroundColor: '#fff3cd',
  border: '1px solid #ffeaa7',
  borderRadius: '8px',
  padding: '15px',
  margin: '20px 0',
};

const warningText = {
  fontSize: '14px',
  color: '#856404',
  margin: '0',
};

const recommendationsList = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#666',
  paddingLeft: '20px',
  margin: '0 0 20px 0',
};

const recommendationItem = {
  marginBottom: '8px',
};

const footerText = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#666',
  marginTop: '30px',
};
