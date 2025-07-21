import { test, expect, Page } from '@playwright/test'
import { testHelpers } from '@/lib/db/test-helpers'

// Test user data
const testUser = {
  email: 'e2e-test@example.com',
  password: 'TestPassword123!',
  name: 'E2E Test User'
}

const weakPassword = 'weak'
const strongPassword = 'StrongP@ssw0rd123!'

test.describe('Authentication E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup test database
    await testHelpers.setupTest()
    
    // Navigate to the app
    await page.goto('/')
  })

  test.afterEach(async ({ page }) => {
    // Clean up test database
    await testHelpers.teardownTest()
  })

  test.describe('Sign Up Flow', () => {
    test('should complete successful sign up with email verification', async ({ page }) => {
      // Navigate to sign up page
      await page.click('text=Sign Up')
      await expect(page).toHaveURL('/auth/signup')

      // Fill in sign up form
      await page.fill('[data-testid="signup-email"]', testUser.email)
      await page.fill('[data-testid="signup-password"]', testUser.password)
      await page.fill('[data-testid="signup-name"]', testUser.name)
      await page.check('[data-testid="signup-terms"]')

      // Submit form
      await page.click('[data-testid="signup-submit"]')

      // Should show success message
      await expect(page.locator('[data-testid="signup-success"]')).toBeVisible()
      await expect(page.locator('text=Check your email')).toBeVisible()

      // Should redirect to verification page
      await expect(page).toHaveURL('/auth/verify-email')
    })

    test('should show validation errors for weak password', async ({ page }) => {
      await page.click('text=Sign Up')
      
      await page.fill('[data-testid="signup-email"]', testUser.email)
      await page.fill('[data-testid="signup-password"]', weakPassword)
      await page.fill('[data-testid="signup-name"]', testUser.name)
      
      await page.click('[data-testid="signup-submit"]')
      
      // Should show password validation error
      await expect(page.locator('[data-testid="password-error"]')).toBeVisible()
      await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible()
    })

    test('should prevent duplicate email registration', async ({ page }) => {
      // First registration
      await page.click('text=Sign Up')
      await page.fill('[data-testid="signup-email"]', testUser.email)
      await page.fill('[data-testid="signup-password"]', testUser.password)
      await page.fill('[data-testid="signup-name"]', testUser.name)
      await page.check('[data-testid="signup-terms"]')
      await page.click('[data-testid="signup-submit"]')
      
      // Wait for success
      await expect(page.locator('[data-testid="signup-success"]')).toBeVisible()
      
      // Try to register again with same email
      await page.goto('/auth/signup')
      await page.fill('[data-testid="signup-email"]', testUser.email)
      await page.fill('[data-testid="signup-password"]', testUser.password)
      await page.fill('[data-testid="signup-name"]', testUser.name)
      await page.check('[data-testid="signup-terms"]')
      await page.click('[data-testid="signup-submit"]')
      
      // Should show error
      await expect(page.locator('[data-testid="signup-error"]')).toBeVisible()
      await expect(page.locator('text=Email already exists')).toBeVisible()
    })
  })

  test.describe('Sign In Flow', () => {
    test.beforeEach(async ({ page }) => {
      // Create a test user first
      await page.click('text=Sign Up')
      await page.fill('[data-testid="signup-email"]', testUser.email)
      await page.fill('[data-testid="signup-password"]', testUser.password)
      await page.fill('[data-testid="signup-name"]', testUser.name)
      await page.check('[data-testid="signup-terms"]')
      await page.click('[data-testid="signup-submit"]')
      await expect(page.locator('[data-testid="signup-success"]')).toBeVisible()
    })

    test('should complete successful sign in', async ({ page }) => {
      await page.goto('/auth/signin')
      
      await page.fill('[data-testid="signin-email"]', testUser.email)
      await page.fill('[data-testid="signin-password"]', testUser.password)
      await page.click('[data-testid="signin-submit"]')
      
      // Should redirect to dashboard
      await expect(page).toHaveURL('/dashboard')
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
    })

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/auth/signin')
      
      await page.fill('[data-testid="signin-email"]', testUser.email)
      await page.fill('[data-testid="signin-password"]', 'wrongpassword')
      await page.click('[data-testid="signin-submit"]')
      
      await expect(page.locator('[data-testid="signin-error"]')).toBeVisible()
      await expect(page.locator('text=Invalid credentials')).toBeVisible()
    })

    test('should implement rate limiting after multiple failed attempts', async ({ page }) => {
      await page.goto('/auth/signin')
      
      // Make multiple failed attempts
      for (let i = 0; i < 6; i++) {
        await page.fill('[data-testid="signin-email"]', testUser.email)
        await page.fill('[data-testid="signin-password"]', 'wrongpassword')
        await page.click('[data-testid="signin-submit"]')
        
        if (i < 5) {
          await expect(page.locator('[data-testid="signin-error"]')).toBeVisible()
        }
      }
      
      // Should show rate limit error
      await expect(page.locator('text=Too many attempts')).toBeVisible()
    })
  })

  test.describe('Email Verification Flow', () => {
    test('should complete email verification', async ({ page }) => {
      // Sign up first
      await page.click('text=Sign Up')
      await page.fill('[data-testid="signup-email"]', testUser.email)
      await page.fill('[data-testid="signup-password"]', testUser.password)
      await page.fill('[data-testid="signup-name"]', testUser.name)
      await page.check('[data-testid="signup-terms"]')
      await page.click('[data-testid="signup-submit"]')
      
      // Should be on verification page
      await expect(page).toHaveURL('/auth/verify-email')
      
      // In a real test, you would intercept the email or use a test token
      // For now, we'll simulate the verification process
      await page.click('[data-testid="resend-verification"]')
      
      // Should show success message
      await expect(page.locator('text=Verification email sent')).toBeVisible()
    })
  })

  test.describe('Password Reset Flow', () => {
    test.beforeEach(async ({ page }) => {
      // Create a test user first
      await page.click('text=Sign Up')
      await page.fill('[data-testid="signup-email"]', testUser.email)
      await page.fill('[data-testid="signup-password"]', testUser.password)
      await page.fill('[data-testid="signup-name"]', testUser.name)
      await page.check('[data-testid="signup-terms"]')
      await page.click('[data-testid="signup-submit"]')
      await expect(page.locator('[data-testid="signup-success"]')).toBeVisible()
    })

    test('should initiate password reset', async ({ page }) => {
      await page.goto('/auth/signin')
      await page.click('text=Forgot password?')
      
      await expect(page).toHaveURL('/auth/reset-password')
      
      await page.fill('[data-testid="reset-email"]', testUser.email)
      await page.click('[data-testid="reset-submit"]')
      
      // Should show success message
      await expect(page.locator('[data-testid="reset-success"]')).toBeVisible()
      await expect(page.locator('text=Check your email')).toBeVisible()
    })

    test('should handle non-existent email gracefully', async ({ page }) => {
      await page.goto('/auth/reset-password')
      
      await page.fill('[data-testid="reset-email"]', 'nonexistent@example.com')
      await page.click('[data-testid="reset-submit"]')
      
      // Should still show success message (security measure)
      await expect(page.locator('[data-testid="reset-success"]')).toBeVisible()
    })
  })

  test.describe('OAuth Sign In Flow', () => {
    test('should display OAuth providers', async ({ page }) => {
      await page.goto('/auth/signin')
      
      // Should show OAuth buttons
      await expect(page.locator('[data-testid="oauth-google"]')).toBeVisible()
      await expect(page.locator('[data-testid="oauth-github"]')).toBeVisible()
    })

    test('should redirect to OAuth provider', async ({ page }) => {
      await page.goto('/auth/signin')
      
      // Click Google OAuth button
      const [popup] = await Promise.all([
        page.waitForEvent('popup'),
        page.click('[data-testid="oauth-google"]')
      ])
      
      // Should redirect to Google OAuth
      await expect(popup).toHaveURL(/accounts\.google\.com/)
    })
  })

  test.describe('Session Management', () => {
    test.beforeEach(async ({ page }) => {
      // Create and sign in test user
      await page.click('text=Sign Up')
      await page.fill('[data-testid="signup-email"]', testUser.email)
      await page.fill('[data-testid="signup-password"]', testUser.password)
      await page.fill('[data-testid="signup-name"]', testUser.name)
      await page.check('[data-testid="signup-terms"]')
      await page.click('[data-testid="signup-submit"]')
      await expect(page.locator('[data-testid="signup-success"]')).toBeVisible()
      
      // Sign in
      await page.goto('/auth/signin')
      await page.fill('[data-testid="signin-email"]', testUser.email)
      await page.fill('[data-testid="signin-password"]', testUser.password)
      await page.click('[data-testid="signin-submit"]')
      await expect(page).toHaveURL('/dashboard')
    })

    test('should maintain session across page refreshes', async ({ page }) => {
      await page.reload()
      
      // Should still be logged in
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
      await expect(page).toHaveURL('/dashboard')
    })

    test('should sign out successfully', async ({ page }) => {
      await page.click('[data-testid="user-menu"]')
      await page.click('[data-testid="signout-button"]')
      
      // Should redirect to home page
      await expect(page).toHaveURL('/')
      await expect(page.locator('text=Sign In')).toBeVisible()
    })

    test('should protect authenticated routes', async ({ page }) => {
      // Sign out first
      await page.click('[data-testid="user-menu"]')
      await page.click('[data-testid="signout-button"]')
      
      // Try to access protected route
      await page.goto('/dashboard')
      
      // Should redirect to sign in
      await expect(page).toHaveURL('/auth/signin')
    })
  })

  test.describe('Profile Management', () => {
    test.beforeEach(async ({ page }) => {
      // Create and sign in test user
      await page.click('text=Sign Up')
      await page.fill('[data-testid="signup-email"]', testUser.email)
      await page.fill('[data-testid="signup-password"]', testUser.password)
      await page.fill('[data-testid="signup-name"]', testUser.name)
      await page.check('[data-testid="signup-terms"]')
      await page.click('[data-testid="signup-submit"]')
      await expect(page.locator('[data-testid="signup-success"]')).toBeVisible()
      
      // Sign in
      await page.goto('/auth/signin')
      await page.fill('[data-testid="signin-email"]', testUser.email)
      await page.fill('[data-testid="signin-password"]', testUser.password)
      await page.click('[data-testid="signin-submit"]')
      await expect(page).toHaveURL('/dashboard')
    })

    test('should update profile information', async ({ page }) => {
      await page.goto('/profile')
      
      // Update name
      await page.fill('[data-testid="profile-name"]', 'Updated Name')
      await page.click('[data-testid="profile-save"]')
      
      // Should show success message
      await expect(page.locator('[data-testid="profile-success"]')).toBeVisible()
      
      // Name should be updated
      await expect(page.locator('[data-testid="profile-name"]')).toHaveValue('Updated Name')
    })

    test('should change password', async ({ page }) => {
      await page.goto('/profile')
      await page.click('[data-testid="change-password-tab"]')
      
      await page.fill('[data-testid="current-password"]', testUser.password)
      await page.fill('[data-testid="new-password"]', strongPassword)
      await page.fill('[data-testid="confirm-password"]', strongPassword)
      await page.click('[data-testid="change-password-submit"]')
      
      // Should show success message
      await expect(page.locator('[data-testid="password-change-success"]')).toBeVisible()
      
      // Should be able to sign in with new password
      await page.click('[data-testid="user-menu"]')
      await page.click('[data-testid="signout-button"]')
      
      await page.goto('/auth/signin')
      await page.fill('[data-testid="signin-email"]', testUser.email)
      await page.fill('[data-testid="signin-password"]', strongPassword)
      await page.click('[data-testid="signin-submit"]')
      
      await expect(page).toHaveURL('/dashboard')
    })
  })

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate network failure
      await page.route('**/api/auth/**', route => {
        route.abort('failed')
      })
      
      await page.goto('/auth/signin')
      await page.fill('[data-testid="signin-email"]', testUser.email)
      await page.fill('[data-testid="signin-password"]', testUser.password)
      await page.click('[data-testid="signin-submit"]')
      
      // Should show network error
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible()
    })

    test('should show appropriate error messages', async ({ page }) => {
      await page.goto('/auth/signin')
      
      // Submit empty form
      await page.click('[data-testid="signin-submit"]')
      
      // Should show validation errors
      await expect(page.locator('[data-testid="email-required"]')).toBeVisible()
      await expect(page.locator('[data-testid="password-required"]')).toBeVisible()
    })
  })
})

// Helper function to create test data
async function createTestUser(page: Page, userData = testUser) {
  await page.click('text=Sign Up')
  await page.fill('[data-testid="signup-email"]', userData.email)
  await page.fill('[data-testid="signup-password"]', userData.password)
  await page.fill('[data-testid="signup-name"]', userData.name)
  await page.check('[data-testid="signup-terms"]')
  await page.click('[data-testid="signup-submit"]')
  await expect(page.locator('[data-testid="signup-success"]')).toBeVisible()
}

// Helper function to sign in test user
async function signInTestUser(page: Page, userData = testUser) {
  await page.goto('/auth/signin')
  await page.fill('[data-testid="signin-email"]', userData.email)
  await page.fill('[data-testid="signin-password"]', userData.password)
  await page.click('[data-testid="signin-submit"]')
  await expect(page).toHaveURL('/dashboard')
}