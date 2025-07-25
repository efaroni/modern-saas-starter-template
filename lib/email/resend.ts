import { render } from '@react-email/render';
import { Resend } from 'resend';

// React Email template imports
import { WelcomeEmail } from '@/emails/account/welcome';
import { PasswordResetEmail } from '@/emails/auth/password-reset';
import { VerifyEmail } from '@/emails/auth/verify-email';
import { PaymentFailedEmail } from '@/emails/billing/payment-failed';
import { PaymentSuccessEmail } from '@/emails/billing/payment-success';
import { SubscriptionChangeEmail } from '@/emails/billing/subscription-change';
import { MarketingEmail } from '@/emails/marketing/newsletter';

import {
  type EmailService,
  type EmailResult,
  type PasswordResetEmailData,
  type EmailVerificationData,
  type WelcomeEmailData,
  type PaymentEmailData,
  type SubscriptionChangeEmailData,
  type MarketingEmailData,
} from './types';

export class ResendEmailService implements EmailService {
  private resend: Resend;
  private from: string;
  private baseUrl: string;
  private fromName: string;

  constructor(apiKey: string, from: string, baseUrl: string) {
    this.resend = new Resend(apiKey);
    this.from = from;
    this.baseUrl = baseUrl;
    this.fromName = process.env.RESEND_FROM_NAME || 'Your SaaS';
  }

  async sendPasswordResetEmail(
    email: string,
    data: PasswordResetEmailData,
  ): Promise<EmailResult> {
    try {
      const html = await render(
        PasswordResetEmail({
          resetUrl: data.resetUrl,
          userName: data.user.name,
        }),
      );

      await this.resend.emails.send({
        from: `${this.fromName} <${this.from}>`,
        to: email,
        subject: 'Reset your password',
        html,
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      return {
        success: false,
        error: 'Failed to send password reset email',
      };
    }
  }

  async sendVerificationEmail(
    email: string,
    data: EmailVerificationData,
  ): Promise<EmailResult> {
    try {
      const html = await render(
        VerifyEmail({
          verificationUrl: data.verificationUrl,
          userName: data.user.name,
        }),
      );

      await this.resend.emails.send({
        from: `${this.fromName} <${this.from}>`,
        to: email,
        subject: 'Verify your email address',
        html,
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to send verification email:', error);
      return {
        success: false,
        error: 'Failed to send verification email',
      };
    }
  }

  async sendWelcomeEmail(
    email: string,
    data: WelcomeEmailData,
  ): Promise<EmailResult> {
    try {
      const html = await render(
        WelcomeEmail({
          dashboardUrl: data.dashboardUrl,
          userName: data.user.name,
        }),
      );

      await this.resend.emails.send({
        from: `${this.fromName} <${this.from}>`,
        to: email,
        subject: 'Welcome to our platform!',
        html,
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      return {
        success: false,
        error: 'Failed to send welcome email',
      };
    }
  }

  // NEW billing email methods
  async sendPaymentSuccessEmail(
    email: string,
    data: PaymentEmailData,
  ): Promise<EmailResult> {
    try {
      const html = await render(
        PaymentSuccessEmail({
          userName: data.user.name,
          amount: data.amount,
          currency: data.currency,
          invoiceUrl: data.invoiceUrl,
          billingDetails: data.billingDetails,
        }),
      );

      await this.resend.emails.send({
        from: `${this.fromName} <${this.from}>`,
        to: email,
        subject: 'Payment Successful',
        html,
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to send payment success email:', error);
      return {
        success: false,
        error: 'Failed to send payment success email',
      };
    }
  }

  async sendPaymentFailedEmail(
    email: string,
    data: PaymentEmailData,
  ): Promise<EmailResult> {
    try {
      const html = await render(
        PaymentFailedEmail({
          userName: data.user.name,
          amount: data.amount,
          currency: data.currency,
          billingDetails: data.billingDetails,
        }),
      );

      await this.resend.emails.send({
        from: `${this.fromName} <${this.from}>`,
        to: email,
        subject: 'Payment Failed',
        html,
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to send payment failed email:', error);
      return {
        success: false,
        error: 'Failed to send payment failed email',
      };
    }
  }

  async sendSubscriptionChangeEmail(
    email: string,
    data: SubscriptionChangeEmailData,
  ): Promise<EmailResult> {
    try {
      const html = await render(
        SubscriptionChangeEmail({
          userName: data.user.name,
          previousPlan: data.previousPlan,
          newPlan: data.newPlan,
          effectiveDate: data.effectiveDate,
        }),
      );

      await this.resend.emails.send({
        from: `${this.fromName} <${this.from}>`,
        to: email,
        subject: 'Subscription Updated',
        html,
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to send subscription change email:', error);
      return {
        success: false,
        error: 'Failed to send subscription change email',
      };
    }
  }

  async sendMarketingEmail(
    emails: string[],
    data: MarketingEmailData,
  ): Promise<EmailResult> {
    try {
      // Generate unsubscribe URLs for each email (simplified for now)
      const sendPromises = emails.map(async email => {
        const unsubscribeUrl = `${this.baseUrl}/unsubscribe?email=${encodeURIComponent(email)}`;

        const html = await render(
          MarketingEmail({
            subject: data.subject,
            content: data.content,
            ctaText: data.ctaText,
            ctaUrl: data.ctaUrl,
            unsubscribeUrl,
          }),
        );

        return this.resend.emails.send({
          from: `${this.fromName} <${this.from}>`,
          to: email,
          subject: data.subject,
          html,
        });
      });

      await Promise.all(sendPromises);
      return { success: true };
    } catch (error) {
      console.error('Failed to send marketing email:', error);
      return {
        success: false,
        error: 'Failed to send marketing email',
      };
    }
  }
}
