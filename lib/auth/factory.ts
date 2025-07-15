import { AuthService } from './service'
import { MockAuthProvider } from './providers/mock'
import { AuthProvider } from './types'
import { createSessionStorage } from './session-storage'
import { emailService } from '@/lib/email/service'
import { uploadService } from '@/lib/upload/service'

export function createAuthService(): AuthService {
  // For now, always use mock provider
  // In the future, we'll check environment variables to determine which provider to use
  const provider: AuthProvider = new MockAuthProvider()
  const sessionStorage = createSessionStorage()
  
  return new AuthService(provider, sessionStorage, emailService, uploadService)
}

export const authService = createAuthService()