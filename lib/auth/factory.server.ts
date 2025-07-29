import 'server-only';

import { authDb } from './db.server';
import { DatabaseAuthProvider } from './providers/database';
import { SessionManager, DEFAULT_SECURITY_CONFIG } from './session-manager';

import type { AuthProvider } from './types';

/**
 * Create an auth service instance
 */
export function createAuthService(): AuthProvider {
  const sessionManager = new SessionManager(authDb, DEFAULT_SECURITY_CONFIG);
  return new DatabaseAuthProvider(authDb, sessionManager);
}

/**
 * Get or create singleton auth service
 */
export function getAuthService(): AuthProvider {
  if (!globalThis.__authService) {
    globalThis.__authService = createAuthService();
  }
  return globalThis.__authService;
}

/**
 * Singleton auth service instance
 */
export const authService = Promise.resolve(getAuthService());

// Global type declaration for singleton
declare global {
  var __authService: AuthProvider | undefined;
}
