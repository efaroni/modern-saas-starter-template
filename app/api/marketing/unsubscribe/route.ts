import { type NextRequest, NextResponse } from 'next/server';

import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Missing unsubscribe token' },
      { status: 400 },
    );
  }

  try {
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

    // Update user email preferences to disable marketing emails
    await db
      .update(users)
      .set({
        emailPreferences: {
          marketing: false,
          productUpdates: true, // Keep other preferences as they were
          securityAlerts: true,
        },
      })
      .where(eq(users.id, user.id));

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed from marketing emails',
    });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to unsubscribe' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Missing unsubscribe token' },
        { status: 400 },
      );
    }

    // Same logic as GET but via POST for form submissions
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

    await db
      .update(users)
      .set({
        emailPreferences: {
          marketing: false,
          productUpdates: true,
          securityAlerts: true,
        },
      })
      .where(eq(users.id, user.id));

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed from marketing emails',
    });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to unsubscribe' },
      { status: 500 },
    );
  }
}
