import { createHash } from 'crypto';

import { type NextRequest, NextResponse } from 'next/server';

import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/lib/db';
import { emailPreferences, users } from '@/lib/db/schema';

const unsubscribeSchema = z.object({
  email: z.string().email(),
  token: z.string(),
});

// Generate a simple token for unsubscribe links
function generateUnsubscribeToken(email: string): string {
  const secret = process.env.AUTH_SECRET || 'default-secret';
  return createHash('sha256')
    .update(email + secret)
    .digest('hex')
    .substring(0, 32);
}

function verifyUnsubscribeToken(email: string, token: string): boolean {
  return generateUnsubscribeToken(email) === token;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, token } = unsubscribeSchema.parse(body);

    // Verify the unsubscribe token
    if (!verifyUnsubscribeToken(email, token)) {
      return NextResponse.json(
        { success: false, error: 'Invalid unsubscribe token' },
        { status: 400 },
      );
    }

    // Find the user
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 },
      );
    }

    // Update or create email preferences to disable marketing emails
    await db
      .insert(emailPreferences)
      .values({
        userId: user.id,
        marketingEmails: false,
      })
      .onConflictDoUpdate({
        target: emailPreferences.userId,
        set: {
          marketingEmails: false,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed from marketing emails',
    });
  } catch (error) {
    console.error('Failed to unsubscribe:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to unsubscribe' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const token = searchParams.get('token');

    if (!email || !token) {
      return new Response(
        `<html><body><h1>Invalid unsubscribe link</h1><p>Missing email or token parameter.</p></body></html>`,
        { headers: { 'Content-Type': 'text/html' } },
      );
    }

    // Verify the unsubscribe token
    if (!verifyUnsubscribeToken(email, token)) {
      return new Response(
        `<html><body><h1>Invalid unsubscribe link</h1><p>The unsubscribe token is invalid.</p></body></html>`,
        { headers: { 'Content-Type': 'text/html' } },
      );
    }

    // Find the user
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      return new Response(
        `<html><body><h1>User not found</h1><p>No account found for this email address.</p></body></html>`,
        { headers: { 'Content-Type': 'text/html' } },
      );
    }

    // Update or create email preferences to disable marketing emails
    await db
      .insert(emailPreferences)
      .values({
        userId: user.id,
        marketingEmails: false,
      })
      .onConflictDoUpdate({
        target: emailPreferences.userId,
        set: {
          marketingEmails: false,
          updatedAt: new Date(),
        },
      });

    return new Response(
      `<html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px;">
          <h1 style="color: #333;">Unsubscribed Successfully</h1>
          <p style="color: #666; font-size: 16px;">
            You have been successfully unsubscribed from marketing emails for <strong>${email}</strong>.
          </p>
          <p style="color: #666; font-size: 16px;">
            You will continue to receive important transactional emails (like password resets and account notifications).
          </p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            You can update your email preferences anytime from your account settings.
          </p>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' } },
    );
  } catch (error) {
    console.error('Failed to process unsubscribe:', error);
    return new Response(
      `<html><body><h1>Error</h1><p>An error occurred while processing your unsubscribe request.</p></body></html>`,
      { headers: { 'Content-Type': 'text/html' } },
    );
  }
}

// Export the token generation function for use in email templates
export { generateUnsubscribeToken };
