import { NextResponse, type NextRequest } from 'next/server';

import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { users, userEmailPreferences } from '@/lib/db/schema';

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
        id: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user email preferences (defaults to enabled if no record exists)
    const preferences = await db.query.userEmailPreferences.findFirst({
      where: eq(userEmailPreferences.userId, user.id),
    });

    const emailPreferences = {
      marketing: preferences?.marketingEnabled ?? true,
      transactional: true, // Always enabled
    };

    return NextResponse.json({
      emailPreferences,
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
    if (!emailPreferences || typeof emailPreferences.marketing !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid email preferences format' },
        { status: 400 },
      );
    }

    // Find user by Clerk ID
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
      columns: {
        id: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user preferences record exists
    const existingPreferences = await db.query.userEmailPreferences.findFirst({
      where: eq(userEmailPreferences.userId, user.id),
    });

    if (existingPreferences) {
      // Update existing record
      await db
        .update(userEmailPreferences)
        .set({
          marketingEnabled: emailPreferences.marketing,
        })
        .where(eq(userEmailPreferences.userId, user.id));
    } else {
      // Create new record
      await db.insert(userEmailPreferences).values({
        userId: user.id,
        marketingEnabled: emailPreferences.marketing,
      });
    }

    // Return the updated preferences
    const finalPreferences = {
      marketing: emailPreferences.marketing,
      transactional: true, // Always enabled
    };

    return NextResponse.json({
      success: true,
      emailPreferences: finalPreferences,
    });
  } catch (error) {
    console.error('Failed to update email preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
