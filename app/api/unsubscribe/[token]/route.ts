import { type NextRequest, NextResponse } from 'next/server';

import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  emailUnsubscribeTokens,
  userEmailPreferences,
  users,
} from '@/lib/db/schema';

interface RouteContext {
  params: {
    token: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { token } = params;

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Missing unsubscribe token' },
      { status: 400 },
    );
  }

  try {
    // Find token in database
    const tokenRecord = await db.query.emailUnsubscribeTokens.findFirst({
      where: eq(emailUnsubscribeTokens.token, token),
    });

    if (!tokenRecord) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired unsubscribe token' },
        { status: 400 },
      );
    }

    // Update user preferences based on category
    await updateUserPreferences(tokenRecord.userId, tokenRecord.category);

    // Delete the token (one-time use)
    await db
      .delete(emailUnsubscribeTokens)
      .where(eq(emailUnsubscribeTokens.token, token));

    const categoryName = getCategoryDisplayName(tokenRecord.category);

    return NextResponse.json({
      success: true,
      message: `Successfully unsubscribed from ${categoryName} emails`,
      category: tokenRecord.category,
    });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process unsubscribe request' },
      { status: 500 },
    );
  }
}

export function POST(request: NextRequest, { params }: RouteContext) {
  // Same logic as GET for form submissions
  return GET(request, { params });
}

async function updateUserPreferences(userId: string, category: string | null) {
  // Verify user exists
  const userExists = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true },
  });

  if (!userExists) {
    throw new Error(`User not found for userId: ${userId}`);
  }

  // Get existing preferences or create with defaults
  const existing = await db.query.userEmailPreferences.findFirst({
    where: eq(userEmailPreferences.userId, userId),
  });

  const updates: Record<string, boolean> = {};

  // Update based on category
  switch (category) {
    case 'marketing':
      updates.marketingEnabled = false;
      break;
    case null:
    case 'global':
      // Global unsubscribe - disable all marketing preferences
      updates.marketingEnabled = false;
      break;
    default:
      throw new Error(`Unknown category: ${category}`);
  }

  if (existing) {
    // Update existing record
    await db
      .update(userEmailPreferences)
      .set(updates)
      .where(eq(userEmailPreferences.userId, userId));
  } else {
    // Create new record with defaults + updates
    await db.insert(userEmailPreferences).values({
      userId,
      marketingEnabled: updates.marketingEnabled ?? true,
    });
  }
}

function getCategoryDisplayName(category: string | null): string {
  switch (category) {
    case 'marketing':
      return 'marketing';
    case null:
    case 'global':
      return 'all marketing';
    default:
      return 'email';
  }
}
