import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  LocalSessionStorage,
  MemorySessionStorage,
} from '@/lib/auth/session-storage';
import type { SessionData } from '@/lib/auth/types';

describe('Session Storage', () => {
  const testSession: SessionData = {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      image: null,
      emailVerified: new Date(),
    },
    expires: new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString(), // 24 hours from now
  };

  describe('MemorySessionStorage', () => {
    let storage: MemorySessionStorage;

    beforeEach(() => {
      storage = new MemorySessionStorage();
    });

    it('should be available', () => {
      expect(storage.isAvailable()).toBe(true);
    });

    it('should store and retrieve session', async () => {
      await storage.setSession(testSession);
      const retrieved = await storage.getSession();

      expect(retrieved).toEqual(testSession);
    });

    it('should return null when no session exists', async () => {
      const retrieved = await storage.getSession();

      expect(retrieved).toBeNull();
    });

    it('should remove session', async () => {
      await storage.setSession(testSession);
      await storage.removeSession();

      const retrieved = await storage.getSession();
      expect(retrieved).toBeNull();
    });

    it('should handle expired sessions', async () => {
      const expiredSession: SessionData = {
        ...testSession,
        expires: new Date(Date.now() - 1000).toISOString(), // 1 second ago
      };

      await storage.setSession(expiredSession);
      const retrieved = await storage.getSession();

      expect(retrieved).toBeNull();
    });
  });

  describe('LocalSessionStorage', () => {
    let storage: LocalSessionStorage;

    beforeEach(() => {
      storage = new LocalSessionStorage();
      // Clear any existing localStorage data
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.clear();
      }
    });

    afterEach(() => {
      // Clean up after each test
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.clear();
      }
    });

    it('should detect availability correctly', () => {
      // In Node.js test environment, localStorage might not be available
      // This test verifies the availability check works
      const available = storage.isAvailable();
      expect(typeof available).toBe('boolean');
    });

    it('should handle localStorage not available gracefully', async () => {
      // This test verifies localStorage availability handling
      await storage.setSession(testSession);
      const retrieved = await storage.getSession();

      // Should handle gracefully whether localStorage is available or not
      if (storage.isAvailable()) {
        expect(retrieved).toBeDefined();
        expect(retrieved?.user?.email).toBe(testSession.user?.email);
        expect(retrieved?.user?.id).toBe(testSession.user?.id);
        expect(retrieved?.expires).toBe(testSession.expires);
      } else {
        expect(retrieved).toBeNull();
      }
    });

    it('should handle corrupted session data', async () => {
      if (storage.isAvailable()) {
        // Manually corrupt the localStorage data
        localStorage.setItem('auth_session', 'invalid-json');

        const retrieved = await storage.getSession();

        expect(retrieved).toBeNull();
        // Should also clean up the corrupted data
        expect(localStorage.getItem('auth_session')).toBeNull();
      }
    });
  });

  describe('Session Storage Factory', () => {
    it('should create appropriate storage based on environment', async () => {
      // This is more of a structural test
      // The factory should return a storage instance
      const { createSessionStorage } = await import(
        '@/lib/auth/session-storage'
      );
      const storage = createSessionStorage();

      expect(storage).toBeDefined();
      expect(storage.isAvailable()).toBe(true);
    });
  });
});
