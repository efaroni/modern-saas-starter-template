import { render } from '@react-email/render';
import { Resend } from 'resend';

import { PasswordResetNotificationEmail } from '@/emails/password-reset-notification';
import { TestEmail } from '@/emails/test-email';
import { WelcomeEmail } from '@/emails/welcome';

import {
  filterUsersForEmail,
  EmailType,
  logEmailPreferenceCheck,
} from './preferences';
import {
  type EmailService,
  type EmailResult,
  type WelcomeEmailData,
  type MarketingEmailData,
  type PasswordResetNotificationData,
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

  async sendMarketingEmail(
    emails: string[],
    data: MarketingEmailData,
  ): Promise<EmailResult> {
    try {
      // Filter users based on their email preferences
      const allowedUsers = await filterUsersForEmail(
        emails,
        EmailType.MARKETING,
      );

      if (allowedUsers.length === 0) {
        return {
          success: false,
          error: 'No users have opted in to receive marketing emails',
        };
      }

      // Log preference checks for debugging
      allowedUsers.forEach(user => {
        logEmailPreferenceCheck(user, EmailType.MARKETING);
      });

      // Send individual emails with personalized unsubscribe links
      for (const user of allowedUsers) {
        const personalizedUnsubscribeUrl =
          user.unsubscribeUrl || data.unsubscribeUrl;

        await this.resend.emails.send({
          from: this.from,
          to: user.userEmail,
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
                <a href="${personalizedUnsubscribeUrl}" style="color: #666;">Unsubscribe</a>
              </div>
            </div>
          `,
        });
      }

      console.warn(
        `Marketing email sent to ${allowedUsers.length} out of ${emails.length} recipients`,
      );

      return { success: true };
    } catch (error) {
      console.error('Failed to send marketing email:', error);
      return {
        success: false,
        error: 'Failed to send marketing email',
      };
    }
  }

  async sendPasswordResetNotificationEmail(
    email: string,
    data: PasswordResetNotificationData,
  ): Promise<EmailResult> {
    try {
      const html = await render(
        PasswordResetNotificationEmail({
          userName: data.user.name,
          resetTime: data.resetTime,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        }),
      );

      await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: 'Password Reset Confirmation',
        html,
      });
      return { success: true };
    } catch (error) {
      console.error('Failed to send password reset notification email:', error);
      return {
        success: false,
        error: 'Failed to send password reset notification email',
      };
    }
  }

  async sendTestEmail(email: string): Promise<EmailResult> {
    try {
      console.warn('Attempting to send test email to:', email);
      console.warn('From address:', this.from);
      console.warn('API Key configured:', !!process.env.RESEND_API_KEY);

      const html = await render(
        TestEmail({
          timestamp: new Date(),
        }),
      );

      const result = await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: 'Test Email - Service Working',
        html,
      });

      console.warn('Resend API response:', result);
      return { success: true };
    } catch (error) {
      console.error('Failed to send test email:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to send test email',
      };
    }
  }
}
