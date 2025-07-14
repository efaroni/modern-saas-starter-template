import { AuthService } from './service'
import { MockAuthProvider } from './providers/mock'
import { AuthProvider } from './types'

export function createAuthService(): AuthService {
  // For now, always use mock provider
  // In the future, we'll check environment variables to determine which provider to use
  const provider: AuthProvider = new MockAuthProvider()
  
  return new AuthService(provider)
}

export const authService = createAuthService()