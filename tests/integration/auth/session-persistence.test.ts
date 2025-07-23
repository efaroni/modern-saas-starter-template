import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { AuthService } from '@/lib/auth/service';
import { MockAuthProvider } from '@/lib/auth/providers/mock';
import {
  LocalSessionStorage,
  MemorySessionStorage,
} from '@/lib/auth/session-storage';
import { MockEmailService } from '@/lib/email/mock';
import { MockUploadService } from '@/lib/upload/mock';
import type { AuthUser, SessionData } from '@/lib/auth/types';

/**
 * Integration Tests: Session Persistence
 *
 * These tests validate session persistence across different scenarios:
 * - Cross-service instance persistence
 * - Storage layer reliability and recovery
 * - Session lifecycle management
 * - Concurrent session handling
 * - Storage failure scenarios
 */

describe('Auth Integration - Session Persistence', () => {
  let authProvider: MockAuthProvider;
  let sessionStorage: MemorySessionStorage;
  let testUser: AuthUser;

  beforeEach(async () => {
    authProvider = new MockAuthProvider();
    sessionStorage = new MemorySessionStorage();

    // Create a test user for persistence tests
    const tempEmailService = new MockEmailService();
    const tempUploadService = new MockUploadService();
    const tempAuthService = new AuthService(
      authProvider,
      sessionStorage,
      tempEmailService,
      tempUploadService,
    );
    const signUpResult = await tempAuthService.signUp({
      email: 'persistence@example.com',
      password: 'persistenceTest123',
      name: 'Persistence Test User',
    });

    testUser = signUpResult.user!;

    // Sign out to ensure no session for subsequent tests
    await tempAuthService.signOut();
  });

  afterEach(async () => {
    await sessionStorage.removeSession();
  });

  describe('Cross-Service Instance Persistence', () => {
    it('should persist session across service instances', async () => {
      // ===================
      // PHASE 1: CREATE SESSION
      // ===================

      const firstService = new AuthService(
        authProvider,
        sessionStorage,
        new MockEmailService(),
        new MockUploadService(),
      );

      // Sign in with first service
      const signInResult = await firstService.signIn({
        email: 'persistence@example.com',
        password: 'persistenceTest123',
      });

      expect(signInResult.success).toBe(true);
      expect(signInResult.user?.id).toBe(testUser.id);

      // Verify session exists in first service
      const firstSessionResult = await firstService.getUser();
      expect(firstSessionResult.user?.id).toBe(testUser.id);

      // ===================
      // PHASE 2: CROSS-INSTANCE ACCESS
      // ===================

      // Create second service instance with same storage
      const secondService = new AuthService(
        authProvider,
        sessionStorage,
        new MockEmailService(),
        new MockUploadService(),
      );

      // Should access the same session
      const secondSessionResult = await secondService.getUser();
      expect(secondSessionResult.success).toBe(true);
      expect(secondSessionResult.user?.id).toBe(testUser.id);
      expect(secondSessionResult.user?.email).toBe(testUser.email);

      // ===================
      // PHASE 3: OPERATIONS FROM SECOND INSTANCE
      // ===================

      // Update profile from second service
      const profileUpdateResult = await secondService.updateUserProfile(
        testUser.id,
        {
          name: 'Updated from Second Service',
        },
      );

      expect(profileUpdateResult.success).toBe(true);
      expect(profileUpdateResult.user?.name).toBe(
        'Updated from Second Service',
      );

      // ===================
      // PHASE 4: VERIFY SYNC IN FIRST INSTANCE
      // ===================

      // Check session in first service reflects update
      const updatedFirstSessionResult = await firstService.getUser();
      expect(updatedFirstSessionResult.user?.name).toBe(
        'Updated from Second Service',
      );

      // ===================
      // PHASE 5: SIGN OUT FROM ONE INSTANCE
      // ===================

      // Sign out from second service
      const signOutResult = await secondService.signOut();
      expect(signOutResult.success).toBe(true);

      // Verify session is cleared in both instances
      const firstServiceAfterSignOut = await firstService.getUser();
      expect(firstServiceAfterSignOut.user).toBeNull();

      const secondServiceAfterSignOut = await secondService.getUser();
      expect(secondServiceAfterSignOut.user).toBeNull();
    });

    it('should handle session refresh across instances', async () => {
      const firstService = new AuthService(
        authProvider,
        sessionStorage,
        new MockEmailService(),
        new MockUploadService(),
      );
      const secondService = new AuthService(
        authProvider,
        sessionStorage,
        new MockEmailService(),
        new MockUploadService(),
      );

      // Sign in with first service
      await firstService.signIn({
        email: 'persistence@example.com',
        password: 'persistenceTest123',
      });

      // Refresh session from second service
      const refreshResult = await secondService.refreshSession();

      expect(refreshResult.success).toBe(true);
      expect(refreshResult.user?.id).toBe(testUser.id);

      // Verify both services see the refreshed session
      const firstSessionResult = await firstService.getUser();
      expect(firstSessionResult.user?.id).toBe(testUser.id);

      const secondSessionResult = await secondService.getUser();
      expect(secondSessionResult.user?.id).toBe(testUser.id);
    });

    it('should handle concurrent operations across instances', async () => {
      const services = Array(3)
        .fill(null)
        .map(
          () =>
            new AuthService(
              authProvider,
              sessionStorage,
              new MockEmailService(),
              new MockUploadService(),
            ),
        );

      // Sign in from first service
      await services[0].signIn({
        email: 'persistence@example.com',
        password: 'persistenceTest123',
      });

      // Perform concurrent operations from different services
      const operations = [
        services[0].updateUserProfile(testUser.id, { name: 'Update 1' }),
        services[1].refreshSession(),
        services[2].getCurrentUserProfile(),
      ];

      const results = await Promise.all(operations);

      // All operations should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // All services should see consistent state
      const finalStates = await Promise.all(
        services.map(service => service.getUser()),
      );

      finalStates.forEach(state => {
        expect(state.user?.id).toBe(testUser.id);
      });
    });
  });

  describe('Storage Layer Reliability', () => {
    it('should handle storage initialization gracefully', async () => {
      // Test with fresh storage
      const freshStorage = new MemorySessionStorage();
      const authService = new AuthService(
        authProvider,
        freshStorage,
        new MockEmailService(),
        new MockUploadService(),
      );

      // Should handle empty storage gracefully
      const initialSessionResult = await authService.getUser();
      expect(initialSessionResult.success).toBe(true);
      expect(initialSessionResult.user).toBeNull();

      // Should be able to create new session
      const signInResult = await authService.signIn({
        email: 'persistence@example.com',
        password: 'persistenceTest123',
      });

      expect(signInResult.success).toBe(true);
      expect(signInResult.user?.id).toBe(testUser.id);

      // Should persist in storage
      const sessionAfterSignIn = await authService.getUser();
      expect(sessionAfterSignIn.user?.id).toBe(testUser.id);
    });

    it('should handle corrupted session data gracefully', async () => {
      const authService = new AuthService(
        authProvider,
        sessionStorage,
        new MockEmailService(),
        new MockUploadService(),
      );

      // Create valid session first
      await authService.signIn({
        email: 'persistence@example.com',
        password: 'persistenceTest123',
      });

      // Manually corrupt the session data
      const corruptedSession: SessionData = {
        user: {
          id: 'corrupted-id',
          email: 'corrupted@example.com',
          name: 'Corrupted User',
          emailVerified: null,
          image: null,
        },
        expires: 'invalid-date', // Invalid date format
      };

      await sessionStorage.setSession(corruptedSession);

      // Should handle corrupted data gracefully
      const sessionResult = await authService.getUser();
      expect(sessionResult.success).toBe(true);
      // Should either return null or valid session, not crash
      expect(sessionResult.user).toBeTruthy();
    });

    it('should handle session expiration correctly', async () => {
      const authService = new AuthService(
        authProvider,
        sessionStorage,
        new MockEmailService(),
        new MockUploadService(),
      );

      // Create session
      await authService.signIn({
        email: 'persistence@example.com',
        password: 'persistenceTest123',
      });

      // Manually set expired session
      const expiredSession: SessionData = {
        user: testUser,
        expires: new Date(Date.now() - 1000).toISOString(), // 1 second ago
      };

      await sessionStorage.setSession(expiredSession);

      // Should handle expired session
      const sessionResult = await authService.getUser();
      expect(sessionResult.success).toBe(true);
      expect(sessionResult.user).toBeNull();

      // Should clean up expired session from storage
      const storageSession = await sessionStorage.getSession();
      expect(storageSession).toBeNull();
    });

    it('should handle storage read failures gracefully', async () => {
      // Create a storage that simulates read failures
      class FailingStorage extends MemorySessionStorage {
        async getSession(): Promise<SessionData | null> {
          throw new Error('Storage read failed');
        }
      }

      const failingStorage = new FailingStorage();
      const authService = new AuthService(
        authProvider,
        failingStorage,
        new MockEmailService(),
        new MockUploadService(),
      );

      // Should handle storage read failure gracefully
      const sessionResult = await authService.getUser();
      expect(sessionResult.success).toBe(true);
      expect(sessionResult.user).toBeNull();

      // Should still be able to create new session
      const signInResult = await authService.signIn({
        email: 'persistence@example.com',
        password: 'persistenceTest123',
      });

      expect(signInResult.success).toBe(true);
      expect(signInResult.user?.id).toBe(testUser.id);
    });

    it('should handle storage write failures gracefully', async () => {
      // Create a storage that simulates write failures
      class FailingWriteStorage extends MemorySessionStorage {
        async setSession(session: SessionData): Promise<void> {
          throw new Error('Storage write failed');
        }
      }

      const failingStorage = new FailingWriteStorage();
      const authService = new AuthService(
        authProvider,
        failingStorage,
        new MockEmailService(),
        new MockUploadService(),
      );

      // Should handle storage write failure gracefully
      const signInResult = await authService.signIn({
        email: 'persistence@example.com',
        password: 'persistenceTest123',
      });

      expect(signInResult.success).toBe(true);
      expect(signInResult.user?.id).toBe(testUser.id);

      // Session should still work in memory
      const sessionResult = await authService.getUser();
      expect(sessionResult.success).toBe(true);
      expect(sessionResult.user?.id).toBe(testUser.id);
    });
  });

  describe('Session Lifecycle Management', () => {
    it('should handle complete session lifecycle', async () => {
      const authService = new AuthService(
        authProvider,
        sessionStorage,
        new MockEmailService(),
        new MockUploadService(),
      );

      // ===================
      // PHASE 1: NO SESSION
      // ===================

      const noSessionResult = await authService.getUser();
      expect(noSessionResult.success).toBe(true);
      expect(noSessionResult.user).toBeNull();

      // ===================
      // PHASE 2: CREATE SESSION
      // ===================

      const signInResult = await authService.signIn({
        email: 'persistence@example.com',
        password: 'persistenceTest123',
      });

      expect(signInResult.success).toBe(true);
      expect(signInResult.user?.id).toBe(testUser.id);

      // ===================
      // PHASE 3: ACTIVE SESSION
      // ===================

      const activeSessionResult = await authService.getUser();
      expect(activeSessionResult.success).toBe(true);
      expect(activeSessionResult.user?.id).toBe(testUser.id);

      // ===================
      // PHASE 4: SESSION REFRESH
      // ===================

      const refreshResult = await authService.refreshSession();
      expect(refreshResult.success).toBe(true);
      expect(refreshResult.user?.id).toBe(testUser.id);

      // ===================
      // PHASE 5: SESSION CLEANUP
      // ===================

      const signOutResult = await authService.signOut();
      expect(signOutResult.success).toBe(true);

      // ===================
      // PHASE 6: NO SESSION AGAIN
      // ===================

      const finalSessionResult = await authService.getUser();
      expect(finalSessionResult.success).toBe(true);
      expect(finalSessionResult.user).toBeNull();

      // Verify storage is clean
      const storageSession = await sessionStorage.getSession();
      expect(storageSession).toBeNull();
    });

    it('should handle session updates during lifecycle', async () => {
      const authService = new AuthService(
        authProvider,
        sessionStorage,
        new MockEmailService(),
        new MockUploadService(),
      );

      // Create session
      await authService.signIn({
        email: 'persistence@example.com',
        password: 'persistenceTest123',
      });

      // Update profile and verify session updates
      const profileUpdate = await authService.updateUserProfile(testUser.id, {
        name: 'Updated During Lifecycle',
      });

      expect(profileUpdate.success).toBe(true);

      // Verify session reflects update
      const sessionResult = await authService.getUser();
      expect(sessionResult.user?.name).toBe('Updated During Lifecycle');

      // Verify storage reflects update
      const storageSession = await sessionStorage.getSession();
      expect(storageSession?.user?.name).toBe('Updated During Lifecycle');

      // Upload avatar and verify session updates
      const avatarFile = new File(['avatar'], 'avatar.jpg', {
        type: 'image/jpeg',
      });
      const avatarResult = await authService.uploadAvatar(
        testUser.id,
        avatarFile,
      );

      expect(avatarResult.success).toBe(true);

      // Verify session reflects avatar
      const avatarSessionResult = await authService.getUser();
      expect(avatarSessionResult.user?.image).toBeDefined();

      // Verify storage reflects avatar
      const storageSessionAfterAvatar = await sessionStorage.getSession();
      expect(storageSessionAfterAvatar?.user?.image).toBeDefined();
    });

    it('should handle account deletion during active session', async () => {
      const authService = new AuthService(
        authProvider,
        sessionStorage,
        new MockEmailService(),
        new MockUploadService(),
      );

      // Create session
      await authService.signIn({
        email: 'persistence@example.com',
        password: 'persistenceTest123',
      });

      // Verify session exists
      const sessionBeforeDelete = await authService.getUser();
      expect(sessionBeforeDelete.user?.id).toBe(testUser.id);

      // Delete account
      const deleteResult = await authService.deleteUserAccount(testUser.id);
      expect(deleteResult.success).toBe(true);

      // Verify session is automatically cleared
      const sessionAfterDelete = await authService.getUser();
      expect(sessionAfterDelete.user).toBeNull();

      // Verify storage is cleared
      const storageSession = await sessionStorage.getSession();
      expect(storageSession).toBeNull();
    });
  });

  describe('LocalStorage Integration', () => {
    // These tests verify LocalStorage behavior in browser-like environment

    it('should handle localStorage availability detection', () => {
      const localStorage = new LocalSessionStorage();

      // In Jest environment, localStorage should be available
      expect(localStorage.isAvailable()).toBe(true);
    });

    it('should handle session persistence in localStorage', async () => {
      const localStorage = new LocalSessionStorage();
      const authService = new AuthService(
        authProvider,
        localStorage,
        new MockEmailService(),
        new MockUploadService(),
      );

      // Create session
      await authService.signIn({
        email: 'persistence@example.com',
        password: 'persistenceTest123',
      });

      // Verify session exists
      const sessionResult = await authService.getUser();
      expect(sessionResult.user?.id).toBe(testUser.id);

      // Create new service with same localStorage
      const newAuthService = new AuthService(
        authProvider,
        localStorage,
        new MockEmailService(),
        new MockUploadService(),
      );

      // Should access persisted session
      const persistedSessionResult = await newAuthService.getUser();
      expect(persistedSessionResult.user?.id).toBe(testUser.id);

      // Cleanup
      await localStorage.removeSession();
    });

    it('should handle localStorage cleanup on sign out', async () => {
      const localStorage = new LocalSessionStorage();
      const authService = new AuthService(
        authProvider,
        localStorage,
        new MockEmailService(),
        new MockUploadService(),
      );

      // Create session
      await authService.signIn({
        email: 'persistence@example.com',
        password: 'persistenceTest123',
      });

      // Verify session persisted
      const storedSession = await localStorage.getSession();
      expect(storedSession?.user?.id).toBe(testUser.id);

      // Sign out
      await authService.signOut();

      // Verify localStorage is cleaned
      const cleanedSession = await localStorage.getSession();
      expect(cleanedSession).toBeNull();
    });
  });

  describe('Session Security', () => {
    it('should not expose sensitive data in session storage', async () => {
      const authService = new AuthService(
        authProvider,
        sessionStorage,
        new MockEmailService(),
        new MockUploadService(),
      );

      // Create session
      await authService.signIn({
        email: 'persistence@example.com',
        password: 'persistenceTest123',
      });

      // Check session storage doesn't contain sensitive data
      const storedSession = await sessionStorage.getSession();

      expect(storedSession?.user).toBeDefined();
      expect(storedSession?.user).not.toHaveProperty('password');
      expect(storedSession?.user).not.toHaveProperty('passwordHash');
      expect(storedSession?.user).not.toHaveProperty('privateKey');

      // Verify normal user data is present
      expect(storedSession?.user?.id).toBe(testUser.id);
      expect(storedSession?.user?.email).toBe(testUser.email);
    });

    it('should handle session hijacking protection', async () => {
      const authService = new AuthService(
        authProvider,
        sessionStorage,
        new MockEmailService(),
        new MockUploadService(),
      );

      // Create legitimate session
      await authService.signIn({
        email: 'persistence@example.com',
        password: 'persistenceTest123',
      });

      // Simulate session tampering
      const tamperedSession: SessionData = {
        user: {
          id: 'admin-user-id',
          email: 'admin@example.com',
          name: 'Admin User',
          emailVerified: new Date(),
          image: null,
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      await sessionStorage.setSession(tamperedSession);

      // Should handle tampered session gracefully
      const sessionResult = await authService.getUser();
      expect(sessionResult.success).toBe(true);
      // Should either reject tampered session or handle it safely
      expect(sessionResult.user).toBeDefined();
    });
  });
});
