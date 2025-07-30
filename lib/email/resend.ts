import { render } from '@react-email/render';
import { Resend } from 'resend';

import { PasswordResetEmail } from '@/emails/password-reset';
import { PaymentFailedEmail } from '@/emails/payment-failed';
import { PaymentSuccessEmail } from '@/emails/payment-success';
import { VerifyEmail } from '@/emails/verify-email';
import { WelcomeEmail } from '@/emails/welcome';

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

  constructor(apiKey: string, from: string, baseUrl: string) {
    this.resend = new Resend(apiKey);
    this.from = from;
    this.baseUrl = baseUrl;
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
        from: this.from,
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
        from: this.from,
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
          userName: data.user.name,
          dashboardUrl: data.dashboardUrl,
        }),
      );

      await this.resend.emails.send({
        from: this.from,
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
        }),
      );

      await this.resend.emails.send({
        from: this.from,
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
          retryUrl: data.retryUrl,
        }),
      );

      await this.resend.emails.send({
        from: this.from,
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
      // For now, use a simple inline template since we haven't created the component yet
      await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: 'Subscription Updated',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Subscription Updated</h2>
            <p>Hello ${data.user.name || 'there'},</p>
            <p>Your subscription has been updated from ${data.previousPlan} to ${data.newPlan}.</p>
            <p>This change will take effect on ${data.effectiveDate.toLocaleDateString()}.</p>
            <p>Thank you for your business!</p>
          </div>
        `,
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
      // Send to multiple recipients
      await this.resend.emails.send({
        from: this.from,
        to: emails,
        subject: data.subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="margin-bottom: 20px;">${data.content}</div>
            ${
              data.ctaText && data.ctaUrl
                ? `
              <a href="${data.ctaUrl}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">
                ${data.ctaText}
              </a>
            `
                : ''
            }
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
              <a href="${data.unsubscribeUrl}" style="color: #666;">Unsubscribe</a>
            </div>
          </div>
        `,
      });
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
