import type { EmailType } from './preferences';

export interface EmailResult {
  success: boolean;
  error?: string;
}

export interface WelcomeEmailData {
  user: {
    id: string;
    email: string;
    name?: string | null;
  };
  dashboardUrl: string;
}

export interface MarketingEmailData {
  subject: string;
  content: string;
  ctaText?: string;
  ctaUrl?: string;
  unsubscribeUrl: string;
}

export interface PasswordResetNotificationData {
  user: {
    email: string;
    name?: string | null;
  };
  resetTime: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface TestEmailData {
  user: {
    email: string;
    name?: string | null;
  };
  timestamp: Date;
}

export interface EmailService {
  sendWelcomeEmail(email: string, data: WelcomeEmailData): Promise<EmailResult>;
  sendMarketingEmail(
    emails: string[],
    data: MarketingEmailData,
  ): Promise<EmailResult>;
  sendPasswordResetNotificationEmail(
    email: string,
    data: PasswordResetNotificationData,
  ): Promise<EmailResult>;
  sendTestEmail(
    email: string,
    userId?: string,
    emailType?: EmailType,
  ): Promise<EmailResult>;
}
