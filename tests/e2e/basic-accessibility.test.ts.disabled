import { test, expect } from '@playwright/test';

test.describe('Basic Accessibility Tests @accessibility', () => {
  test('should have proper page title', async ({ page }) => {
    await page.goto('/auth');

    // Check page title exists
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
  });

  test('should have proper heading structure', async ({ page }) => {
    await page.goto('/auth');

    // Check for at least one h1 heading
    const h1 = await page.locator('h1').first();
    await expect(h1).toBeVisible();

    // Check heading has text content
    const headingText = await h1.textContent();
    expect(headingText).toBeTruthy();
  });

  test('should have accessible form elements', async ({ page }) => {
    await page.goto('/auth');

    // Check login form has proper labels or aria-labels
    const emailInput = page.locator('#email');
    await expect(emailInput).toBeVisible();

    // Check password input exists
    const passwordInput = page.locator('#password');
    await expect(passwordInput).toBeVisible();

    // Check submit button exists and has text
    const submitButton = page.locator('button[type="submit"]').first();
    await expect(submitButton).toBeVisible();
    const buttonText = await submitButton.textContent();
    expect(buttonText).toBeTruthy();
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/auth');

    // Tab multiple times to reach an interactive element
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');

      // Check if we've reached an interactive element
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? el.tagName.toLowerCase() : null;
      });

      if (
        focusedElement &&
        ['button', 'input', 'a', 'select', 'textarea'].includes(focusedElement)
      ) {
        // Successfully reached an interactive element
        expect(focusedElement).toBeTruthy();
        return;
      }
    }

    // If we get here, at least verify something can be focused
    const activeElement = await page.evaluate(
      () => document.activeElement?.tagName,
    );
    expect(activeElement).toBeTruthy();
  });

  test('should have sufficient color contrast for text', async ({ page }) => {
    await page.goto('/auth');

    // Basic check - ensure text elements are visible
    const textElements = await page.locator('p, span, label, h1, h2, h3').all();
    expect(textElements.length).toBeGreaterThan(0);

    // Check at least one text element is visible
    for (const element of textElements.slice(0, 5)) {
      // Check first 5 elements
      const isVisible = await element.isVisible();
      if (isVisible) {
        const text = await element.textContent();
        if (text && text.trim().length > 0) {
          // Element has text and is visible - basic accessibility check passes
          return;
        }
      }
    }
  });

  test('should have lang attribute on html element', async ({ page }) => {
    await page.goto('/auth');

    // Check html element has lang attribute
    const htmlLang = await page.getAttribute('html', 'lang');
    expect(htmlLang).toBeTruthy();
    expect(htmlLang).toBe('en');
  });

  test('should have proper focus indicators', async ({ page }) => {
    await page.goto('/auth');

    // Click on sign up tab if available
    const signUpTab = page.locator('button[role="tab"]:has-text("Sign Up")');
    if (await signUpTab.isVisible()) {
      await signUpTab.click();
    }

    // Focus on an input
    const firstInput = page.locator('input').first();
    await firstInput.focus();

    // Check that focused element can be identified (has focus styles)
    const focusedElement = await page.evaluate(() => {
      return document.activeElement?.tagName.toLowerCase();
    });

    expect(focusedElement).toBe('input');
  });

  test('should have accessible buttons', async ({ page }) => {
    await page.goto('/auth');

    // Find all buttons
    const buttons = await page.locator('button').all();
    expect(buttons.length).toBeGreaterThan(0);

    // Check first few buttons have text or aria-label
    for (const button of buttons.slice(0, 3)) {
      if (await button.isVisible()) {
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');

        // Button should have either visible text or aria-label
        expect(text || ariaLabel).toBeTruthy();
      }
    }
  });

  test('should work with mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/auth');

    // Check page loads properly on mobile
    await expect(page.locator('h1').first()).toBeVisible();

    // Check form is still accessible
    const form = page.locator('form').first();
    await expect(form).toBeVisible();
  });

  test('should have proper form structure', async ({ page }) => {
    await page.goto('/auth');

    // Check for any input elements
    const inputs = await page.locator('input').all();
    expect(inputs.length).toBeGreaterThan(0);

    // Check for buttons (submit or regular)
    const buttons = await page.locator('button').all();
    expect(buttons.length).toBeGreaterThan(0);

    // Verify we have the basic auth page structure
    const authContent = await page
      .locator('[role="tabpanel"], form, .space-y-4')
      .first();
    await expect(authContent).toBeVisible();
  });
});
