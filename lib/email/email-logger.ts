import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { emailLogs } from '@/lib/db/schema';

import type { EmailLogParams } from './types';

export class EmailLogger {
  private db: typeof db;

  constructor(database = db) {
    this.db = database;
  }

  async logEmail(
    params: EmailLogParams,
    status: 'sent' | 'failed',
    resendId?: string,
    eventId?: string,
  ): Promise<void> {
    try {
      await this.db.insert(emailLogs).values({
        toEmail: params.toEmail,
        templateType: params.templateType,
        status,
        resendId,
        eventId,
        metadata: params.metadata || {},
      });
    } catch {
      // Silently fail - email logging is not critical
    }
  }

  async checkIdempotency(eventId: string): Promise<boolean> {
    if (!eventId) return false;

    try {
      const existingLog = await this.db.query.emailLogs.findFirst({
        where: eq(emailLogs.eventId, eventId),
      });

      return !!existingLog;
    } catch {
      return false;
    }
  }
}

export const emailLogger = new EmailLogger();
