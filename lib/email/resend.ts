import { Resend } from 'resend';

import {
  type EmailService,
  type EmailResult,
  type PasswordResetEmailData,
  type EmailVerificationData,
  type WelcomeEmailData,
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
      await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: 'Reset your password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333; margin-bottom: 20px;">Reset Your Password</h2>
            <p style="color: #666; margin-bottom: 20px;">Hello ${data.user.name || 'there'},</p>
            <p style="color: #666; margin-bottom: 20px;">
              You requested to reset your password. Click the link below to set a new password:
            </p>
            <a href="${data.resetUrl}" 
               style="display: inline-block; padding: 12px 24px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">
              Reset Password
            </a>
            <p style="color: #666; margin-top: 20px; font-size: 14px;">
              If you didn't request this, you can safely ignore this email.
            </p>
            <p style="color: #666; font-size: 14px;">
              This link will expire in 1 hour.
            </p>
          </div>
        `,
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
      await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: 'Verify your email address',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333; margin-bottom: 20px;">Verify Your Email Address</h2>
            <p style="color: #666; margin-bottom: 20px;">Hello ${data.user.name || 'there'},</p>
            <p style="color: #666; margin-bottom: 20px;">
              Thank you for signing up! Please click the link below to verify your email address:
            </p>
            <a href="${data.verificationUrl}" 
               style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">
              Verify Email
            </a>
            <p style="color: #666; margin-top: 20px; font-size: 14px;">
              If you didn't create an account, you can safely ignore this email.
            </p>
            <p style="color: #666; font-size: 14px;">
              This link will expire in 24 hours.
            </p>
          </div>
        `,
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
      await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: 'Welcome to our platform!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333; margin-bottom: 20px;">Welcome ${data.user.name || 'there'}!</h2>
            <p style="color: #666; margin-bottom: 20px;">
              Your account has been successfully created and verified.
            </p>
            <p style="color: #666; margin-bottom: 20px;">
              You can now start using all the features of our platform.
            </p>
            <a href="${data.dashboardUrl}" 
               style="display: inline-block; padding: 12px 24px; background-color: #28a745; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">
              Go to Dashboard
            </a>
            <p style="color: #666; margin-top: 20px; font-size: 14px;">
              If you have any questions, feel free to reach out to our support team.
            </p>
          </div>
        `,
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
}
