import { test, expect, Page } from '@playwright/test'
import { injectAxe, checkA11y, getViolations } from 'axe-playwright'

test.describe('Authentication Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app and inject axe
    await page.goto('/')
    await injectAxe(page)
  })

  test.describe('Sign Up Page Accessibility', () => {
    test('should have no accessibility violations on sign up page', async ({ page }) => {
      await page.click('text=Sign Up')
      await expect(page).toHaveURL('/auth/signup')
      
      // Check for accessibility violations
      await checkA11y(page, null, {
        detailedReport: true,
        detailedReportOptions: { html: true }
      })
    })

    test('should have proper form labels and aria attributes', async ({ page }) => {
      await page.click('text=Sign Up')
      
      // Check for proper labels
      await expect(page.locator('label[for="signup-email"]')).toBeVisible()
      await expect(page.locator('label[for="signup-password"]')).toBeVisible()
      await expect(page.locator('label[for="signup-name"]')).toBeVisible()
      
      // Check for proper aria attributes
      const emailInput = page.locator('[data-testid="signup-email"]')
      await expect(emailInput).toHaveAttribute('aria-label', 'Email address')
      await expect(emailInput).toHaveAttribute('aria-required', 'true')
      
      const passwordInput = page.locator('[data-testid="signup-password"]')
      await expect(passwordInput).toHaveAttribute('aria-label', 'Password')
      await expect(passwordInput).toHaveAttribute('aria-required', 'true')
      
      const nameInput = page.locator('[data-testid="signup-name"]')
      await expect(nameInput).toHaveAttribute('aria-label', 'Full name')
    })

    test('should have proper error announcements', async ({ page }) => {
      await page.click('text=Sign Up')
      
      // Submit form without filling required fields
      await page.click('[data-testid="signup-submit"]')
      
      // Check for aria-live regions for error announcements
      const errorRegion = page.locator('[aria-live="polite"]')
      await expect(errorRegion).toBeVisible()
      
      // Check for proper error associations
      const emailError = page.locator('[data-testid="email-error"]')
      if (await emailError.isVisible()) {
        await expect(emailError).toHaveAttribute('role', 'alert')
        await expect(emailError).toHaveAttribute('aria-live', 'polite')
      }
    })

    test('should be navigable with keyboard only', async ({ page }) => {
      await page.click('text=Sign Up')
      
      // Start from the first focusable element
      await page.press('body', 'Tab')
      
      // Tab through all form elements
      await page.press('body', 'Tab') // Email input
      await expect(page.locator('[data-testid="signup-email"]')).toBeFocused()
      
      await page.press('body', 'Tab') // Password input
      await expect(page.locator('[data-testid="signup-password"]')).toBeFocused()
      
      await page.press('body', 'Tab') // Name input
      await expect(page.locator('[data-testid="signup-name"]')).toBeFocused()
      
      await page.press('body', 'Tab') // Terms checkbox
      await expect(page.locator('[data-testid="signup-terms"]')).toBeFocused()
      
      await page.press('body', 'Tab') // Submit button
      await expect(page.locator('[data-testid="signup-submit"]')).toBeFocused()
    })

    test('should have proper color contrast', async ({ page }) => {
      await page.click('text=Sign Up')
      
      // Check for color contrast violations
      await checkA11y(page, null, {
        rules: {
          'color-contrast': { enabled: true }
        }
      })
    })
  })

  test.describe('Sign In Page Accessibility', () => {
    test('should have no accessibility violations on sign in page', async ({ page }) => {
      await page.click('text=Sign In')
      await expect(page).toHaveURL('/auth/signin')
      
      // Check for accessibility violations
      await checkA11y(page, null, {
        detailedReport: true,
        detailedReportOptions: { html: true }
      })
    })

    test('should have proper form structure', async ({ page }) => {
      await page.click('text=Sign In')
      
      // Check for proper heading structure
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('h1')).toHaveText('Sign In')
      
      // Check for proper form structure
      const form = page.locator('form')
      await expect(form).toBeVisible()
      await expect(form).toHaveAttribute('aria-label', 'Sign in form')
      
      // Check for fieldset grouping if present
      const fieldset = page.locator('fieldset')
      if (await fieldset.isVisible()) {
        await expect(fieldset).toHaveAttribute('aria-describedby')
      }
    })

    test('should have proper focus management', async ({ page }) => {
      await page.click('text=Sign In')
      
      // Check initial focus
      await expect(page.locator('[data-testid="signin-email"]')).toBeFocused()
      
      // Test focus trap during form submission
      await page.fill('[data-testid="signin-email"]', 'test@example.com')
      await page.fill('[data-testid="signin-password"]', 'wrongpassword')
      await page.click('[data-testid="signin-submit"]')
      
      // After error, focus should return to appropriate element
      await expect(page.locator('[data-testid="signin-email"]')).toBeFocused()
    })

    test('should have proper ARIA landmarks', async ({ page }) => {
      await page.click('text=Sign In')
      
      // Check for main landmark
      await expect(page.locator('main')).toBeVisible()
      
      // Check for proper navigation landmarks
      await expect(page.locator('nav')).toBeVisible()
      
      // Check for form landmark
      await expect(page.locator('form')).toHaveAttribute('role', 'form')
    })
  })

  test.describe('Password Reset Page Accessibility', () => {
    test('should have no accessibility violations on password reset page', async ({ page }) => {
      await page.goto('/auth/reset-password')
      
      // Check for accessibility violations
      await checkA11y(page, null, {
        detailedReport: true,
        detailedReportOptions: { html: true }
      })
    })

    test('should have proper help text and instructions', async ({ page }) => {
      await page.goto('/auth/reset-password')
      
      // Check for help text
      const helpText = page.locator('[data-testid="reset-help-text"]')
      await expect(helpText).toBeVisible()
      
      // Check for proper association with input
      const emailInput = page.locator('[data-testid="reset-email"]')
      await expect(emailInput).toHaveAttribute('aria-describedby')
      
      // Check for instructions
      const instructions = page.locator('[data-testid="reset-instructions"]')
      await expect(instructions).toBeVisible()
      await expect(instructions).toHaveAttribute('role', 'region')
      await expect(instructions).toHaveAttribute('aria-label', 'Instructions')
    })
  })

  test.describe('Email Verification Page Accessibility', () => {
    test('should have no accessibility violations on email verification page', async ({ page }) => {
      await page.goto('/auth/verify-email')
      
      // Check for accessibility violations
      await checkA11y(page, null, {
        detailedReport: true,
        detailedReportOptions: { html: true }
      })
    })

    test('should have proper status announcements', async ({ page }) => {
      await page.goto('/auth/verify-email')
      
      // Check for status region
      const statusRegion = page.locator('[data-testid="verification-status"]')
      await expect(statusRegion).toBeVisible()
      await expect(statusRegion).toHaveAttribute('aria-live', 'polite')
      await expect(statusRegion).toHaveAttribute('role', 'status')
      
      // Test resend button
      await page.click('[data-testid="resend-verification"]')
      
      // Check for updated status
      await expect(statusRegion).toContainText('Verification email sent')
    })
  })

  test.describe('Error Handling Accessibility', () => {
    test('should properly announce errors to screen readers', async ({ page }) => {
      await page.goto('/auth/signin')
      
      // Submit form with invalid credentials
      await page.fill('[data-testid="signin-email"]', 'invalid@example.com')
      await page.fill('[data-testid="signin-password"]', 'wrongpassword')
      await page.click('[data-testid="signin-submit"]')
      
      // Check for proper error announcement
      const errorMessage = page.locator('[data-testid="signin-error"]')
      await expect(errorMessage).toBeVisible()
      await expect(errorMessage).toHaveAttribute('role', 'alert')
      await expect(errorMessage).toHaveAttribute('aria-live', 'assertive')
    })

    test('should have proper error summary for multiple errors', async ({ page }) => {
      await page.goto('/auth/signup')
      
      // Submit form without filling required fields
      await page.click('[data-testid="signup-submit"]')
      
      // Check for error summary
      const errorSummary = page.locator('[data-testid="error-summary"]')
      if (await errorSummary.isVisible()) {
        await expect(errorSummary).toHaveAttribute('role', 'alert')
        await expect(errorSummary).toHaveAttribute('aria-labelledby', 'error-summary-title')
        
        // Check for error list
        const errorList = page.locator('[data-testid="error-list"]')
        await expect(errorList).toBeVisible()
        await expect(errorList).toHaveAttribute('role', 'list')
        
        // Check for proper error links
        const errorLinks = page.locator('[data-testid="error-list"] a')
        if (await errorLinks.first().isVisible()) {
          await expect(errorLinks.first()).toHaveAttribute('href')
        }
      }
    })
  })

  test.describe('OAuth Button Accessibility', () => {
    test('should have proper OAuth button accessibility', async ({ page }) => {
      await page.goto('/auth/signin')
      
      // Check Google OAuth button
      const googleButton = page.locator('[data-testid="oauth-google"]')
      await expect(googleButton).toBeVisible()
      await expect(googleButton).toHaveAttribute('aria-label', 'Sign in with Google')
      await expect(googleButton).toHaveAttribute('role', 'button')
      
      // Check GitHub OAuth button
      const githubButton = page.locator('[data-testid="oauth-github"]')
      await expect(githubButton).toBeVisible()
      await expect(githubButton).toHaveAttribute('aria-label', 'Sign in with GitHub')
      await expect(githubButton).toHaveAttribute('role', 'button')
      
      // Check for proper button text or icons
      await expect(googleButton).toContainText('Google')
      await expect(githubButton).toContainText('GitHub')
    })
  })

  test.describe('Mobile Accessibility', () => {
    test('should be accessible on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      await page.goto('/auth/signin')
      
      // Check for accessibility violations on mobile
      await checkA11y(page, null, {
        detailedReport: true,
        detailedReportOptions: { html: true }
      })
      
      // Check for proper touch targets
      const buttons = page.locator('button')
      const buttonCount = await buttons.count()
      
      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i)
        const boundingBox = await button.boundingBox()
        
        if (boundingBox) {
          // Touch targets should be at least 44px x 44px
          expect(boundingBox.width).toBeGreaterThanOrEqual(44)
          expect(boundingBox.height).toBeGreaterThanOrEqual(44)
        }
      }
    })
  })

  test.describe('High Contrast Mode', () => {
    test('should work properly in high contrast mode', async ({ page }) => {
      // Simulate high contrast mode
      await page.emulateMedia({ colorScheme: 'dark' })
      
      await page.goto('/auth/signin')
      
      // Check for accessibility violations in high contrast mode
      await checkA11y(page, null, {
        rules: {
          'color-contrast': { enabled: true }
        }
      })
    })
  })

  test.describe('Reduced Motion', () => {
    test('should respect reduced motion preferences', async ({ page }) => {
      // Set reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' })
      
      await page.goto('/auth/signin')
      
      // Check that animations are disabled or reduced
      const animatedElements = page.locator('[data-testid*="animated"]')
      const elementCount = await animatedElements.count()
      
      for (let i = 0; i < elementCount; i++) {
        const element = animatedElements.nth(i)
        const animationDuration = await element.evaluate(el => 
          getComputedStyle(el).animationDuration
        )
        
        // Animation should be disabled or very short
        expect(animationDuration === '0s' || animationDuration === '0.01s').toBe(true)
      }
    })
  })

  test.describe('Screen Reader Testing', () => {
    test('should have proper screen reader announcements', async ({ page }) => {
      await page.goto('/auth/signin')
      
      // Check for proper page title
      await expect(page).toHaveTitle(/Sign In/)
      
      // Check for proper heading hierarchy
      const headings = page.locator('h1, h2, h3, h4, h5, h6')
      const headingCount = await headings.count()
      
      let previousLevel = 0
      for (let i = 0; i < headingCount; i++) {
        const heading = headings.nth(i)
        const tagName = await heading.evaluate(el => el.tagName)
        const level = parseInt(tagName.charAt(1))
        
        // Headings should not skip levels
        expect(level).toBeLessThanOrEqual(previousLevel + 1)
        previousLevel = level
      }
      
      // Check for proper landmark navigation
      await expect(page.locator('main')).toBeVisible()
      await expect(page.locator('nav')).toBeVisible()
      
      // Check for skip links
      const skipLink = page.locator('[data-testid="skip-link"]')
      if (await skipLink.isVisible()) {
        await expect(skipLink).toHaveAttribute('href', '#main-content')
      }
    })
  })
})

