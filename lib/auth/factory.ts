import { AuthService } from './service'
import { MockAuthProvider } from './providers/mock'
import { AuthProvider } from './types'
import { createSessionStorage } from './session-storage'
import { emailService } from '@/lib/email/service'
import { uploadService } from '@/lib/upload/service'

export function createAuthService(): AuthService {
  // Use appropriate provider based on environment
  const isTestEnvironment = process.env.NODE_ENV === 'test'
  const isClientSide = typeof window !== 'undefined'
  
  let provider: AuthProvider
  
  if (isClientSide) {
    // Use mock provider for client-side
    provider = new MockAuthProvider()
  } else if (isTestEnvironment) {
    // Use test database provider for server-side tests
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DatabaseTestAuthProvider } = require('./providers/database-test')
    provider = new DatabaseTestAuthProvider()
  } else {
    // Use full database provider for production server-side
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DatabaseAuthProvider } = require('./providers/database')
    provider = new DatabaseAuthProvider()
  }
  
  const sessionStorage = createSessionStorage()
  
  return new AuthService(provider, sessionStorage, emailService, uploadService)
}

export const authService = createAuthService()