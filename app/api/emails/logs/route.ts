import { NextResponse } from 'next/server';

import { desc } from 'drizzle-orm';

import { db } from '@/lib/db';
import { emailLogs } from '@/lib/db/schema';

export async function GET() {
  try {
    const logs = await db.query.emailLogs.findMany({
      orderBy: [desc(emailLogs.sentAt)],
      limit: 50,
    });

    return NextResponse.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error('Failed to fetch email logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch email logs' },
      { status: 500 },
    );
  }
}
