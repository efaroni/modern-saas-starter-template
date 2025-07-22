import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { AuthService } from '@/lib/auth/service';
import { MockAuthProvider } from '@/lib/auth/providers/mock';
import { MemorySessionStorage } from '@/lib/auth/session-storage';
import { MockEmailService } from '@/lib/email/mock';
import { MockUploadService } from '@/lib/upload/mock';
import type { AuthUser } from '@/lib/auth/types';

/**
 * Integration Tests: Complete Auth User Workflows
 *
 * These tests follow the integration testing strategy:
 * - Focus on critical paths and boundaries
 * - Test realistic data flows
 * - Validate contracts between components
 * - Test complete workflows, not individual methods
 * - Use transaction-based isolation for speed
 */

describe('Auth Integration - Complete User Workflows', () => {
  let authService: AuthService;
  let authProvider: MockAuthProvider;
  let sessionStorage: MemorySessionStorage;
  let emailService: MockEmailService;
  let uploadService: MockUploadService;

  beforeEach(() => {
    // Fresh instances for each test (transaction-like isolation)
    authProvider = new MockAuthProvider();
    sessionStorage = new MemorySessionStorage();
    emailService = new MockEmailService();
    uploadService = new MockUploadService();

    authService = new AuthService(
      authProvider,
      sessionStorage,
      emailService,
      uploadService,
    );

    // Clear any residual state
    emailService.clearSentEmails();
    uploadService.clearUploadedFiles();
  });

  afterEach(() => {
    // Cleanup after each test
    sessionStorage.removeSession();
    emailService.clearSentEmails();
    uploadService.clearUploadedFiles();
  });

  describe('Complete User Registration and Setup Workflow', () => {
    const testUserData = {
      email: 'integration@example.com',
      password: 'integrationTest123',
      name: 'Integration Test User',
    };

    it('should complete full user registration and setup workflow', async () => {
      // ===================
      // PHASE 1: REGISTRATION
      // ===================

      // Step 1: User signs up
      const signUpResult = await authService.signUp(testUserData);

      expect(signUpResult.success).toBe(true);
      expect(signUpResult.user).toBeDefined();
      expect(signUpResult.user!.email).toBe(testUserData.email);
      expect(signUpResult.user!.name).toBe(testUserData.name);
      expect(signUpResult.user!.emailVerified).toBeNull(); // Not verified yet

      const userId = signUpResult.user!.id;

      // Step 2: Verify session was created
      const sessionResult = await authService.getUser();
      expect(sessionResult.success).toBe(true);
      expect(sessionResult.user?.id).toBe(userId);

      // ===================
      // PHASE 2: PROFILE SETUP
      // ===================

      // Step 3: User updates their profile
      const profileUpdateResult = await authService.updateUserProfile(userId, {
        name: 'Updated Integration User',
      });

      expect(profileUpdateResult.success).toBe(true);
      expect(profileUpdateResult.user!.name).toBe('Updated Integration User');

      // Step 4: Verify session reflects profile update
      const updatedSessionResult = await authService.getUser();
      expect(updatedSessionResult.user?.name).toBe('Updated Integration User');

      // Step 5: User verifies their email
      const emailVerificationResult = await authService.verifyEmail(userId);

      expect(emailVerificationResult.success).toBe(true);
      expect(emailVerificationResult.user!.emailVerified).toBeDefined();

      // Step 6: Verify session reflects email verification
      const verifiedSessionResult = await authService.getUser();
      expect(verifiedSessionResult.user?.emailVerified).toBeDefined();

      // ===================
      // PHASE 3: AVATAR UPLOAD
      // ===================

      // Step 7: User uploads avatar
      const avatarFile = new File(['avatar content'], 'avatar.jpg', {
        type: 'image/jpeg',
      });
      const avatarUploadResult = await authService.uploadAvatar(
        userId,
        avatarFile,
      );

      expect(avatarUploadResult.success).toBe(true);
      expect(avatarUploadResult.user!.image).toBeDefined();

      // Step 8: Verify session reflects avatar upload
      const avatarSessionResult = await authService.getUser();
      expect(avatarSessionResult.user?.image).toBeDefined();

      // ===================
      // PHASE 4: SECURITY OPERATIONS
      // ===================

      // Step 9: User changes password
      const passwordChangeResult = await authService.changePassword(userId, {
        currentPassword: testUserData.password,
        newPassword: 'newIntegrationPassword123',
      });

      expect(passwordChangeResult.success).toBe(true);

      // Step 10: Verify old password no longer works
      await authService.signOut();

      const oldPasswordResult = await authService.signIn({
        email: testUserData.email,
        password: testUserData.password,
      });

      expect(oldPasswordResult.success).toBe(false);
      expect(oldPasswordResult.error).toBe('Invalid credentials');

      // Step 11: Verify new password works
      const newPasswordResult = await authService.signIn({
        email: testUserData.email,
        password: 'newIntegrationPassword123',
      });

      expect(newPasswordResult.success).toBe(true);
      expect(newPasswordResult.user?.id).toBe(userId);

      // ===================
      // PHASE 5: FINAL VERIFICATION
      // ===================

      // Step 12: Verify complete user state
      const finalUser = await authService.getUser();
      expect(finalUser.success).toBe(true);
      expect(finalUser.user).toMatchObject({
        id: userId,
        email: testUserData.email,
        name: 'Updated Integration User',
        emailVerified: expect.any(Date),
        image: expect.any(String),
      });

      // Step 13: Verify no sensitive data is exposed
      expect(finalUser.user).not.toHaveProperty('password');
      expect(finalUser.user).not.toHaveProperty('passwordHash');
    });
  });

  describe('Complete Password Reset Workflow', () => {
    let testUser: AuthUser;

    beforeEach(async () => {
      // Setup: Create and sign in user
      const signUpResult = await authService.signUp({
        email: 'reset@example.com',
        password: 'originalPassword123',
        name: 'Reset Test User',
      });

      testUser = signUpResult.user!;
      await authService.signOut(); // Start workflow logged out
    });

    it('should complete full password reset workflow', async () => {
      // ===================
      // PHASE 1: INITIATE RESET
      // ===================

      // Step 1: User requests password reset
      const resetRequestResult = await authService.requestPasswordReset(
        testUser.email,
      );

      expect(resetRequestResult.success).toBe(true);

      // Step 2: Verify reset email was sent
      const sentEmails = emailService.getSentEmails();
      expect(sentEmails).toHaveLength(1);
      expect(sentEmails[0].to).toBe(testUser.email);
      expect(sentEmails[0].data.resetToken).toBeDefined();
      expect(sentEmails[0].data.resetUrl).toContain('reset-password');

      const resetToken = sentEmails[0].data.resetToken;

      // ===================
      // PHASE 2: VALIDATE TOKEN
      // ===================

      // Step 3: Verify reset token is valid
      const tokenVerificationResult =
        await authService.verifyPasswordResetToken(resetToken);

      expect(tokenVerificationResult.success).toBe(true);
      expect(tokenVerificationResult.user?.email).toBe(testUser.email);

      // ===================
      // PHASE 3: COMPLETE RESET
      // ===================

      // Step 4: User completes password reset
      const newPassword = 'newResetPassword123';
      const resetCompletionResult = await authService.resetPassword(
        resetToken,
        newPassword,
      );

      expect(resetCompletionResult.success).toBe(true);
      expect(resetCompletionResult.user?.id).toBe(testUser.id);

      // Step 5: Verify token is now invalid (single use)
      const tokenRevalidationResult =
        await authService.verifyPasswordResetToken(resetToken);

      expect(tokenRevalidationResult.success).toBe(false);
      expect(tokenRevalidationResult.error).toBe(
        'Invalid or expired reset token',
      );

      // ===================
      // PHASE 4: VERIFY NEW PASSWORD
      // ===================

      // Step 6: Verify old password no longer works
      const oldPasswordResult = await authService.signIn({
        email: testUser.email,
        password: 'originalPassword123',
      });

      expect(oldPasswordResult.success).toBe(false);
      expect(oldPasswordResult.error).toBe('Invalid credentials');

      // Step 7: Verify new password works
      const newPasswordResult = await authService.signIn({
        email: testUser.email,
        password: newPassword,
      });

      expect(newPasswordResult.success).toBe(true);
      expect(newPasswordResult.user?.id).toBe(testUser.id);

      // Step 8: Verify user can perform authenticated actions
      const userResult = await authService.getUser();
      expect(userResult.success).toBe(true);
      expect(userResult.user?.id).toBe(testUser.id);
    });
  });

  describe('Complete OAuth Integration Workflow', () => {
    it('should complete OAuth sign-in workflow', async () => {
      // ===================
      // PHASE 1: OAUTH SETUP
      // ===================

      // Step 1: Get available OAuth providers
      const availableProviders = authService.getAvailableOAuthProviders();

      expect(availableProviders).toHaveLength(2);
      expect(availableProviders.map(p => p.id)).toContain('google');
      expect(availableProviders.map(p => p.id)).toContain('github');

      // ===================
      // PHASE 2: OAUTH SIGN-IN
      // ===================

      // Step 2: User signs in with OAuth (Google)
      const oauthResult = await authService.signInWithOAuth('google');

      expect(oauthResult.success).toBe(true);
      expect(oauthResult.user).toBeDefined();
      expect(oauthResult.user!.email).toBe('user@gmail.com');
      expect(oauthResult.user!.emailVerified).toBeDefined(); // OAuth users are auto-verified

      const oauthUserId = oauthResult.user!.id;

      // Step 3: Verify session was created
      const sessionResult = await authService.getUser();
      expect(sessionResult.success).toBe(true);
      expect(sessionResult.user?.id).toBe(oauthUserId);

      // ===================
      // PHASE 3: POST-OAUTH OPERATIONS
      // ===================

      // Step 4: User can update profile (OAuth user becomes regular user)
      const profileUpdateResult = await authService.updateUserProfile(
        oauthUserId,
        {
          name: 'Updated OAuth User',
        },
      );

      expect(profileUpdateResult.success).toBe(true);
      expect(profileUpdateResult.user!.name).toBe('Updated OAuth User');

      // Step 5: Verify session reflects update
      const updatedSessionResult = await authService.getUser();
      expect(updatedSessionResult.user?.name).toBe('Updated OAuth User');

      // ===================
      // PHASE 4: CROSS-PROVIDER VALIDATION
      // ===================

      // Step 6: Sign out and try different OAuth provider
      await authService.signOut();

      const githubResult = await authService.signInWithOAuth('github');

      expect(githubResult.success).toBe(true);
      expect(githubResult.user!.email).toBe('user@github.com');
      expect(githubResult.user!.id).not.toBe(oauthUserId); // Different user

      // Step 7: Verify session switched to new user
      const newSessionResult = await authService.getUser();
      expect(newSessionResult.user?.email).toBe('user@github.com');
      expect(newSessionResult.user?.id).not.toBe(oauthUserId);
    });
  });

  describe('Complete Session Management Workflow', () => {
    let testUser: AuthUser;

    beforeEach(async () => {
      const signUpResult = await authService.signUp({
        email: 'session@example.com',
        password: 'sessionTest123',
        name: 'Session Test User',
      });

      testUser = signUpResult.user!;
    });

    it('should complete session lifecycle workflow', async () => {
      // ===================
      // PHASE 1: SESSION CREATION
      // ===================

      // Step 1: Verify session exists after signup
      const initialSessionResult = await authService.getUser();
      expect(initialSessionResult.success).toBe(true);
      expect(initialSessionResult.user?.id).toBe(testUser.id);

      // ===================
      // PHASE 2: SESSION PERSISTENCE
      // ===================

      // Step 2: Create new service instance (simulates page refresh)
      const newAuthService = new AuthService(
        authProvider,
        sessionStorage,
        emailService,
        uploadService,
      );

      // Step 3: Verify session persists across instances
      const persistedSessionResult = await newAuthService.getUser();
      expect(persistedSessionResult.success).toBe(true);
      expect(persistedSessionResult.user?.id).toBe(testUser.id);

      // ===================
      // PHASE 3: SESSION REFRESH
      // ===================

      // Step 4: Refresh session to extend lifetime
      const refreshResult = await newAuthService.refreshSession();

      expect(refreshResult.success).toBe(true);
      expect(refreshResult.user?.id).toBe(testUser.id);

      // Step 5: Verify session is still valid after refresh
      const refreshedSessionResult = await newAuthService.getUser();
      expect(refreshedSessionResult.success).toBe(true);
      expect(refreshedSessionResult.user?.id).toBe(testUser.id);

      // ===================
      // PHASE 4: SESSION CLEANUP
      // ===================

      // Step 6: Sign out and verify session is cleared
      const signOutResult = await newAuthService.signOut();
      expect(signOutResult.success).toBe(true);

      // Step 7: Verify session no longer exists
      const clearedSessionResult = await newAuthService.getUser();
      expect(clearedSessionResult.success).toBe(true);
      expect(clearedSessionResult.user).toBeNull();

      // Step 8: Verify session is also cleared in original service
      const originalServiceResult = await authService.getUser();
      expect(originalServiceResult.success).toBe(true);
      expect(originalServiceResult.user).toBeNull();
    });
  });

  describe('Complete User Account Deletion Workflow', () => {
    let testUser: AuthUser;

    beforeEach(async () => {
      const signUpResult = await authService.signUp({
        email: 'deletion@example.com',
        password: 'deletionTest123',
        name: 'Deletion Test User',
      });

      testUser = signUpResult.user!;

      // Add some user data
      await authService.updateUserProfile(testUser.id, {
        name: 'Updated Deletion User',
      });

      const avatarFile = new File(['avatar'], 'avatar.jpg', {
        type: 'image/jpeg',
      });
      await authService.uploadAvatar(testUser.id, avatarFile);
    });

    it('should complete account deletion workflow with cleanup', async () => {
      // ===================
      // PHASE 1: PRE-DELETION VERIFICATION
      // ===================

      // Step 1: Verify user exists and has data
      const preDeleteUser = await authService.getUser();
      expect(preDeleteUser.success).toBe(true);
      expect(preDeleteUser.user?.id).toBe(testUser.id);
      expect(preDeleteUser.user?.name).toBe('Updated Deletion User');
      expect(preDeleteUser.user?.image).toBeDefined();

      // ===================
      // PHASE 2: ACCOUNT DELETION
      // ===================

      // Step 2: Delete user account
      const deletionResult = await authService.deleteUserAccount(testUser.id);

      expect(deletionResult.success).toBe(true);

      // Step 3: Verify session was automatically cleared
      const sessionAfterDeletion = await authService.getUser();
      expect(sessionAfterDeletion.success).toBe(true);
      expect(sessionAfterDeletion.user).toBeNull();

      // ===================
      // PHASE 3: POST-DELETION VERIFICATION
      // ===================

      // Step 4: Verify user can no longer sign in
      const signInResult = await authService.signIn({
        email: 'deletion@example.com',
        password: 'deletionTest123',
      });

      expect(signInResult.success).toBe(false);
      expect(signInResult.error).toBe('Invalid credentials');

      // Step 5: Verify user data is no longer accessible
      const userLookupResult = await authService.getCurrentUserProfile();
      expect(userLookupResult.success).toBe(true);
      expect(userLookupResult.user).toBeNull();
    });
  });
});
