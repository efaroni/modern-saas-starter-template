import { Page, expect } from '@playwright/test';
import { testDb } from '@/lib/db/test';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Common test configuration and utilities
 */

export const TEST_TIMEOUTS = {
  // Standard timeouts for different operations
  FAST: 3000, // Quick operations like button clicks
  STANDARD: 10000, // Standard operations like form loading
  AUTH: 15000, // Authentication operations
  WEBHOOK: 5000, // Webhook sync operations
  COMPLETE_FLOW: 60000, // Complete test flows
} as const;

export const COMMON_ROUTES = {
  HOME: '/',
  SIGN_IN: '/sign-in',
  SIGN_UP: '/sign-up',
  CONFIGURATION: '/configuration',
  DASHBOARD: '/dashboard',
} as const;

/**
 * Enhanced test user interface with optional metadata
 */
export interface TestUserData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  clerkId?: string;
  dbId?: string;
}

/**
 * Database operation utilities
 */
export class DatabaseUtils {
  /**
   * Find user in database by email
   */
  static async findUserByEmail(email: string) {
    return await testDb.query.users.findFirst({
      where: eq(users.email, email),
    });
  }

  /**
   * Find user in database by Clerk ID
   */
  static async findUserByClerkId(clerkId: string) {
    return await testDb.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });
  }

  /**
   * Clean up user by email with error handling
   */
  static async cleanupUserByEmail(email: string): Promise<boolean> {
    try {
      const result = await testDb.delete(users).where(eq(users.email, email));
      console.log(`🧹 Cleaned up test user: ${email}`);
      return true;
    } catch (error) {
      console.warn(`Failed to clean up test user ${email}:`, error);
      return false;
    }
  }

  /**
   * Clean up multiple users by email list
   */
  static async cleanupMultipleUsers(emails: string[]): Promise<number> {
    let cleanedCount = 0;
    for (const email of emails) {
      const success = await this.cleanupUserByEmail(email);
      if (success) cleanedCount++;
    }
    return cleanedCount;
  }

  /**
   * Verify user exists in database with expected properties
   */
  static async verifyUserInDatabase(email: string): Promise<{
    exists: boolean;
    user?: any;
    hasClerkId: boolean;
  }> {
    const user = await this.findUserByEmail(email);
    return {
      exists: !!user,
      user,
      hasClerkId: !!user?.clerkId,
    };
  }

  /**
   * Wait for database sync with polling
   */
  static async waitForDatabaseSync(
    email: string,
    maxAttempts: number = 10,
    intervalMs: number = 500,
  ): Promise<{ synced: boolean; user?: any; attempts: number }> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;
      const result = await this.verifyUserInDatabase(email);

      if (result.exists && result.hasClerkId) {
        console.log(
          `✅ User synced to DB after ${attempts} attempts - Clerk ID: ${result.user.clerkId}`,
        );
        return { synced: true, user: result.user, attempts };
      }

      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }

    console.log(`⚠️ User sync timeout after ${attempts} attempts`);
    return { synced: false, attempts };
  }
}

/**
 * Navigation and route utilities
 */
export class NavigationUtils {
  /**
   * Navigate to route and verify successful navigation
   */
  static async navigateAndVerify(page: Page, route: string): Promise<void> {
    await page.goto(route);
    await expect(page).toHaveURL(new RegExp(route.replace('/', '') || '/'));
  }

  /**
   * Verify user is redirected to sign-in (unauthenticated)
   */
  static async verifyUnauthenticatedRedirect(
    page: Page,
    protectedRoute: string,
  ): Promise<void> {
    await page.goto(protectedRoute);
    await expect(page).toHaveURL(/sign-in/);
  }

  /**
   * Verify user can access protected route (authenticated)
   */
  static async verifyAuthenticatedAccess(
    page: Page,
    protectedRoute: string,
  ): Promise<void> {
    await page.goto(protectedRoute);
    await expect(page).not.toHaveURL(/sign-in/);
    await expect(page).toHaveURL(new RegExp(protectedRoute.replace('/', '')));
  }

  /**
   * Wait for navigation to complete with timeout
   */
  static async waitForNavigation(
    page: Page,
    expectedUrl?: RegExp,
    timeout = TEST_TIMEOUTS.STANDARD,
  ): Promise<void> {
    if (expectedUrl) {
      await page.waitForURL(expectedUrl, { timeout });
    } else {
      await page.waitForLoadState('networkidle', { timeout });
    }
  }
}

/**
 * Error handling and logging utilities
 */
