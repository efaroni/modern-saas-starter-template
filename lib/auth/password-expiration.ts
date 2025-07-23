import { eq, lt } from 'drizzle-orm';

import { users } from '@/lib/db/schema';
import { db } from '@/lib/db/server';

export interface PasswordExpirationConfig {
  enabled: boolean;
  maxAge: number; // Password max age in days
  warningDays: number; // Days before expiration to warn user
  graceLoginCount: number; // Number of logins allowed after expiration
}

export const DEFAULT_PASSWORD_EXPIRATION_CONFIG: PasswordExpirationConfig = {
  enabled: false, // Disabled by default for better UX
  maxAge: 90, // 90 days
  warningDays: 7, // Warn 7 days before expiration
  graceLoginCount: 3, // Allow 3 logins after expiration
};

export interface PasswordExpirationResult {
  isExpired: boolean;
  isNearExpiration: boolean;
  daysUntilExpiration: number;
  mustChangePassword: boolean;
  graceLoginsRemaining: number;
}

export class PasswordExpirationService {
  private config: PasswordExpirationConfig;
  private readonly database: typeof db;

  constructor(
    database: typeof db = db,
    config: PasswordExpirationConfig = DEFAULT_PASSWORD_EXPIRATION_CONFIG,
  ) {
    this.database = database;
    this.config = config;
  }

  /**
   * Check if password expiration is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Check password expiration status for a user
   */
  async checkPasswordExpiration(
    userId: string,
  ): Promise<PasswordExpirationResult> {
    if (!this.config.enabled) {
      return {
        isExpired: false,
        isNearExpiration: false,
        daysUntilExpiration: 999,
        mustChangePassword: false,
        graceLoginsRemaining: 0,
      };
    }

    try {
      // Get user's password update date
      const [user] = await this.database
        .select({
          id: users.id,
          updatedAt: users.updatedAt,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        throw new Error('User not found');
      }

      // Calculate password age
      const passwordDate = user.updatedAt || user.createdAt;
      const passwordAge = Math.floor(
        (Date.now() - passwordDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      const daysUntilExpiration = this.config.maxAge - passwordAge;

      const isExpired = passwordAge >= this.config.maxAge;
      const isNearExpiration =
        daysUntilExpiration <= this.config.warningDays &&
        daysUntilExpiration > 0;

      // For expired passwords, check grace logins
      let graceLoginsRemaining = 0;
      let mustChangePassword = false;

      if (isExpired) {
        // In a real implementation, you'd track grace logins in the database
        // For now, we'll simulate it
        graceLoginsRemaining = this.config.graceLoginCount;
        mustChangePassword = graceLoginsRemaining <= 0;
      }

      return {
        isExpired,
        isNearExpiration,
        daysUntilExpiration: Math.max(0, daysUntilExpiration),
        mustChangePassword,
        graceLoginsRemaining,
      };
    } catch (error) {
      console.error('Failed to check password expiration:', error);
      // Return safe defaults on error
      return {
        isExpired: false,
        isNearExpiration: false,
        daysUntilExpiration: 999,
        mustChangePassword: false,
        graceLoginsRemaining: 0,
      };
    }
  }

  /**
   * Get users with passwords nearing expiration
   */
  async getUsersWithExpiringPasswords(): Promise<
    Array<{
      id: string;
      email: string;
      name: string | null;
      updatedAt: Date | null;
      createdAt: Date;
    }>
  > {
    if (!this.config.enabled) {
      return [];
    }

    try {
      const warningDate = new Date(
        Date.now() -
          (((this.config.maxAge - this.config.warningDays) * 24 * 60 * 60 * 1000)),
      );

      return await this.database
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          updatedAt: users.updatedAt,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(lt(users.updatedAt, warningDate));
    } catch (error) {
      console.error('Failed to get users with expiring passwords:', error);
      return [];
    }
  }

  /**
   * Get users with expired passwords
   */
  async getUsersWithExpiredPasswords(): Promise<
    Array<{
      id: string;
      email: string;
      name: string | null;
      updatedAt: Date | null;
      createdAt: Date;
    }>
  > {
    if (!this.config.enabled) {
      return [];
    }

    try {
      const expirationDate = new Date(
        Date.now() - (this.config.maxAge * 24 * 60 * 60 * 1000),
      );

      return await this.database
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          updatedAt: users.updatedAt,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(lt(users.updatedAt, expirationDate));
    } catch (error) {
      console.error('Failed to get users with expired passwords:', error);
      return [];
    }
  }

  /**
   * Mark password as updated (called after password change)
   */
  async markPasswordUpdated(userId: string): Promise<void> {
    try {
      await this.database
        .update(users)
        .set({ updatedAt: new Date() })
        .where(eq(users.id, userId));
    } catch (error) {
      console.error('Failed to mark password as updated:', error);
    }
  }

  /**
   * Send password expiration warning (would integrate with email service)
   */
  async sendExpirationWarning(userId: string): Promise<void> {
    try {
      const result = await this.checkPasswordExpiration(userId);

      if (result.isNearExpiration) {
        // In a real implementation, you'd send an email here
        console.warn(
          `Password expiration warning for user ${userId}: ${result.daysUntilExpiration} days remaining`,
        );

        // Example email integration:
        // await emailService.sendPasswordExpirationWarning(userId, result.daysUntilExpiration)
      }
    } catch (error) {
      console.error('Failed to send expiration warning:', error);
    }
  }

  /**
   * Send password expired notification
   */
  async sendExpirationNotification(userId: string): Promise<void> {
    try {
      const result = await this.checkPasswordExpiration(userId);

      if (result.isExpired) {
        // In a real implementation, you'd send an email here
        console.warn(
          `Password expired notification for user ${userId}: ${result.graceLoginsRemaining} grace logins remaining`,
        );

        // Example email integration:
        // await emailService.sendPasswordExpiredNotification(userId, result.graceLoginsRemaining)
      }
    } catch (error) {
      console.error('Failed to send expiration notification:', error);
    }
  }

  /**
   * Get password expiration configuration
   */
  getConfig(): PasswordExpirationConfig {
    return { ...this.config };
  }

  /**
   * Update password expiration configuration
   */
  updateConfig(newConfig: Partial<PasswordExpirationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}
