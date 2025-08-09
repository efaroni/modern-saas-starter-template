import { EmailType } from './preferences';
import {
  type EmailService,
  type EmailResult,
  type WelcomeEmailData,
  type MarketingEmailData,
  type PasswordResetNotificationData,
} from './types';

export class MockEmailService implements EmailService {
  private sentEmails: Array<{
    to: string | string[];
    type: 'password_reset_notification' | 'welcome' | 'marketing' | 'test';
  }> = [];
  private shouldFail = false;

  async sendWelcomeEmail(
    email: string,
    _data: WelcomeEmailData,
  ): Promise<EmailResult> {
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check if we should fail
    if (this.shouldFail) {
      return {
        success: false,
        error: 'Email service failed',
      };
    }

    // Store the email for testing purposes
    this.sentEmails.push({
      to: email,
      type: 'welcome',
    });

    // Mock success
    return {
      success: true,
    };
  }

  async sendMarketingEmail(
    emails: string[],
    _data: MarketingEmailData,
  ): Promise<EmailResult> {
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check if we should fail
    if (this.shouldFail) {
      return {
        success: false,
        error: 'Email service failed',
      };
    }

    // Store the email for testing purposes
    this.sentEmails.push({
      to: emails,
      type: 'marketing',
    });

    // Mock success
    return {
      success: true,
    };
  }

  async sendPasswordResetNotificationEmail(
    email: string,
    _data: PasswordResetNotificationData,
  ): Promise<EmailResult> {
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check if we should fail
    if (this.shouldFail) {
      return {
        success: false,
        error: 'Email service failed',
      };
    }

    // Store the email for testing purposes
    this.sentEmails.push({
      to: email,
      type: 'password_reset_notification',
    });

    // Mock success
    return {
      success: true,
    };
  }

  async sendTestEmail(
    email: string,
    _userId?: string,
    _emailType: EmailType = EmailType.MARKETING,
  ): Promise<EmailResult> {
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check if we should fail
    if (this.shouldFail) {
      return {
        success: false,
        error: 'Email service failed',
      };
    }

    // Store the email for testing purposes
    this.sentEmails.push({
      to: email,
      type: 'test',
    });

    // Mock success
    return {
      success: true,
    };
  }

  // Helper methods for testing
  getSentEmails() {
    return [...this.sentEmails];
  }

  getLastSentEmail() {
    return this.sentEmails[this.sentEmails.length - 1];
  }

  clearSentEmails() {
    this.sentEmails = [];
  }

  setShouldFail(shouldFail: boolean) {
    this.shouldFail = shouldFail;
  }
}
