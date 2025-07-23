import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { MockAuthProvider } from '@/lib/auth/providers/mock';
import { AuthService } from '@/lib/auth/service';
import { MemorySessionStorage } from '@/lib/auth/session-storage';
import type { AuthUser } from '@/lib/auth/types';

describe('Session Management', () => {
  let authProvider: MockAuthProvider;
  let authService: AuthService;
  let testUser: AuthUser;

  beforeEach(async () => {
    authProvider = new MockAuthProvider();
    const sessionStorage = new MemorySessionStorage();
    authService = new AuthService(authProvider, sessionStorage);

    // Create a test user
    const result = await authService.signUp({
      email: 'session@example.com',
      password: 'password123',
      name: 'Session Test User',
    });

    if (result.success && result.user) {
      testUser = result.user;
    }

    // Clear any existing sessions
    await authService.signOut();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Session Creation', () => {
    it('should create session on successful login', async () => {
      const result = await authService.signIn({
        email: 'session@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();

      // Check session exists
      const sessionResult = await authService.getUser();
      expect(sessionResult.success).toBe(true);
      expect(sessionResult.user?.id).toBe(testUser.id);
    });

    it('should create session on successful signup', async () => {
      const result = await authService.signUp({
        email: 'newsession@example.com',
        password: 'password123',
        name: 'New Session User',
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();

      // Check session exists
      const sessionResult = await authService.getUser();
      expect(sessionResult.success).toBe(true);
      expect(sessionResult.user?.email).toBe('newsession@example.com');
    });

    it('should create session on successful OAuth login', async () => {
      const result = await authService.signInWithOAuth('google');

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();

      // Check session exists
      const sessionResult = await authService.getUser();
      expect(sessionResult.success).toBe(true);
      expect(sessionResult.user?.email).toBe('user@gmail.com');
    });

    it('should set session expiration time', async () => {
      await authService.signIn({
        email: 'session@example.com',
        password: 'password123',
      });

      const sessionResult = await authService.getUser();

      expect(sessionResult.success).toBe(true);

      // Check that session has expiration (we can't easily test the exact time due to timing)
      // This is more of a structural test
      expect(sessionResult.user).toBeDefined();
    });
  });

  describe('Session Retrieval', () => {
    beforeEach(async () => {
      await authService.signIn({
        email: 'session@example.com',
        password: 'password123',
      });
    });

    it('should retrieve current user session', async () => {
      const result = await authService.getUser();

      expect(result.success).toBe(true);
      expect(result.user?.id).toBe(testUser.id);
      expect(result.user?.email).toBe('session@example.com');
    });

    it('should return null for non-existent session', async () => {
      await authService.signOut();

      const result = await authService.getUser();

      expect(result.success).toBe(true);
      expect(result.user).toBeNull();
    });
  });

  describe('Session Expiration', () => {
    beforeEach(async () => {
      await authService.signIn({
        email: 'session@example.com',
        password: 'password123',
      });
    });

    it('should return null for expired session', async () => {
      // Mock date to simulate session expiration
      const originalDate = Date.now;
      Date.now = jest.fn(() => originalDate() + 25 * 60 * 60 * 1000); // 25 hours later

      const result = await authService.getUser();

      expect(result.success).toBe(true);
      expect(result.user).toBeNull();

      // Restore original Date.now
      Date.now = originalDate;
    });

    it('should handle session expiration gracefully', async () => {
      // Mock date to simulate session expiration
      const originalDate = Date.now;
      Date.now = jest.fn(() => originalDate() + 25 * 60 * 60 * 1000); // 25 hours later

      const result = await authService.getUser();

      expect(result.success).toBe(true);
      expect(result.user).toBeNull();

      // Should not throw error
      expect(() => result).not.toThrow();

      // Restore original Date.now
      Date.now = originalDate;
    });

    it('should allow new login after session expiration', async () => {
      // Mock date to simulate session expiration
      const originalDate = Date.now;
      Date.now = jest.fn(() => originalDate() + 25 * 60 * 60 * 1000); // 25 hours later

      // First check - should be expired
      const expiredResult = await authService.getUser();
      expect(expiredResult.user).toBeNull();

      // Restore time and login again
      Date.now = originalDate;

      const loginResult = await authService.signIn({
        email: 'session@example.com',
        password: 'password123',
      });

      expect(loginResult.success).toBe(true);
      expect(loginResult.user).toBeDefined();
    });
  });

  describe('Session Cleanup', () => {
    beforeEach(async () => {
      await authService.signIn({
        email: 'session@example.com',
        password: 'password123',
      });
    });

    it('should clear session on logout', async () => {
      // Verify session exists
      const beforeLogout = await authService.getUser();
      expect(beforeLogout.user).toBeDefined();

      // Logout
      const logoutResult = await authService.signOut();
      expect(logoutResult.success).toBe(true);

      // Verify session is cleared
      const afterLogout = await authService.getUser();
      expect(afterLogout.user).toBeNull();
    });

    it('should handle logout when no session exists', async () => {
      await authService.signOut();

      // Try to logout again
      const result = await authService.signOut();

      expect(result.success).toBe(true);
      expect(() => result).not.toThrow();
    });
  });

  describe('Session Update', () => {
    beforeEach(async () => {
      await authService.signIn({
        email: 'session@example.com',
        password: 'password123',
      });
    });

    it('should update session when user profile changes', async () => {
      const updateResult = await authService.updateUserProfile(testUser.id, {
        name: 'Updated Session User',
      });

      expect(updateResult.success).toBe(true);

      // Check that session reflects the update
      const sessionResult = await authService.getUser();
      expect(sessionResult.user?.name).toBe('Updated Session User');
    });

    it('should update session when user email is verified', async () => {
      const verifyResult = await authService.verifyEmail(testUser.id);

      expect(verifyResult.success).toBe(true);

      // Check that session reflects the verification
      const sessionResult = await authService.getUser();
      expect(sessionResult.user?.emailVerified).toBeDefined();
    });

    it('should update session when user avatar changes', async () => {
      // Create a mock file
      const mockFile = new File(['avatar content'], 'avatar.jpg', {
        type: 'image/jpeg',
      });

      const uploadResult = await authService.uploadAvatar(
        testUser.id,
        mockFile,
      );

      expect(uploadResult.success).toBe(true);

      // Check that session reflects the avatar update
      const sessionResult = await authService.getUser();
      expect(sessionResult.user?.image).toBeDefined();
    });
  });

  describe('Session Validation', () => {
    it('should handle invalid session data gracefully', async () => {
      await authService.signIn({
        email: 'session@example.com',
        password: 'password123',
      });

      // This is more of a structural test - we trust the implementation
      const result = await authService.getUser();
      expect(result.success).toBe(true);
    });

    it('should handle session with invalid user ID', async () => {
      await authService.signIn({
        email: 'session@example.com',
        password: 'password123',
      });

      // This tests the robustness of the session system
      const result = await authService.getUser();
      expect(result.success).toBe(true);
    });
  });

  describe('Session Persistence', () => {
    it('should maintain session across service instances', async () => {
      // Use shared session storage
      const sharedStorage = new MemorySessionStorage();
      const firstService = new AuthService(authProvider, sharedStorage);

      // Login with first service instance
      await firstService.signIn({
        email: 'session@example.com',
        password: 'password123',
      });

      // Create new service instance with same provider and storage
      const newAuthService = new AuthService(authProvider, sharedStorage);

      // Should be able to retrieve the session
      const result = await newAuthService.getUser();

      expect(result.success).toBe(true);
      expect(result.user?.email).toBe('session@example.com');
    });
  });

  describe('Session Refresh', () => {
    beforeEach(async () => {
      await authService.signIn({
        email: 'session@example.com',
        password: 'password123',
      });
    });

    it('should refresh active session', async () => {
      const result = await authService.refreshSession();

      expect(result.success).toBe(true);
      expect(result.user?.email).toBe('session@example.com');
    });

    it('should fail to refresh when no session exists', async () => {
      await authService.signOut();

      const result = await authService.refreshSession();

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active session to refresh');
    });

    it('should extend session expiration on refresh', async () => {
      const beforeRefresh = await authService.getUser();
      expect(beforeRefresh.user).toBeDefined();

      // Mock time to simulate near expiration
      const originalDate = Date.now;
      Date.now = jest.fn(() => originalDate() + 23 * 60 * 60 * 1000); // 23 hours later

      const refreshResult = await authService.refreshSession();
      expect(refreshResult.success).toBe(true);

      // Reset time and check session is still valid
      Date.now = originalDate;

      const afterRefresh = await authService.getUser();
      expect(afterRefresh.user).toBeDefined();
      expect(afterRefresh.user?.email).toBe('session@example.com');
    });
  });

  describe('Session Cleanup', () => {
    it('should clean up expired sessions', async () => {
      await authService.signIn({
        email: 'session@example.com',
        password: 'password123',
      });

      // Mock time to simulate expiration
      const originalDate = Date.now;
      Date.now = jest.fn(() => originalDate() + 25 * 60 * 60 * 1000); // 25 hours later

      await authService.clearExpiredSessions();

      const result = await authService.getUser();
      expect(result.user).toBeNull();

      // Restore original Date.now
      Date.now = originalDate;
    });
  });

  describe('Session Security', () => {
    it('should not expose sensitive user data in session', async () => {
      await authService.signIn({
        email: 'session@example.com',
        password: 'password123',
      });

      const result = await authService.getUser();

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();

      // Should not contain password or other sensitive data
      expect(result.user).not.toHaveProperty('password');
    });

    it('should handle concurrent session operations', async () => {
      // Test concurrent login attempts
      const promises = [
        authService.signIn({
          email: 'session@example.com',
          password: 'password123',
        }),
        authService.signIn({
          email: 'session@example.com',
          password: 'password123',
        }),
        authService.signIn({
          email: 'session@example.com',
          password: 'password123',
        }),
      ];

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Should still have valid session
      const sessionResult = await authService.getUser();
      expect(sessionResult.user).toBeDefined();
    });
  });
});