// Helper function to check specific accessibility rules
async function checkSpecificA11yRules(page: Page, rules: string[]) {
  const results = await page.evaluate(async (rulesToCheck) => {
    const axe = (window as any).axe
    if (!axe) {
      throw new Error('axe is not loaded')
    }
    
    const results = await axe.run(document, {
      rules: rulesToCheck.reduce((acc, rule) => {
        acc[rule] = { enabled: true }
        return acc
      }, {} as any)
    })
    
    return results
  }, rules)
  
  return results
}

// Helper function to test keyboard navigation
async function testKeyboardNavigation(page: Page) {
  // Get all focusable elements
  const focusableElements = await page.evaluate(() => {
    const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    return Array.from(document.querySelectorAll(selector))
      .filter(el => !el.hasAttribute('disabled'))
      .map(el => el.tagName + (el.id ? `#${el.id}` : ''))
  })
  
  // Test tab order
  for (let i = 0; i < focusableElements.length; i++) {
    await page.press('body', 'Tab')
    
    const focusedElement = await page.evaluate(() => {
      const focused = document.activeElement
      return focused ? focused.tagName + (focused.id ? `#${focused.id}` : '') : null
    })
    
    // Focus should move to the next element in the expected order
    expect(focusedElement).toBe(focusableElements[i])
  }
}