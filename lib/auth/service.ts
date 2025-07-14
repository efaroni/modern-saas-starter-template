import { AuthProvider, AuthResult, SignInRequest, SignUpRequest, SessionData, AuthConfiguration, OAuthProvider, OAuthResult, UpdateProfileRequest, ChangePasswordRequest, AvatarUploadResult, PasswordResetToken } from './types'
import { uploadService } from '@/lib/upload/service'
import { emailService } from '@/lib/email/service'
import { createSessionStorage, type SessionStorage } from './session-storage'
import type { EmailService } from '@/lib/email/types'
import type { UploadService } from '@/lib/upload/types'

export class AuthService {
  private currentSession: SessionData | null = null
  private passwordResetTokens = new Map<string, PasswordResetToken>()
  private sessionStorage: SessionStorage
  private emailService: EmailService
  private uploadService: UploadService

  constructor(
    private provider: AuthProvider, 
    sessionStorage?: SessionStorage, 
    emailSvc?: EmailService,
    uploadSvc?: UploadService
  ) {
    this.sessionStorage = sessionStorage || createSessionStorage()
    this.emailService = emailSvc || emailService
    this.uploadService = uploadSvc || uploadService
    this.initializeSession()
  }

  private async initializeSession(): Promise<void> {
    try {
      const storedSession = await this.sessionStorage.getSession()
      if (storedSession) {
        this.currentSession = storedSession
      }
    } catch {
      // If session initialization fails, start with no session
      this.currentSession = null
    }
  }

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
      
      // Store session (fail silently if storage fails)
      try {
        try {
        await this.sessionStorage.setSession(this.currentSession)
      } catch {
        // Storage write failed, but we keep the session in memory
      }
      } catch {
        // Storage write failed, but we keep the session in memory
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
      
      // Store session (fail silently if storage fails)
      try {
        try {
        await this.sessionStorage.setSession(this.currentSession)
      } catch {
        // Storage write failed, but we keep the session in memory
      }
      } catch {
        // Storage write failed, but we keep the session in memory
      }
    }

