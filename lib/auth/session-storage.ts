import { encrypt, decrypt } from '@/lib/encryption';

import type { SessionData } from './types';

export interface SessionStorage {
  getSession(): Promise<SessionData | null>
  setSession(session: SessionData): Promise<void>
  removeSession(): Promise<void>
  isAvailable(): boolean
}

export class LocalSessionStorage implements SessionStorage {
  private readonly key = 'auth_session';

  isAvailable(): boolean {
    try {
      return typeof window !== 'undefined' && window.localStorage !== undefined;
    } catch {
      return false;
    }
  }

  async getSession(): Promise<SessionData | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const encryptedSessionData = localStorage.getItem(this.key);
      if (!encryptedSessionData) {
        return null;
      }

      // Decrypt the session data before parsing
      const sessionData = decrypt(encryptedSessionData);
      const session = JSON.parse(sessionData) as SessionData;

      // Restore Date objects from JSON serialization
      if (session.user?.emailVerified && typeof session.user.emailVerified === 'string') {
        session.user.emailVerified = new Date(session.user.emailVerified);
      }

      // Check if session is expired
      if (session.expires && new Date(session.expires).getTime() < Date.now()) {
        await this.removeSession();
        return null;
      }

      return session;
    } catch {
      // If parsing fails, remove the corrupted session
      await this.removeSession();
      return null;
    }
  }

  async setSession(session: SessionData): Promise<void> {
    if (!this.isAvailable()) {
      return;
    }

    try {
      // Encrypt the session data before storing
      const sessionData = JSON.stringify(session);
      const encryptedSessionData = encrypt(sessionData);
      localStorage.setItem(this.key, encryptedSessionData);
    } catch {
      // Storage might be full or disabled, fail silently
    }
  }

  async removeSession(): Promise<void> {
    if (!this.isAvailable()) {
      return;
    }

    try {
      localStorage.removeItem(this.key);
    } catch {
      // Fail silently
    }
  }
}

export class MemorySessionStorage implements SessionStorage {
  private session: SessionData | null = null;

  isAvailable(): boolean {
    return true;
  }

  async getSession(): Promise<SessionData | null> {
    // Check if session is expired
    if (this.session?.expires && new Date(this.session.expires).getTime() < Date.now()) {
      this.session = null;
      return null;
    }

    return this.session;
  }

  async setSession(session: SessionData): Promise<void> {
    this.session = session;
  }

  async removeSession(): Promise<void> {
    this.session = null;
  }
}

export function createSessionStorage(): SessionStorage {
  // Use localStorage if available, otherwise fall back to memory
  const localStorage = new LocalSessionStorage();
  if (localStorage.isAvailable()) {
    return localStorage;
  }

  return new MemorySessionStorage();
}