export interface EmailResult {
  success: boolean;
  error?: string;
}

export interface PasswordResetEmailData {
  resetToken: string;
  resetUrl: string;
  user: {
    email: string;
    name?: string | null;
  };
}

export interface EmailVerificationData {
  verificationToken: string;
  verificationUrl: string;
  user: {
    email: string;
    name?: string | null;
  };
}

export interface WelcomeEmailData {
  user: {
    email: string;
    name?: string | null;
  };
  dashboardUrl: string;
}

export interface SubscriptionConfirmationEmailData {
  user: {
    email: string;
    name?: string;
  };
  planName: string;
  dashboardUrl: string;
}

export interface SubscriptionEndingEmailData {
  user: {
    email: string;
    name?: string;
  };
  planName: string;
  reason: 'cancelled' | 'expired' | 'failed_payment';
  dashboardUrl: string;
}

export interface EmailLogParams {
  toEmail: string;
  templateType:
    | 'welcome'
    | 'verification'
    | 'password-reset'
    | 'subscription-confirmation'
    | 'subscription-ending';
  metadata?: Record<string, unknown>;
}

export interface EmailService {
  sendPasswordResetEmail(
    email: string,
    data: PasswordResetEmailData,
  ): Promise<EmailResult>;
  sendVerificationEmail(
    email: string,
    data: EmailVerificationData,
  ): Promise<EmailResult>;
  sendWelcomeEmail(email: string, data: WelcomeEmailData): Promise<EmailResult>;
  sendSubscriptionConfirmationEmail(
    email: string,
    data: SubscriptionConfirmationEmailData,
  ): Promise<EmailResult>;
  sendSubscriptionEndingEmail(
    email: string,
    data: SubscriptionEndingEmailData,
  ): Promise<EmailResult>;
}
