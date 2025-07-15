import { AuthService } from './service'
import { MockAuthProvider } from './providers/mock'
import { AuthProvider } from './types'
import { createSessionStorage } from './session-storage'
import { emailService } from '@/lib/email/service'
import { uploadService } from '@/lib/upload/service'

export function createAuthService(): AuthService {
  // Use mock provider for testing and client-side, database provider for server-side only
  const isTestEnvironment = process.env.NODE_ENV === 'test'
  const isClientSide = typeof window !== 'undefined'
  
  let provider: AuthProvider
  
  if (isTestEnvironment || isClientSide) {
    provider = new MockAuthProvider()
  } else {
    // Only import database provider on server-side
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DatabaseAuthProvider } = require('./providers/database')
    provider = new DatabaseAuthProvider()
  }
  
  const sessionStorage = createSessionStorage()
  
  return new AuthService(provider, sessionStorage, emailService, uploadService)
}

export const authService = createAuthService()