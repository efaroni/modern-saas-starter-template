import { NextResponse, type NextRequest } from 'next/server';

import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find user by Clerk ID
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
      columns: {
        emailPreferences: true,
        unsubscribeToken: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      emailPreferences: user.emailPreferences || {
        marketing: true,
        productUpdates: true,
        securityAlerts: true,
      },
      unsubscribeToken: user.unsubscribeToken,
    });
  } catch (error) {
    console.error('Failed to fetch email preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { emailPreferences } = await request.json();

    // Validate the email preferences structure
    if (
      !emailPreferences ||
      typeof emailPreferences.marketing !== 'boolean' ||
      typeof emailPreferences.productUpdates !== 'boolean' ||
      typeof emailPreferences.securityAlerts !== 'boolean'
    ) {
      return NextResponse.json(
        { error: 'Invalid email preferences format' },
        { status: 400 },
      );
    }

    // Ensure security alerts are always enabled
    emailPreferences.securityAlerts = true;

    // Update user email preferences
    const result = await db
      .update(users)
      .set({
        emailPreferences,
        updatedAt: new Date(),
      })
      .where(eq(users.clerkId, userId))
      .returning({
        id: users.id,
        emailPreferences: users.emailPreferences,
      });

    if (result.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      emailPreferences: result[0].emailPreferences,
    });
  } catch (error) {
    console.error('Failed to update email preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
