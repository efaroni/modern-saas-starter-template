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
    data:
      | PasswordResetNotificationData
      | WelcomeEmailData
      | MarketingEmailData
      | { timestamp: Date };
    sentAt: Date;
  }> = [];
  private shouldFail = false;

  async sendWelcomeEmail(
    email: string,
    data: WelcomeEmailData,
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
      data,
      sentAt: new Date(),
    });

    // Mock success
    return {
      success: true,
    };
  }

  async sendMarketingEmail(
    emails: string[],
    data: MarketingEmailData,
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
      data,
      sentAt: new Date(),
    });

    // Mock success
    return {
      success: true,
    };
  }

  async sendPasswordResetNotificationEmail(
    email: string,
    data: PasswordResetNotificationData,
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
      data,
      sentAt: new Date(),
    });

    // Mock success
    return {
      success: true,
    };
  }

  async sendTestEmail(email: string): Promise<EmailResult> {
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
      data: { timestamp: new Date() },
      sentAt: new Date(),
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
