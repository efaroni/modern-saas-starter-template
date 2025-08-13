import { Page, Locator, expect } from '@playwright/test';
import { CLERK_TEST_CODE } from '../helpers/auth-helper';

/**
 * Page Object Model for Clerk authentication components and flows
 */
export class ClerkAuthPage {
  readonly page: Page;

  // Common selectors
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly identifierInput: Locator;
  readonly continueButton: Locator;
  readonly userButton: Locator;
  readonly userPopover: Locator;
  readonly signOutButton: Locator;
  readonly manageAccountButton: Locator;

  // Modal selectors
  readonly modalContent: Locator;
  readonly modalCloseButton: Locator;
  readonly profileButton: Locator;
  readonly securityButton: Locator;
  readonly firstNameInput: Locator;
  readonly saveButton: Locator;
  readonly deleteAccountButton: Locator;
  readonly deleteConfirmInput: Locator;

  // Verification selectors
  readonly otpInputs: Locator;

  constructor(page: Page) {
    this.page = page;

    // Authentication form elements
    this.emailInput = page.locator('input[name="emailAddress"]');
    this.passwordInput = page.locator('input[name="password"]:not([disabled])');
    this.identifierInput = page.locator('input[name="identifier"]');
    this.continueButton = page.locator(
      'button[data-localization-key="formButtonPrimary"]:has-text("Continue")',
    );

    // User menu elements
    this.userButton = page.locator('.cl-userButtonTrigger');
    this.userPopover = page.locator('.cl-userButtonPopoverCard');
    this.signOutButton = page.locator('button:has-text("Sign out")');
    this.manageAccountButton = page.locator(
      'button:has-text("Manage account")',
    );

    // Modal elements
    this.modalContent = page.locator('.cl-modalContent');
    this.modalCloseButton = page.locator('.cl-modalCloseButton').first();
    this.profileButton = page.locator('button:has-text("Profile")').first();
    this.securityButton = page.locator('button:has-text("Security")').first();
    this.firstNameInput = page.locator('input[name="firstName"]').first();
    this.saveButton = page.locator('.cl-modalContent button:has-text("Save")');
    this.deleteAccountButton = page.locator(
      'button:has-text("Delete account")',
    );
    this.deleteConfirmInput = page.locator('input[type="text"]').last();

    // Verification elements
    this.otpInputs = page.locator('input[maxlength="1"]');
  }

  /**
   * Navigate to sign-up page and wait for form to load
   */
  async goToSignUp(): Promise<void> {
    await this.page.goto('/sign-up');
    await this.emailInput.waitFor({ timeout: 10000 });
  }

  /**
   * Navigate to sign-in page and wait for form to load
   */
  async goToSignIn(): Promise<void> {
    await this.page.goto('/sign-in');
    await this.identifierInput.waitFor({ timeout: 10000 });
  }

  /**
   * Fill email field in sign-up form
   */
  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  /**
   * Fill identifier (email/username) field in sign-in form
   */
  async fillIdentifier(identifier: string): Promise<void> {
    await this.identifierInput.fill(identifier);
  }

