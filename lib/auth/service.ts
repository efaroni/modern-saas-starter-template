import { AuthProvider, AuthResult, SignInRequest, SignUpRequest, SessionData, AuthConfiguration, OAuthProvider, OAuthResult, UpdateProfileRequest, ChangePasswordRequest } from './types'

export class AuthService {
  private currentSession: SessionData | null = null

  constructor(private provider: AuthProvider) {}

  async signIn(credentials: SignInRequest): Promise<AuthResult> {
    const { email, password } = credentials

    // Validate inputs
    if (!email) {
      return {
        success: false,
        error: 'Email is required'
      }
    }

    if (!password) {
      return {
        success: false,
        error: 'Password is required'
      }
    }

    // Authenticate with provider
    const result = await this.provider.authenticateUser(email, password)

    if (result.success && result.user) {
      // Create session
      this.currentSession = {
        user: result.user,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      }
    }

    return result
  }

  async signUp(userData: SignUpRequest): Promise<AuthResult> {
    const result = await this.provider.createUser(userData)

    if (result.success && result.user) {
      // Create session for new user
      this.currentSession = {
        user: result.user,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
    }

    return result
  }

  async signOut(): Promise<AuthResult> {
    this.currentSession = null
    return {
      success: true
    }
  }

  async getUser(): Promise<AuthResult> {
    if (!this.currentSession) {
      return {
        success: true,
        user: null
      }
    }

    // Check if session is expired
    if (this.currentSession.expires && new Date(this.currentSession.expires) < new Date()) {
      this.currentSession = null
      return {
        success: true,
        user: null
      }
    }

    return {
      success: true,
      user: this.currentSession.user
    }
  }

  isConfigured(): boolean {
    return this.provider.isConfigured()
  }

  async signInWithOAuth(provider: string): Promise<OAuthResult> {
    const result = await this.provider.signInWithOAuth(provider)

    if (result.success && result.user) {
      // Create session for OAuth user
      this.currentSession = {
        user: result.user,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
    }

    return result
  }

  getAvailableOAuthProviders(): OAuthProvider[] {
    return this.provider.getAvailableOAuthProviders()
  }

  getConfiguration(): AuthConfiguration {
    return this.provider.getConfiguration()
  }

  async getUserProfile(id: string): Promise<AuthResult> {
    return this.provider.getUserById(id)
  }

  async getCurrentUserProfile(): Promise<AuthResult> {
    return this.getUser()
  }

  async updateUserProfile(id: string, data: UpdateProfileRequest): Promise<AuthResult> {
    const result = await this.provider.updateUser(id, data)
    
    // Update session if current user updated their profile
    if (result.success && result.user && this.currentSession?.user?.id === id) {
      this.currentSession.user = result.user
    }
    
    return result
  }

  async deleteUserAccount(id: string): Promise<AuthResult> {
    const result = await this.provider.deleteUser(id)
    
    // Clear session if current user deleted their account
    if (result.success && this.currentSession?.user?.id === id) {
      this.currentSession = null
    }
    
    return result
  }

  async verifyEmail(id: string): Promise<AuthResult> {
    const result = await this.provider.verifyUserEmail(id)
    
    // Update session if current user verified their email
    if (result.success && result.user && this.currentSession?.user?.id === id) {
      this.currentSession.user = result.user
    }
    
    return result
  }

  async changePassword(id: string, passwordData: ChangePasswordRequest): Promise<AuthResult> {
    return this.provider.changeUserPassword(
      id,
      passwordData.currentPassword,
      passwordData.newPassword
    )
  }
}