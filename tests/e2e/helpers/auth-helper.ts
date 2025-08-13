import { Page, expect } from '@playwright/test';
import { setupClerkTestingToken } from '@clerk/testing/playwright';
import { testDb } from '@/lib/db/test';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Test constants
export const CLERK_TEST_CODE = '424242'; // Fixed verification code for +clerk_test emails

export interface TestUser {
  email: string;
  password: string;
}

export interface SignUpOptions {
  user: TestUser;
  page: Page;
  skipVerification?: boolean;
}

export interface SignInOptions {
  user: TestUser;
  page: Page;
}

/**
 * Generates a unique test user with credentials
 */
export function generateTestUser(): TestUser {
  const timestamp = Date.now();
  return {
    email: `e2e-${timestamp}+clerk_test@example.com`,
    password: `E2E-${timestamp}-X9z!Qm@4kP#7nR$2wL`,
  };
}

/**
 * Complete sign-up flow with Clerk including email verification
 */
export async function signUpUser({
  user,
  page,
  skipVerification = false,
}: SignUpOptions): Promise<void> {
  // Setup Clerk testing token
  await setupClerkTestingToken({ page });

  // Navigate to sign-up page
  await page.goto('/sign-up');

  // Wait for sign-up form to load
  await page.waitForSelector('input[name="emailAddress"]', { timeout: 10000 });

  // Fill email
  await page.fill('input[name="emailAddress"]', user.email);

  // Click Continue button (not Google sign-in)
  const continueButton = page.locator(
    'button[data-localization-key="formButtonPrimary"]:has-text("Continue")',
  );
  await expect(continueButton).toBeVisible({ timeout: 5000 });
  await continueButton.click();

  // Wait for password field
  await page.waitForSelector('input[name="password"]:not([disabled])', {
    timeout: 15000,
  });

  // Fill password
  await page.fill('input[name="password"]', user.password);

  // Click Continue to submit
  await page.click(
    'button[data-localization-key="formButtonPrimary"]:has-text("Continue")',
  );

  // Handle verification if not skipped
  if (!skipVerification) {
    await handleVerification(page);
  }

  // Wait for sign-up to complete
  await page.waitForTimeout(3000);
}

/**
 * Sign in user with existing credentials
 */
export async function signInUser({ user, page }: SignInOptions): Promise<void> {
  // Setup Clerk testing token
  await setupClerkTestingToken({ page });

  // Navigate to sign-in page if not already there
  if (!page.url().includes('sign-in')) {
    await page.goto('/sign-in');
  }

  // Wait for sign-in form
  await page.waitForSelector('input[name="identifier"]', { timeout: 10000 });

  // Enter email
  await page.fill('input[name="identifier"]', user.email);

  // Click Continue button
  const continueButton = page.locator(
    'button[data-localization-key="formButtonPrimary"]:has-text("Continue")',
  );
  await expect(continueButton).toBeVisible({ timeout: 5000 });
  await continueButton.click();

  // Wait for password field
  await page.waitForSelector('input[name="password"]:not([disabled])', {
    timeout: 15000,
  });

  // Enter password
  await page.fill('input[name="password"]', user.password);

  // Click Continue to submit
  await page.click(
    'button[data-localization-key="formButtonPrimary"]:has-text("Continue")',
  );

  // Handle potential verification
  const needsVerification = await page
    .waitForURL(/verify/, { timeout: 3000 })
    .then(() => true)
    .catch(() => false);

  if (needsVerification) {
    await handleVerification(page);
  }

  // Wait for sign-in to complete
  await page.waitForTimeout(2000);
}

/**
 * Sign out current user
 */
export async function signOutUser(page: Page): Promise<void> {
  // Click user button
  await page.click('.cl-userButtonTrigger');
  await page.waitForSelector('.cl-userButtonPopoverCard');

  // Click sign out
  await page.click('button:has-text("Sign out")');
  await page.waitForTimeout(2000);
}

/**
 * Handle OTP verification for +clerk_test emails
 */
export async function handleVerification(page: Page): Promise<void> {
  const isOnVerifyPage = await page
    .waitForURL(/verify/, { timeout: 5000 })
    .then(() => true)
    .catch(() => false);

  if (isOnVerifyPage) {
    // Wait for Clerk to be ready to accept verification code
    await page.waitForTimeout(1000);

    // Fill verification code
    const otpInputs = await page.locator('input[maxlength="1"]').all();
    if (otpInputs.length === 6) {
      for (let i = 0; i < 6; i++) {
        await otpInputs[i].fill(CLERK_TEST_CODE[i]);
        await page.waitForTimeout(100); // Small delay between each digit
      }
    }
    await page.waitForTimeout(2000); // Wait for auto-submit
  }
}

/**
 * Wait for webhook to sync user to database and verify sync
 */
export async function waitForDatabaseSync(
  userEmail: string,
): Promise<{ synced: boolean; user?: any }> {
  console.log('Waiting for webhook to sync user to database...');

  // Wait for potential webhook sync
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Check database for user
  const dbUser = await testDb.query.users.findFirst({
    where: eq(users.email, userEmail),
  });

  if (dbUser) {
    console.log(
      `✅ User synced to DB - ID: ${dbUser.id}, Clerk ID: ${dbUser.clerkId}`,
    );
    return { synced: true, user: dbUser };
  } else {
    console.log(
      '⚠️ User not in DB yet (webhook may be pending or not configured)',
    );
    return { synced: false };
  }
}

/**
 * Verify user is authenticated by accessing protected route
 */
export async function verifyAuthentication(
  page: Page,
  protectedRoute = '/configuration',
): Promise<void> {
  await page.goto(protectedRoute);
  await expect(page).not.toHaveURL(/sign-in/);
  await expect(page).toHaveURL(new RegExp(protectedRoute.replace('/', '')));
}

/**
 * Verify user is not authenticated by checking redirect to sign-in
 */
export async function verifyUnauthenticated(
  page: Page,
  protectedRoute = '/configuration',
): Promise<void> {
  await page.goto(protectedRoute);
  await expect(page).toHaveURL(/sign-in/);
}

/**
 * Clean up test user from database
 */
export async function cleanupTestUser(userEmail: string): Promise<void> {
  try {
    await testDb.delete(users).where(eq(users.email, userEmail));
    console.log(`🧹 Cleaned up test user: ${userEmail}`);
  } catch (error) {
    console.warn(`Failed to clean up test user: ${error}`);
  }
}

/**
 * Complete authentication flow: sign up, verify database sync, and return user
 */
export async function createAuthenticatedUser(page: Page): Promise<TestUser> {
  const user = generateTestUser();

  // Sign up the user
  await signUpUser({ user, page });

  // Verify authentication works
  await verifyAuthentication(page);

  // Wait for database sync
  await waitForDatabaseSync(user.email);

  return user;
}
