import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { users, userEmailPreferences } from '@/lib/db/schema';

export enum EmailType {
  MARKETING = 'marketing', // Can unsubscribe
  TRANSACTIONAL = 'transactional', // Cannot unsubscribe - always sent
}

export interface EmailPreferenceCheck {
  canSend: boolean;
  reason?: string;
  userEmail?: string;
  userName?: string;
  userId?: string; // Added for token generation
}

/**
 * Check if a user can receive emails of a specific type based on their preferences
 */
export async function canSendEmailToUser(
  userEmail: string,
  emailType: EmailType,
): Promise<EmailPreferenceCheck> {
  try {
    // Transactional emails are always sent regardless of preferences
    if (emailType === EmailType.TRANSACTIONAL) {
      const user = await db.query.users.findFirst({
        where: eq(users.email, userEmail),
        columns: {
          id: true,
          name: true,
        },
      });

      return {
        canSend: true,
        userEmail,
        userName: user?.name || null,
        userId: user?.id,
      };
    }

    // For marketing emails, check user preferences
    const user = await db.query.users.findFirst({
      where: eq(users.email, userEmail),
      columns: {
        id: true,
        name: true,
      },
    });

    if (!user) {
      return {
        canSend: false,
        reason: 'User not found in database',
        userEmail,
      };
    }

    // Get user preferences (defaults to enabled if no record exists)
    const preferences = await db.query.userEmailPreferences.findFirst({
      where: eq(userEmailPreferences.userId, user.id),
    });

    // Default to enabled if no preferences record exists
    const marketingEnabled = preferences?.marketingEnabled ?? true;

    let canSend = false;
    let reason = '';

    if (emailType === EmailType.MARKETING) {
      canSend = marketingEnabled;
      reason = canSend ? '' : 'User has opted out of marketing emails';
    } else {
      canSend = false;
      reason = 'Unknown email type';
    }

    return {
      canSend,
      reason: canSend ? undefined : reason,
      userEmail,
      userName: user.name || null,
      userId: user.id,
    };
  } catch (error) {
    console.error('Error checking email preferences:', error);
    return {
      canSend: false,
      reason: 'Database error occurred',
      userEmail,
    };
  }
}

/**
 * Check if multiple users can receive emails of a specific type
 * Returns only users who have opted in
 */
export async function filterUsersForEmail(
  userEmails: string[],
  emailType: EmailType,
): Promise<EmailPreferenceCheck[]> {
  const results = await Promise.all(
    userEmails.map(email => canSendEmailToUser(email, emailType)),
  );

  return results.filter(result => result.canSend);
}

/**
 * Log email preference checks for debugging
 */
export function logEmailPreferenceCheck(
  result: EmailPreferenceCheck,
  emailType: EmailType,
): void {
  if (process.env.EMAIL_DEBUG === 'true') {
    console.warn('Email preference check:', {
      emailType,
      userEmail: result.userEmail,
      canSend: result.canSend,
      reason: result.reason,
    });
  }
}
