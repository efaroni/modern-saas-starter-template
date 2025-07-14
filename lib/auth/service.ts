import { AuthProvider, AuthResult, SignInRequest, SignUpRequest, SessionData, AuthConfiguration, OAuthProvider, OAuthResult, UpdateProfileRequest, ChangePasswordRequest, AvatarUploadResult } from './types'
import { uploadService } from '@/lib/upload/service'

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

  async uploadAvatar(id: string, file: File): Promise<AvatarUploadResult> {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: 'Invalid file type. Only images are allowed.'
      }
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return {
        success: false,
        error: 'File too large. Maximum size is 5MB.'
      }
    }

    // Get current user to check for existing avatar
    const currentUser = await this.provider.getUserById(id)
    if (!currentUser.success || !currentUser.user) {
      return {
        success: false,
        error: 'User not found'
      }
    }

    // Upload new avatar
    const uploadResult = await uploadService.uploadFile(file, 'avatars')
    if (!uploadResult.success) {
      return {
        success: false,
        error: uploadResult.error
      }
    }

    // Delete old avatar if it exists
    if (currentUser.user.image) {
      await uploadService.deleteFile(currentUser.user.image)
      // We don't fail the upload if deletion fails
    }

    // Update user profile with new avatar URL
    const updateResult = await this.provider.updateUser(id, {
      image: uploadResult.url
    })

    if (updateResult.success && updateResult.user && this.currentSession?.user?.id === id) {
      this.currentSession.user = updateResult.user
    }

    return {
      success: updateResult.success,
      user: updateResult.user,
      error: updateResult.error
    }
  }

  async deleteAvatar(id: string): Promise<AuthResult> {
    // Get current user
    const currentUser = await this.provider.getUserById(id)
    if (!currentUser.success || !currentUser.user) {
      return {
        success: false,
        error: 'User not found'
      }
    }

    // Check if user has an avatar
    if (!currentUser.user.image) {
      return {
        success: false,
        error: 'User has no avatar to delete'
      }
    }

    // Delete the avatar file
    const deleteResult = await uploadService.deleteFile(currentUser.user.image)
    if (!deleteResult.success) {
      return {
        success: false,
        error: deleteResult.error
      }
    }

    // Update user profile to remove avatar URL
    const updateResult = await this.provider.updateUser(id, {
      image: null
    })

    if (updateResult.success && updateResult.user && this.currentSession?.user?.id === id) {
      this.currentSession.user = updateResult.user
    }

    return updateResult
  }

  generateAvatarUrl(userId: string, extension: string): string {
    return uploadService.generateUrl('avatars', `${userId}.${extension}`)
  }
}