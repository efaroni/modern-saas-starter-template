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

export interface EmailService {
  sendPasswordResetEmail(email: string, data: PasswordResetEmailData): Promise<EmailResult>
}