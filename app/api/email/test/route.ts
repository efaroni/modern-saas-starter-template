import { NextResponse, type NextRequest } from 'next/server';

import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { canSendEmailToUser, EmailType } from '@/lib/email/preferences';
import { emailService } from '@/lib/email/service';

const testEmailSchema = z.object({
  email: z.string().email('Invalid email format'),
  emailType: z
    .enum(['marketing', 'transactional'])
    .optional()
    .default('marketing'),
});

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user ID from database
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
      columns: {
        id: true,
      },
    });

    const body = await request.json();
    const { email, emailType } = testEmailSchema.parse(body);

    // Check email preferences for marketing emails
    if (emailType === 'marketing') {
      const emailTypeEnum =
        emailType === 'marketing'
          ? EmailType.MARKETING
          : EmailType.TRANSACTIONAL;
      const canSend = await canSendEmailToUser(email, emailTypeEnum);

      if (!canSend.canSend) {
        return NextResponse.json(
          {
            error:
              canSend.reason ||
              'Cannot send marketing email - marketing emails are disabled',
          },
          { status: 400 },
        );
      }
    }

    // Convert string emailType to EmailType enum
    const emailTypeEnum =
      emailType === 'marketing' ? EmailType.MARKETING : EmailType.TRANSACTIONAL;

    // Send test email with user ID for unsubscribe token generation
    const result = await emailService.sendTestEmail(
      email,
      user?.id,
      emailTypeEnum,
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send test email' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test ${emailType} email sent to ${email}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 },
      );
    }

    console.error('Test email API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
