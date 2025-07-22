import { MockEmailService } from './mock';
import { ResendEmailService } from './resend';
import { type EmailService } from './types';

function createEmailService(): EmailService {
  // Use mock service in test environment
  if (process.env.NODE_ENV === 'test') {
    return new MockEmailService();
  }

  // Use Resend service in production
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || 'noreply@localhost';
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  if (!apiKey) {
    console.warn('RESEND_API_KEY not found, using mock email service');
    return new MockEmailService();
  }

  return new ResendEmailService(apiKey, from, baseUrl);
}

export const emailService = createEmailService();