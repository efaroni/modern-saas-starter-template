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

export class MockEmailService implements EmailService {
  private sentEmails: Array<{
    to: string;
    type:
      | 'password_reset'
      | 'verification'
      | 'welcome'
      | 'payment_success'
      | 'payment_failed'
      | 'subscription_change'
      | 'marketing';
    data:
      | PasswordResetEmailData
      | EmailVerificationData
      | WelcomeEmailData
      | PaymentEmailData
      | SubscriptionChangeEmailData
      | MarketingEmailData;
    sentAt: Date;
  }> = [];
  private shouldFail = false;

  async sendPasswordResetEmail(
    email: string,
    data: PasswordResetEmailData,
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
      type: 'password_reset',
      data,
      sentAt: new Date(),
    });

    // Mock success
    return {
      success: true,
    };
  }

  async sendVerificationEmail(
    email: string,
    data: EmailVerificationData,
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
      type: 'verification',
      data,
      sentAt: new Date(),
    });

    // Mock success
    return {
      success: true,
    };
  }

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

  // NEW billing email methods
  async sendPaymentSuccessEmail(
    email: string,
    data: PaymentEmailData,
  ): Promise<EmailResult> {
    await new Promise(resolve => setTimeout(resolve, 100));

    if (this.shouldFail) {
      return {
        success: false,
        error: 'Email service failed',
      };
    }

    this.sentEmails.push({
      to: email,
      type: 'payment_success',
      data,
      sentAt: new Date(),
    });

    return { success: true };
  }

  async sendPaymentFailedEmail(
    email: string,
    data: PaymentEmailData,
  ): Promise<EmailResult> {
    await new Promise(resolve => setTimeout(resolve, 100));

    if (this.shouldFail) {
      return {
        success: false,
        error: 'Email service failed',
      };
    }

    this.sentEmails.push({
      to: email,
      type: 'payment_failed',
      data,
      sentAt: new Date(),
    });

    return { success: true };
  }

  async sendSubscriptionChangeEmail(
    email: string,
    data: SubscriptionChangeEmailData,
  ): Promise<EmailResult> {
    await new Promise(resolve => setTimeout(resolve, 100));

    if (this.shouldFail) {
      return {
        success: false,
        error: 'Email service failed',
      };
    }

    this.sentEmails.push({
      to: email,
      type: 'subscription_change',
      data,
      sentAt: new Date(),
    });

    return { success: true };
  }

  async sendMarketingEmail(
    emails: string[],
    data: MarketingEmailData,
  ): Promise<EmailResult> {
    await new Promise(resolve => setTimeout(resolve, 100));

    if (this.shouldFail) {
      return {
        success: false,
        error: 'Email service failed',
      };
    }

    // Store each email separately for testing
    emails.forEach(email => {
      this.sentEmails.push({
        to: email,
        type: 'marketing',
        data,
        sentAt: new Date(),
      });
    });

    return { success: true };
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
