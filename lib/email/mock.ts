import { EmailService, EmailResult, PasswordResetEmailData } from './types'

export class MockEmailService implements EmailService {
  private sentEmails: Array<{
    to: string
    data: PasswordResetEmailData
    sentAt: Date
  }> = []
  private shouldFail = false

  async sendPasswordResetEmail(email: string, data: PasswordResetEmailData): Promise<EmailResult> {
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 100))

    // Check if we should fail
    if (this.shouldFail) {
      return {
        success: false,
        error: 'Email service failed'
      }
    }

    // Store the email for testing purposes
    this.sentEmails.push({
      to: email,
      data,
      sentAt: new Date()
    })

    // Mock success
    return {
      success: true
    }
  }

  // Helper methods for testing
  getSentEmails() {
    return [...this.sentEmails]
  }

  getLastSentEmail() {
    return this.sentEmails[this.sentEmails.length - 1]
  }

  clearSentEmails() {
    this.sentEmails = []
  }

  setShouldFail(shouldFail: boolean) {
    this.shouldFail = shouldFail
  }
}