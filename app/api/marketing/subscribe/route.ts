import { type NextRequest, NextResponse } from 'next/server';

import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Missing unsubscribe token' },
        { status: 400 },
      );
    }

    // Find user by unsubscribe token
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.unsubscribeToken, token))
      .limit(1);

    if (userResult.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid unsubscribe token' },
        { status: 400 },
      );
    }
    const user = userResult[0];

    // Update user email preferences to enable marketing emails
    await db
      .update(users)
      .set({
        emailPreferences: {
          ...user.emailPreferences,
          marketing: true,
        },
      })
      .where(eq(users.id, user.id));

    return NextResponse.json({
      success: true,
      message: 'Successfully re-subscribed to marketing emails',
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to subscribe' },
      { status: 500 },
    );
  }
}
