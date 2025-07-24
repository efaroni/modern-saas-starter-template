import { type NextRequest, NextResponse } from 'next/server';

import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { emailPreferences } from '@/lib/db/schema';

const updatePreferencesSchema = z.object({
  marketingEmails: z.boolean(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    let preferences = await db.query.emailPreferences.findFirst({
      where: eq(emailPreferences.userId, session.user.id),
    });

    // Create default preferences if none exist
    if (!preferences) {
      const [newPreferences] = await db
        .insert(emailPreferences)
        .values({
          userId: session.user.id,
          marketingEmails: true,
        })
        .returning();

      preferences = newPreferences;
    }

    return NextResponse.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    console.error('Failed to fetch email preferences:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch preferences' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { marketingEmails } = updatePreferencesSchema.parse(body);

    // Update or create preferences
    const [updatedPreferences] = await db
      .insert(emailPreferences)
      .values({
        userId: session.user.id,
        marketingEmails,
      })
      .onConflictDoUpdate({
        target: emailPreferences.userId,
        set: {
          marketingEmails,
          updatedAt: new Date(),
        },
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: updatedPreferences,
    });
  } catch (error) {
    console.error('Failed to update email preferences:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update preferences' },
      { status: 500 },
    );
  }
}
