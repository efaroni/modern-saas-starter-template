import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

export enum EmailType {
  MARKETING = 'marketing',
  PRODUCT_UPDATES = 'productUpdates',
  SECURITY_ALERTS = 'securityAlerts',
  TRANSACTIONAL = 'transactional', // Always sent regardless of preferences
}

export interface EmailPreferenceCheck {
  canSend: boolean;
  reason?: string;
  userEmail?: string;
  userName?: string;
  unsubscribeUrl?: string;
}

/**
 * Check if a user can receive emails of a specific type based on their preferences
 */
export async function canSendEmailToUser(
  userEmail: string,
  emailType: EmailType,
): Promise<EmailPreferenceCheck> {
  try {
    // Transactional emails (payment, password reset, etc.) are always sent
    if (emailType === EmailType.TRANSACTIONAL) {
      const user = await db.query.users.findFirst({
        where: eq(users.email, userEmail),
        columns: {
          name: true,
          unsubscribeToken: true,
        },
      });

      return {
        canSend: true,
        userEmail,
        userName: user?.name || null,
        unsubscribeUrl: user?.unsubscribeToken
          ? getUnsubscribeUrl(user.unsubscribeToken)
          : undefined,
      };
    }

    // For other email types, check user preferences
    const user = await db.query.users.findFirst({
      where: eq(users.email, userEmail),
      columns: {
        name: true,
        emailPreferences: true,
        unsubscribeToken: true,
      },
    });

    if (!user) {
      return {
        canSend: false,
        reason: 'User not found in database',
        userEmail,
      };
    }

    // Default preferences if not set
    const preferences = user.emailPreferences || {
      marketing: true,
      productUpdates: true,
      securityAlerts: true,
    };

    let canSend = false;
    let reason = '';

    switch (emailType) {
      case EmailType.MARKETING:
        canSend = preferences.marketing;
        reason = canSend ? '' : 'User has opted out of marketing emails';
        break;
      case EmailType.PRODUCT_UPDATES:
        canSend = preferences.productUpdates;
        reason = canSend ? '' : 'User has opted out of product update emails';
        break;
      case EmailType.SECURITY_ALERTS:
        canSend = preferences.securityAlerts;
        reason = canSend ? '' : 'User has opted out of security alert emails';
        break;
      default:
        canSend = false;
        reason = 'Unknown email type';
    }

    return {
      canSend,
      reason: canSend ? undefined : reason,
      userEmail,
      userName: user.name || null,
      unsubscribeUrl: user.unsubscribeToken
        ? getUnsubscribeUrl(user.unsubscribeToken)
        : undefined,
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
 * Get users who have opted in to a specific email type
 */
export async function getUsersOptedInToEmailType(
  emailType: EmailType,
): Promise<EmailPreferenceCheck[]> {
  try {
    // Transactional emails can be sent to all users
    if (emailType === EmailType.TRANSACTIONAL) {
      const allUsers = await db
        .select({
          email: users.email,
          name: users.name,
          unsubscribeToken: users.unsubscribeToken,
        })
        .from(users);

      return allUsers.map(user => ({
        canSend: true,
        userEmail: user.email,
        userName: user.name || null,
        unsubscribeUrl: user.unsubscribeToken
          ? getUnsubscribeUrl(user.unsubscribeToken)
          : undefined,
      }));
    }

    // For other email types, filter by preferences
    const allUsers = await db
      .select({
        email: users.email,
        name: users.name,
        emailPreferences: users.emailPreferences,
        unsubscribeToken: users.unsubscribeToken,
      })
      .from(users);

    return allUsers
      .filter(user => {
        const preferences = user.emailPreferences || {
          marketing: true,
          productUpdates: true,
          securityAlerts: true,
        };

        switch (emailType) {
          case EmailType.MARKETING:
            return preferences.marketing;
          case EmailType.PRODUCT_UPDATES:
            return preferences.productUpdates;
          case EmailType.SECURITY_ALERTS:
            return preferences.securityAlerts;
          default:
            return false;
        }
      })
      .map(user => ({
        canSend: true,
        userEmail: user.email,
        userName: user.name || null,
        unsubscribeUrl: user.unsubscribeToken
          ? getUnsubscribeUrl(user.unsubscribeToken)
          : undefined,
      }));
  } catch (error) {
    console.error('Error fetching users for email type:', error);
    return [];
  }
}

/**
 * Generate unsubscribe URL from token
 */
function getUnsubscribeUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/unsubscribe?token=${token}`;
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
