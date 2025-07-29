import { emailService } from '@/lib/email/service';
import { uploadService } from '@/lib/upload/service';

import { AuthService } from './service';
import { createSessionStorage } from './session-storage';
import { type AuthProvider } from './types';

export async function createAuthService(): Promise<AuthService> {
  // Use appropriate provider based on environment
  const isTestEnvironment = process.env.NODE_ENV === 'test';
  const isClientSide = typeof window !== 'undefined';

  let provider: AuthProvider;

  if (isClientSide) {
    // Use mock provider for client-side
    const { MockAuthProvider } = await import('./providers/mock');
    provider = new MockAuthProvider();
  } else if (isTestEnvironment) {
    // Use test database provider for server-side tests
    const { DatabaseTestAuthProvider } = await import(
      './providers/database-test'
    );
    provider = new DatabaseTestAuthProvider();
  } else {
    // Use full database provider for production server-side
    const { DatabaseAuthProvider } = await import('./providers/database');
    provider = new DatabaseAuthProvider();
  }

  const sessionStorage = createSessionStorage();

  return new AuthService(provider, sessionStorage, emailService, uploadService);
}

// Create auth service instance - will be initialized lazily
let _authService: AuthService | null = null;
let _authServicePromise: Promise<AuthService> | null = null;

export function getAuthService(): Promise<AuthService> {
  // Return existing promise if already initializing
  if (_authServicePromise) {
    return _authServicePromise;
  }

  // Return cached instance if already initialized
  if (_authService) {
    return Promise.resolve(_authService);
  }

  // Initialize and cache the promise
  _authServicePromise = createAuthService().then(service => {
    _authService = service;
    return service;
  });

  return _authServicePromise;
}

// For backward compatibility, export a promise that resolves to the service
export const authService = getAuthService();
