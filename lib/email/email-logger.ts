import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { emailLogs, type NewEmailLog } from '@/lib/db/schema';

export type EmailTemplateType =
  | 'welcome'
  | 'verification'
  | 'password_reset'
  | 'subscription_confirmation'
  | 'subscription_ending';

export interface LogEmailParams {
  toEmail: string;
  templateType: EmailTemplateType;
  resendId?: string;
  eventId?: string;
  metadata?: Record<string, unknown>;
}

export class EmailLogger {
  async logEmail(
    params: LogEmailParams,
    status: 'sent' | 'failed',
  ): Promise<void> {
    try {
      const emailLog: NewEmailLog = {
        toEmail: params.toEmail,
        templateType: params.templateType,
        status,
        resendId: params.resendId || null,
        eventId: params.eventId || null,
        metadata: params.metadata || {},
      };

      await db.insert(emailLogs).values(emailLog);
    } catch (error) {
      console.error('Failed to log email:', error);
    }
  }

  async checkIdempotency(eventId: string): Promise<boolean> {
    if (!eventId) return false;

    try {
      const existing = await db.query.emailLogs.findFirst({
        where: eq(emailLogs.eventId, eventId),
      });

      return !!existing;
    } catch (error) {
      console.error('Failed to check email idempotency:', error);
      return false;
    }
  }
}

export const emailLogger = new EmailLogger();
