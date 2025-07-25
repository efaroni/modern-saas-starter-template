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

// NEW interfaces for billing emails
export interface PaymentEmailData {
  user: {
    email: string;
    name?: string | null;
  };
  amount: number;
  currency: string;
  invoiceUrl?: string;
  billingDetails?: {
    last4?: string;
    brand?: string;
  };
}

export interface SubscriptionChangeEmailData {
  user: {
    email: string;
    name?: string | null;
  };
  previousPlan: string;
  newPlan: string;
  effectiveDate: Date;
}

export interface MarketingEmailData {
  subject: string;
  content: string;
  ctaText?: string;
  ctaUrl?: string;
}

export interface EmailService {
  // Existing methods
  sendPasswordResetEmail(
    email: string,
    data: PasswordResetEmailData,
  ): Promise<EmailResult>;
  sendVerificationEmail(
    email: string,
    data: EmailVerificationData,
  ): Promise<EmailResult>;
  sendWelcomeEmail(email: string, data: WelcomeEmailData): Promise<EmailResult>;

  // NEW methods for billing emails
  sendPaymentSuccessEmail(
    email: string,
    data: PaymentEmailData,
  ): Promise<EmailResult>;
  sendPaymentFailedEmail(
    email: string,
    data: PaymentEmailData,
  ): Promise<EmailResult>;
  sendSubscriptionChangeEmail(
    email: string,
    data: SubscriptionChangeEmailData,
  ): Promise<EmailResult>;
  sendMarketingEmail(
    emails: string[],
    data: MarketingEmailData,
  ): Promise<EmailResult>;
}
