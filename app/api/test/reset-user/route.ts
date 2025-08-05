import { NextResponse } from 'next/server';

import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    // Get user info
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
      columns: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 },
      );
    }

    // Clear billing customer ID for retesting
    await db
      .update(users)
      .set({
        billingCustomerId: null,
      })
      .where(eq(users.id, user.id));

    return NextResponse.json({
      success: true,
      message: 'User billing data reset successfully',
      data: {
        email: user.email,
        resetAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error resetting user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset user' },
      { status: 500 },
    );
  }
}
