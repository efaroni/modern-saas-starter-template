export interface EmailResult {
  success: boolean
  error?: string
}

export interface PasswordResetEmailData {
  resetToken: string
  resetUrl: string
  user: {
    email: string
    name?: string | null
  }
}

export interface EmailVerificationData {
  verificationToken: string
  verificationUrl: string
  user: {
    email: string
    name?: string | null
  }
}

export interface WelcomeEmailData {
  user: {
    email: string
    name?: string | null
  }
  dashboardUrl: string
}

export interface EmailService {
  sendPasswordResetEmail(email: string, data: PasswordResetEmailData): Promise<EmailResult>
  sendVerificationEmail(email: string, data: EmailVerificationData): Promise<EmailResult>
  sendWelcomeEmail(email: string, data: WelcomeEmailData): Promise<EmailResult>
}