  /**
   * Fill password field
   */
  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.waitFor({ timeout: 15000 });
    await this.passwordInput.fill(password);
  }

  /**
   * Click the continue button
   */
  async clickContinue(): Promise<void> {
    await expect(this.continueButton).toBeVisible({ timeout: 5000 });
    await this.continueButton.click();
  }

  /**
   * Handle OTP verification for +clerk_test emails
   */
  async fillVerificationCode(): Promise<void> {
    const isOnVerifyPage = await this.page
      .waitForURL(/verify/, { timeout: 5000 })
      .then(() => true)
      .catch(() => false);

    if (isOnVerifyPage) {
      // Wait for Clerk to be ready
      await this.page.waitForTimeout(1000);

      // Fill verification code
      const inputs = await this.otpInputs.all();
      if (inputs.length === 6) {
        for (let i = 0; i < 6; i++) {
          await inputs[i].fill(CLERK_TEST_CODE[i]);
          await this.page.waitForTimeout(100);
        }
      }
      await this.page.waitForTimeout(2000); // Wait for auto-submit
    }
  }

  /**
   * Open user menu popover
   */
  async openUserMenu(): Promise<void> {
    await this.userButton.click();
    await this.userPopover.waitFor();
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    await this.openUserMenu();
    await this.signOutButton.click();
    await this.page.waitForTimeout(2000);
  }

  /**
   * Open account management modal
   */
  async openManageAccount(): Promise<void> {
    await this.openUserMenu();
    await this.manageAccountButton.click();
    await this.modalContent.waitFor();
  }

  /**
   * Navigate to profile section in account modal
   */
  async goToProfileSection(): Promise<void> {
    await this.openManageAccount();

    if (
      await this.profileButton.isVisible({ timeout: 1000 }).catch(() => false)
    ) {
      await this.profileButton.click();
    }
  }

  /**
   * Navigate to security section in account modal
   */
  async goToSecuritySection(): Promise<void> {
    await this.openManageAccount();

    if (
      await this.securityButton.isVisible({ timeout: 1000 }).catch(() => false)
    ) {
      await this.securityButton.click();
    }
  }

  /**
   * Update user's first name
   */
  async updateFirstName(newName: string): Promise<boolean> {
    await this.goToProfileSection();

    if (
      await this.firstNameInput.isVisible({ timeout: 2000 }).catch(() => false)
    ) {
      await this.firstNameInput.clear();
      await this.firstNameInput.fill(newName);
      await this.saveButton.click();
      await this.page.waitForTimeout(4000); // Wait for webhook sync
      return true;
    }
    return false;
  }

  /**
   * Delete user account
   */
  async deleteAccount(): Promise<boolean> {
    await this.goToSecuritySection();

    if (
      await this.deleteAccountButton
        .isVisible({ timeout: 3000 })
        .catch(() => false)
    ) {
      await this.deleteAccountButton.click();

      // Handle confirmation input
      if (
        await this.deleteConfirmInput
          .isVisible({ timeout: 2000 })
          .catch(() => false)
      ) {
        await this.deleteConfirmInput.fill('Delete account');
      }

      // Confirm deletion
      const confirmBtn = this.page
        .locator('button:has-text("Delete account")')
        .last();
      if ((await confirmBtn.isVisible()) && !(await confirmBtn.isDisabled())) {
        await confirmBtn.click();
        await this.page.waitForTimeout(5000); // Wait for deletion webhook
        return true;
      }
    }
    return false;
  }

  /**
   * Close any open modals
   */
  async closeModal(): Promise<void> {
    try {
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(500);
    } catch {
      // Modal might already be closed
    }

    if (
      await this.modalCloseButton
        .isVisible({ timeout: 1000 })
        .catch(() => false)
    ) {
      await this.modalCloseButton.click();
    }
  }

  /**
   * Check if user is on verification page
   */
  async isOnVerificationPage(): Promise<boolean> {
    return this.page.url().includes('verify');
  }

  /**
   * Check if user is on sign-in page
   */
  async isOnSignInPage(): Promise<boolean> {
    return this.page.url().includes('sign-in');
  }

  /**
   * Check if user is on sign-up page
   */
  async isOnSignUpPage(): Promise<boolean> {
    return this.page.url().includes('sign-up');
  }

  /**
   * Wait for authentication to complete and redirect
   */
  async waitForAuthCompletion(expectedRoute?: string): Promise<void> {
    await this.page.waitForTimeout(3000);

    if (expectedRoute) {
      await this.page.goto(expectedRoute);
      await expect(this.page).not.toHaveURL(/sign-in/);
      await expect(this.page).toHaveURL(
        new RegExp(expectedRoute.replace('/', '')),
      );
    }
  }
}