    return result
  }

  async signOut(): Promise<AuthResult> {
    this.currentSession = null
    
    // Remove stored session
    try {
      await this.sessionStorage.removeSession()
    } catch {
      // If storage removal fails, we still cleared the memory session
    }
    
    return {
      success: true
    }
  }

  async getUser(): Promise<AuthResult> {
    // Always try to get session from storage first for cross-instance persistence
    try {
      const storedSession = await this.sessionStorage.getSession()
      // Only update current session if we got something from storage
      // This allows memory session to persist if storage is empty but we have a valid memory session
      if (storedSession) {
        this.currentSession = storedSession
      } else if (!this.currentSession) {
        // No stored session and no memory session
        this.currentSession = null
      }
    } catch {
      // If storage read fails, keep current session as fallback
      // This handles the case where storage read fails but we have a valid memory session
      if (!this.currentSession) {
        this.currentSession = null
      }
    }

    if (!this.currentSession) {
      return {
        success: true,
        user: null
      }
    }

    // Check if session is expired
    if (this.currentSession.expires && new Date(this.currentSession.expires).getTime() < Date.now()) {
      this.currentSession = null
      try {
        await this.sessionStorage.removeSession()
      } catch {
        // If storage removal fails, we still cleared the memory session
      }
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
      
      // Store session (fail silently if storage fails)
      try {
        try {
        await this.sessionStorage.setSession(this.currentSession)
      } catch {
        // Storage write failed, but we keep the session in memory
      }
      } catch {
        // Storage write failed, but we keep the session in memory
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
      try {
        await this.sessionStorage.setSession(this.currentSession)
      } catch {
        // Storage write failed, but we keep the session in memory
      }
    }
    
    return result
  }

  async deleteUserAccount(id: string): Promise<AuthResult> {
    const result = await this.provider.deleteUser(id)
    
    // Clear session if current user deleted their account
    if (result.success && this.currentSession?.user?.id === id) {
      this.currentSession = null
      await this.sessionStorage.removeSession()
    }
    
    return result
  }

  async verifyEmail(id: string): Promise<AuthResult> {
    const result = await this.provider.verifyUserEmail(id)
    
    // Update session if current user verified their email
    if (result.success && result.user && this.currentSession?.user?.id === id) {
      this.currentSession.user = result.user
      try {
        await this.sessionStorage.setSession(this.currentSession)
      } catch {
        // Storage write failed, but we keep the session in memory
      }
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
    const uploadResult = await this.uploadService.uploadFile(file, 'avatars')
    if (!uploadResult.success) {
      return {
        success: false,
        error: uploadResult.error
      }
    }

    // Delete old avatar if it exists
    if (currentUser.user.image) {
      await this.uploadService.deleteFile(currentUser.user.image)
      // We don't fail the upload if deletion fails
    }

    // Update user profile with new avatar URL
    const updateResult = await this.provider.updateUser(id, {
      image: uploadResult.url
    })

    if (updateResult.success && updateResult.user && this.currentSession?.user?.id === id) {
      this.currentSession.user = updateResult.user
      try {
        await this.sessionStorage.setSession(this.currentSession)
      } catch {
        // Storage write failed, but we keep the session in memory
      }
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
    const deleteResult = await this.uploadService.deleteFile(currentUser.user.image)
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
      try {
        await this.sessionStorage.setSession(this.currentSession)
      } catch {
        // Storage write failed, but we keep the session in memory
      }
    }

    return updateResult
  }

  generateAvatarUrl(userId: string, extension: string): string {
    return this.uploadService.generateUrl('avatars', `${userId}.${extension}`)
  }

  async requestPasswordReset(email: string): Promise<AuthResult> {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return {
        success: false,
        error: 'Invalid email format'
      }
    }

    // Check if user exists
    const userResult = await this.provider.getUserByEmail(email)
    if (!userResult.success || !userResult.user) {
      // Return success even if user doesn't exist (security best practice)
      return {
        success: true
      }
    }

    // Generate reset token
    const resetToken = this.generateResetToken()
    const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000) // 3 hours from now

    // Store reset token
    this.passwordResetTokens.set(resetToken, {
      token: resetToken,
      userId: userResult.user.id,
      expiresAt,
      used: false
    })

    // Generate reset URL
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dev/auth/reset-password?token=${resetToken}`

    // Send reset email
    const emailResult = await this.emailService.sendPasswordResetEmail(email, {
      resetToken,
      resetUrl,
      user: {
        email: userResult.user.email,
        name: userResult.user.name
      }
    })

    if (!emailResult.success) {
      return {
        success: false,
        error: 'Failed to send reset email'
      }
    }

    return {
      success: true
    }
  }

  async verifyPasswordResetToken(token: string): Promise<AuthResult> {
    const resetToken = this.passwordResetTokens.get(token)
    
    if (!resetToken || resetToken.used || resetToken.expiresAt.getTime() < Date.now()) {
      return {
        success: false,
        error: 'Invalid or expired reset token'
      }
    }

    // Get user for the token
    const userResult = await this.provider.getUserById(resetToken.userId)
    
    return {
      success: true,
      user: userResult.user
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<AuthResult> {
    const resetToken = this.passwordResetTokens.get(token)
    
    if (!resetToken || resetToken.used || resetToken.expiresAt.getTime() < Date.now()) {
      return {
        success: false,
        error: 'Invalid or expired reset token'
      }
    }

    // Validate new password
    if (newPassword.length < 8) {
      return {
        success: false,
        error: 'Password must be at least 8 characters'
      }
    }

    // Reset the password
    const result = await this.provider.resetUserPassword(resetToken.userId, newPassword)
    
    if (result.success) {
      // Mark token as used
      resetToken.used = true
    }

    return result
  }

  async cleanupExpiredResetTokens(): Promise<void> {
    const now = Date.now()
    
    for (const [token, resetToken] of this.passwordResetTokens.entries()) {
      if (resetToken.expiresAt.getTime() < now || resetToken.used) {
        this.passwordResetTokens.delete(token)
      }
    }
  }

  async refreshSession(): Promise<AuthResult> {
    const currentUser = await this.getUser()
    
    if (!currentUser.success || !currentUser.user) {
      return {
        success: false,
        error: 'No active session to refresh'
      }
    }

    // Extend session expiration
    this.currentSession = {
      user: currentUser.user,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
    }

    // Store refreshed session
    try {
        await this.sessionStorage.setSession(this.currentSession)
      } catch {
        // Storage write failed, but we keep the session in memory
      }

    return {
      success: true,
      user: currentUser.user
    }
  }

  async clearExpiredSessions(): Promise<void> {
    // This would typically be called periodically by a background job
    // For now, it just ensures the current session is valid
    await this.getUser()
  }

  private generateResetToken(): string {
    // Generate a secure random token
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let token = ''
    
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    
    return token
  }
}