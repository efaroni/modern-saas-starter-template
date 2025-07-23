import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MockAuthProvider } from '@/lib/auth/providers/mock';
import { AuthService } from '@/lib/auth/service';
import type { AuthUser } from '@/lib/auth/types';
import { MockEmailService } from '@/lib/email/mock';

describe('Password Reset', () => {
  let authProvider: MockAuthProvider;
  let authService: AuthService;
  let testUser: AuthUser;
  let mockEmailService: MockEmailService;

  beforeEach(async () => {
    authProvider = new MockAuthProvider();
    authService = new AuthService(authProvider);

    // Get reference to the mock email service
    mockEmailService = require('@/lib/email/service')
      .emailService as MockEmailService;

    // Create a test user
    const result = await authService.signUp({
      email: 'reset@example.com',
      password: 'password123',
      name: 'Reset Test User',
    });

    if (result.success && result.user) {
      testUser = result.user;
    }

    // Clear sent emails
    mockEmailService.clearSentEmails();
  });

  describe('Password Reset Request', () => {
    it('should generate reset token and send email', async () => {
      const result =
        await authService.requestPasswordReset('reset@example.com');

      expect(result.success).toBe(true);

      // Check that email was sent
      const sentEmails = mockEmailService.getSentEmails();
      expect(sentEmails).toHaveLength(1);
      expect(sentEmails[0].to).toBe('reset@example.com');
      expect(sentEmails[0].data.resetToken).toBeDefined();
      expect(sentEmails[0].data.resetUrl).toContain('reset-password');
      expect(sentEmails[0].data.user.email).toBe('reset@example.com');
    });

    it('should handle non-existent email', async () => {
      const result = await authService.requestPasswordReset(
        'nonexistent@example.com',
      );

      // Should return success even for non-existent email (security best practice)
      expect(result.success).toBe(true);

      // No email should be sent
      const sentEmails = mockEmailService.getSentEmails();
      expect(sentEmails).toHaveLength(0);
    });

    it('should handle email service failure', async () => {
      // Set mock to fail
      mockEmailService.setShouldFail(true);

      const result =
        await authService.requestPasswordReset('reset@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to send reset email');

      // Reset for other tests
      mockEmailService.setShouldFail(false);
    });

    it('should validate email format', async () => {
      const result = await authService.requestPasswordReset('invalid-email');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email format');
    });

    it('should generate unique reset tokens', async () => {
      const result1 =
        await authService.requestPasswordReset('reset@example.com');
      const result2 =
        await authService.requestPasswordReset('reset@example.com');

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      const sentEmails = mockEmailService.getSentEmails();
      expect(sentEmails).toHaveLength(2);

      const token1 = sentEmails[0].data.resetToken;
      const token2 = sentEmails[1].data.resetToken;

      expect(token1).not.toBe(token2);
    });
  });

  describe('Password Reset Verification', () => {
    let resetToken: string;

    beforeEach(async () => {
      await authService.requestPasswordReset('reset@example.com');
      const sentEmails = mockEmailService.getSentEmails();
      resetToken = sentEmails[0].data.resetToken;
    });

    it('should verify valid reset token', async () => {
      const result = await authService.verifyPasswordResetToken(resetToken);

      expect(result.success).toBe(true);
      expect(result.user?.email).toBe('reset@example.com');
    });

    it('should reject invalid reset token', async () => {
      const result =
        await authService.verifyPasswordResetToken('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid or expired reset token');
    });

    it('should reject expired reset token', async () => {
      // Mock date to simulate token expiration
      const originalDate = Date.now;
      Date.now = jest.fn(() => originalDate() + (4 * 60 * 60 * 1000)); // 4 hours later

      const result = await authService.verifyPasswordResetToken(resetToken);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid or expired reset token');

      // Restore original Date.now
      Date.now = originalDate;
    });

    it('should reject used reset token', async () => {
      // First use the token
      await authService.resetPassword(resetToken, 'newpassword123');

      // Try to verify again
      const result = await authService.verifyPasswordResetToken(resetToken);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid or expired reset token');
    });
  });

  describe('Password Reset Completion', () => {
    let resetToken: string;

    beforeEach(async () => {
      await authService.requestPasswordReset('reset@example.com');
      const sentEmails = mockEmailService.getSentEmails();
      resetToken = sentEmails[0].data.resetToken;
    });

    it('should reset password with valid token', async () => {
      const result = await authService.resetPassword(
        resetToken,
        'newpassword123',
      );

      expect(result.success).toBe(true);
      expect(result.user?.email).toBe('reset@example.com');

      // Verify can login with new password
      await authService.signOut();
      const loginResult = await authService.signIn({
        email: 'reset@example.com',
        password: 'newpassword123',
      });

      expect(loginResult.success).toBe(true);
    });

    it('should reject invalid token for password reset', async () => {
      const result = await authService.resetPassword(
        'invalid-token',
        'newpassword123',
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid or expired reset token');
    });

    it('should reject expired token for password reset', async () => {
      // Mock date to simulate token expiration
      const originalDate = Date.now;
      Date.now = jest.fn(() => originalDate() + (4 * 60 * 60 * 1000)); // 4 hours later

      const result = await authService.resetPassword(
        resetToken,
        'newpassword123',
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid or expired reset token');

      // Restore original Date.now
      Date.now = originalDate;
    });

    it('should validate new password length', async () => {
      const result = await authService.resetPassword(resetToken, 'short');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Password must be at least 8 characters');
    });

    it('should invalidate token after successful reset', async () => {
      // First reset
      const result1 = await authService.resetPassword(
        resetToken,
        'newpassword123',
      );
      expect(result1.success).toBe(true);

      // Try to use same token again
      const result2 = await authService.resetPassword(
        resetToken,
        'anothernewpassword',
      );
      expect(result2.success).toBe(false);
      expect(result2.error).toBe('Invalid or expired reset token');
    });
  });

  describe('Password Reset Token Management', () => {
    it('should clean up expired tokens', async () => {
      // Create a token
      await authService.requestPasswordReset('reset@example.com');
      const sentEmails = mockEmailService.getSentEmails();
      const token = sentEmails[0].data.resetToken;

      // Mock date to simulate token expiration
      const originalDate = Date.now;
      Date.now = jest.fn(() => originalDate() + (4 * 60 * 60 * 1000)); // 4 hours later

      // Clean up expired tokens
      await authService.cleanupExpiredResetTokens();

      // Token should be invalid after cleanup
      const result = await authService.verifyPasswordResetToken(token);
      expect(result.success).toBe(false);

      // Restore original Date.now
      Date.now = originalDate;
    });

    it('should not clean up valid tokens', async () => {
      // Create a token
      await authService.requestPasswordReset('reset@example.com');
      const sentEmails = mockEmailService.getSentEmails();
      const token = sentEmails[0].data.resetToken;

      // Clean up expired tokens (without advancing time)
      await authService.cleanupExpiredResetTokens();

      // Token should still be valid
      const result = await authService.verifyPasswordResetToken(token);
      expect(result.success).toBe(true);
    });
  });
});
