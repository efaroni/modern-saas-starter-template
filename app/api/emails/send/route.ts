import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { emailService } from '@/lib/email/service';

const sendEmailSchema = z.object({
  email: z.string().email(),
  templateType: z.enum([
    'welcome',
    'verification',
    'password_reset',
    'subscription_confirmation',
    'subscription_ending',
  ]),
});

export async function POST(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { success: false, error: 'Test emails only available in development' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { email, templateType } = sendEmailSchema.parse(body);

    let result;

    switch (templateType) {
      case 'welcome':
        result = await emailService.sendWelcomeEmail(email, {
          user: { email, name: 'Test User' },
          dashboardUrl: 'http://localhost:3000/dashboard',
        });
        break;

      case 'verification':
        result = await emailService.sendVerificationEmail(email, {
          verificationToken: 'test-token-123',
          verificationUrl:
            'http://localhost:3000/auth/verify?token=test-token-123',
          user: { email, name: 'Test User' },
        });
        break;

      case 'password_reset':
        result = await emailService.sendPasswordResetEmail(email, {
          resetToken: 'reset-token-123',
          resetUrl:
            'http://localhost:3000/auth/reset-password?token=reset-token-123',
          user: { email, name: 'Test User' },
        });
        break;

      case 'subscription_confirmation':
        result = await emailService.sendSubscriptionConfirmationEmail(email, {
          user: { email, name: 'Test User' },
          planName: 'Pro Plan',
          dashboardUrl: 'http://localhost:3000/dashboard',
        });
        break;

      case 'subscription_ending':
        result = await emailService.sendSubscriptionEndingEmail(email, {
          user: { email, name: 'Test User' },
          planName: 'Pro Plan',
          reason: 'cancelled',
          dashboardUrl: 'http://localhost:3000/dashboard',
        });
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid template type' },
          { status: 400 },
        );
    }

    return NextResponse.json({ success: result.success, error: result.error });
  } catch (error) {
    console.error('Failed to send test email:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send email' },
      { status: 500 },
    );
  }
}
