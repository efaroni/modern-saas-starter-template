/**
 * Date and time utility functions for consistent date handling across the application
 */

/**
 * Adds minutes to the current date
 */
export function addMinutes(minutes: number, fromDate: Date = new Date()): Date {
  return new Date(fromDate.getTime() + minutes * 60 * 1000);
}

/**
 * Adds hours to the current date
 */
export function addHours(hours: number, fromDate: Date = new Date()): Date {
  return new Date(fromDate.getTime() + hours * 60 * 60 * 1000);
}

/**
 * Adds days to the current date
 */
export function addDays(days: number, fromDate: Date = new Date()): Date {
  return new Date(fromDate.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Adds seconds to the current date
 */
export function addSeconds(seconds: number, fromDate: Date = new Date()): Date {
  return new Date(fromDate.getTime() + seconds * 1000);
}

/**
 * Checks if a date is expired (in the past)
 */
export function isExpired(date: Date | string | null): boolean {
  if (!date) return true;

  const expirationDate = typeof date === 'string' ? new Date(date) : date;
  return expirationDate.getTime() < Date.now();
}

/**
 * Checks if a date is near expiration (within specified minutes)
 */
export function isNearExpiration(date: Date | string | null, withinMinutes: number = 30): boolean {
  if (!date) return true;

  const expirationDate = typeof date === 'string' ? new Date(date) : date;
  const warningTime = Date.now() + (withinMinutes * 60 * 1000);

  return expirationDate.getTime() <= warningTime;
}

/**
 * Gets the time remaining until expiration in milliseconds
 */
export function getTimeUntilExpiration(date: Date | string | null): number {
  if (!date) return 0;

  const expirationDate = typeof date === 'string' ? new Date(date) : date;
  return Math.max(0, expirationDate.getTime() - Date.now());
}

/**
 * Formats time remaining in a human-readable format
 */
export function formatTimeRemaining(date: Date | string | null): string {
  const remaining = getTimeUntilExpiration(date);

  if (remaining <= 0) return 'Expired';

  const seconds = Math.floor(remaining / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  return `${seconds} second${seconds > 1 ? 's' : ''}`;
}

/**
 * Common expiration time constants
 */
export const EXPIRATION_TIMES = {
  // Short-term (minutes)
  FIFTEEN_MINUTES: 15,
  THIRTY_MINUTES: 30,
  ONE_HOUR: 60,

  // Medium-term (hours)
  THREE_HOURS: 3 * 60,
  SIX_HOURS: 6 * 60,
  TWELVE_HOURS: 12 * 60,
  TWENTY_FOUR_HOURS: 24 * 60,

  // Long-term (days in minutes)
  ONE_DAY: 24 * 60,
  ONE_WEEK: 7 * 24 * 60,
  ONE_MONTH: 30 * 24 * 60,
  THREE_MONTHS: 90 * 24 * 60,
} as const;

/**
 * Creates expiration dates for common use cases
 */
export const createExpirationDate = {
  /**
   * For email verification tokens (24 hours)
   */
  emailVerification: (): Date => addMinutes(EXPIRATION_TIMES.TWENTY_FOUR_HOURS),

  /**
   * For password reset tokens (1 hour)
   */
  passwordReset: (): Date => addMinutes(EXPIRATION_TIMES.ONE_HOUR),

  /**
   * For auth sessions (configurable, default 24 hours)
   */
  authSession: (durationMinutes: number = EXPIRATION_TIMES.TWENTY_FOUR_HOURS): Date =>
    addMinutes(durationMinutes),

  /**
   * For rate limiting windows (15 minutes)
   */
  rateLimitWindow: (): Date => addMinutes(EXPIRATION_TIMES.FIFTEEN_MINUTES),

  /**
   * For API tokens (configurable, default 3 months)
   */
  apiToken: (durationMinutes: number = EXPIRATION_TIMES.THREE_MONTHS): Date =>
    addMinutes(durationMinutes),

  /**
   * For custom expiration times
   */
  custom: (minutes: number): Date => addMinutes(minutes),
};

/**
 * Validates that a date is in the future
 */
export function validateFutureDate(date: Date | string): boolean {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  return targetDate.getTime() > Date.now();
}

/**
 * Gets the start of the current day
 */
export function getStartOfDay(date: Date = new Date()): Date {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  return startOfDay;
}

/**
 * Gets the end of the current day
 */
export function getEndOfDay(date: Date = new Date()): Date {
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay;
}

/**
 * Gets a date N days ago
 */
export function getDaysAgo(days: number): Date {
  return addDays(-days);
}

/**
 * Performance timing utilities
 */
export const performance = {
  /**
   * Creates a timestamp for performance monitoring
   */
  now: (): number => Date.now(),

  /**
   * Calculates duration from start time
   */
  duration: (startTime: number): number => Date.now() - startTime,

  /**
   * Creates a performance timer
   */
  timer: () => {
    const startTime = Date.now();
    return {
      elapsed: () => Date.now() - startTime,
      stop: () => Date.now() - startTime,
    };
  },
};