export class TestLogger {
  /**
   * Log test step with emoji and formatting
   */
  static logStep(
    step: string,
    status: 'start' | 'success' | 'warning' | 'error' = 'start',
  ): void {
    const symbols = {
      start: '🧪',
      success: '✅',
      warning: '⚠️',
      error: '❌',
    };

    console.log(`${symbols[status]} ${step}`);
  }

  /**
   * Log authentication event
   */
  static logAuth(event: string, email?: string): void {
    const message = email ? `${event}: ${email}` : event;
    this.logStep(message, 'start');
  }

  /**
   * Log database operation
   */
  static logDatabase(operation: string, result?: any): void {
    const message = result
      ? `${operation}: ${JSON.stringify(result)}`
      : operation;
    this.logStep(message, result ? 'success' : 'start');
  }

  /**
   * Log test cleanup
   */
  static logCleanup(resource: string, success: boolean): void {
    this.logStep(`Cleanup ${resource}`, success ? 'success' : 'error');
  }
}

/**
 * Assertion utilities for common test scenarios
 */
export class TestAssertions {
  /**
   * Assert page content is visible
   */
  static async assertContentVisible(
    page: Page,
    selector: string,
    timeout = TEST_TIMEOUTS.STANDARD,
  ): Promise<void> {
    await expect(page.locator(selector)).toBeVisible({ timeout });
  }

  /**
   * Assert user authentication state
   */
  static async assertAuthenticationState(
    page: Page,
    isAuthenticated: boolean,
    protectedRoute = COMMON_ROUTES.CONFIGURATION,
  ): Promise<void> {
    if (isAuthenticated) {
      await NavigationUtils.verifyAuthenticatedAccess(page, protectedRoute);
      TestLogger.logStep(
        'Authentication state verified: authenticated',
        'success',
      );
    } else {
      await NavigationUtils.verifyUnauthenticatedRedirect(page, protectedRoute);
      TestLogger.logStep(
        'Authentication state verified: unauthenticated',
        'success',
      );
    }
  }

  /**
   * Assert database sync for user
   */
  static async assertDatabaseSync(
    email: string,
    shouldExist = true,
  ): Promise<void> {
    const result = await DatabaseUtils.verifyUserInDatabase(email);

    if (shouldExist) {
      expect(result.exists).toBe(true);
      expect(result.hasClerkId).toBe(true);
      TestLogger.logStep(`Database sync verified for ${email}`, 'success');
    } else {
      expect(result.exists).toBe(false);
      TestLogger.logStep(`Database deletion verified for ${email}`, 'success');
    }
  }
}

/**
 * Test data management utilities
 */
export class TestDataUtils {
  private static testEmails: string[] = [];

  /**
   * Register test email for cleanup
   */
  static registerTestEmail(email: string): void {
    if (!this.testEmails.includes(email)) {
      this.testEmails.push(email);
    }
  }

  /**
   * Get all registered test emails
   */
  static getRegisteredEmails(): string[] {
    return [...this.testEmails];
  }

  /**
   * Clean up all registered test data
   */
  static async cleanupAllTestData(): Promise<number> {
    const cleanedCount = await DatabaseUtils.cleanupMultipleUsers(
      this.testEmails,
    );
    this.testEmails = []; // Clear registry after cleanup
    TestLogger.logStep(`Cleaned up ${cleanedCount} test users`, 'success');
    return cleanedCount;
  }

  /**
   * Clear test data registry without cleanup
   */
  static clearRegistry(): void {
    this.testEmails = [];
  }
}

/**
 * Retry utilities for flaky operations
 */
export class RetryUtils {
  /**
   * Retry operation with exponential backoff
   */
  static async retry<T>(
    operation: () => Promise<T>,
    maxAttempts = 3,
    baseDelayMs = 1000,
    operationName = 'operation',
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        TestLogger.logStep(
          `${operationName} attempt ${attempt}/${maxAttempts}`,
          'start',
        );
        const result = await operation();
        TestLogger.logStep(
          `${operationName} succeeded on attempt ${attempt}`,
          'success',
        );
        return result;
      } catch (error) {
        lastError = error as Error;
        TestLogger.logStep(
          `${operationName} failed on attempt ${attempt}: ${lastError.message}`,
          'warning',
        );

        if (attempt < maxAttempts) {
          const delay = baseDelayMs * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    TestLogger.logStep(
      `${operationName} failed after ${maxAttempts} attempts`,
      'error',
    );
    throw (
      lastError || new Error(`Operation failed after ${maxAttempts} attempts`)
    );
  }
}
