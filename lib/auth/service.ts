import { AuthProvider, AuthResult, SignInRequest, SignUpRequest, SessionData, AuthConfiguration, OAuthProvider, OAuthResult, UpdateProfileRequest, ChangePasswordRequest, AvatarUploadResult, PasswordResetToken } from './types'
import { uploadService } from '@/lib/upload/service'
import { emailService } from '@/lib/email/service'
import { createSessionStorage, type SessionStorage } from './session-storage'
import type { EmailService } from '@/lib/email/types'
import type { UploadService } from '@/lib/upload/types'
import { AUTH_CONFIG } from '@/lib/config/app-config'
import { validateEmail } from '@/lib/utils/validators'
import { addHours } from '@/lib/utils/date-time'
import { TokenGenerators } from '@/lib/utils/token-generator'
import { ErrorFactory, withErrorContext } from '@/lib/utils/error-handler'
import { authLogger } from '@/lib/auth/logger'
import { db } from '@/lib/db/server'
import { passwordResetTokens } from '@/lib/db/schema'
import { eq, and, lt } from 'drizzle-orm'

export class AuthService {
  private currentSession: SessionData | null = null
  private hasStorageWriteFailure: boolean = false
  private passwordResetTokens = new Map<string, PasswordResetToken>() // Fallback for mock provider
  private sessionStorage: SessionStorage
  private emailService: EmailService
  private uploadService: UploadService
  private cleanupTimer: NodeJS.Timeout | null = null

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
    this.startCleanupTimer()
  }

  private isMockProvider(): boolean {
    return this.provider.constructor.name === 'MockAuthProvider'
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

  private startCleanupTimer(): void {
    // Run cleanup every hour
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredTokens()
    }, AUTH_CONFIG.SESSION_CLEANUP_INTERVAL_MS)
    
    // Ensure the timer doesn't keep the process alive (if unref is available)
    if (this.cleanupTimer && typeof this.cleanupTimer.unref === 'function') {
      this.cleanupTimer.unref()
    }
  }

  private async cleanupExpiredTokens(): Promise<void> {
    try {
      const now = new Date()
      
      // Delete expired or used tokens from database
      const result = await db.delete(passwordResetTokens)
        .where(
          and(
            lt(passwordResetTokens.expiresAt, now)
          )
        )
      
      const removedCount = result.rowCount || 0
      if (removedCount > 0) {
        console.log(`[AUTH] Cleaned up ${removedCount} expired password reset tokens`)
      }
    } catch (error) {
      console.error('[AUTH] Failed to cleanup expired tokens:', error)
    }
  }

  public stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
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
        expires: new Date(Date.now() + AUTH_CONFIG.SESSION_DURATION_MS).toISOString()
      }
      
      // Store session (fail silently if storage fails)
      try {
        await this.sessionStorage.setSession(this.currentSession)
        this.hasStorageWriteFailure = false
      } catch (error) {
        // Storage write failed, but we keep the session in memory
        this.hasStorageWriteFailure = true
        authLogger.logAuthEvent({
          type: 'session_storage_failure',
          userId: result.user.id,
          email: result.user.email,
          success: false,
          error: 'Session storage write failed',
          timestamp: new Date(),
          metadata: { fallbackToMemory: true }
        })
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
        expires: new Date(Date.now() + AUTH_CONFIG.SESSION_DURATION_MS).toISOString()
      }
      
      // Store session (fail silently if storage fails)
      try {
        await this.sessionStorage.setSession(this.currentSession)
      } catch (error) {
        // Storage write failed, but we keep the session in memory
        authLogger.logAuthEvent({
          type: 'session_storage_failure',
          userId: result.user.id,
          email: result.user.email,
          success: false,
          error: 'Session storage write failed during signup',
          timestamp: new Date(),
          metadata: { fallbackToMemory: true }
        })
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
      // If there's a stored session, use it
      if (storedSession) {
        this.currentSession = storedSession
      } else {
        // No stored session - clear memory session for consistency across instances
        // Exception: preserve memory session if we had a storage write failure
        if (!this.hasStorageWriteFailure) {
          this.currentSession = null
        }
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
        expires: new Date(Date.now() + AUTH_CONFIG.SESSION_DURATION_MS).toISOString()
      }
      
      // Store session (fail silently if storage fails)
      try {
        await this.sessionStorage.setSession(this.currentSession)
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
    const emailValidation = validateEmail(email)
    if (!emailValidation.isValid) {
      return {
        success: false,
        error: emailValidation.error || 'Invalid email format'
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
    const expiresAt = addHours(3) // 3 hours from now

    // Generate reset URL
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`

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

    // Store reset token (in database for real providers, in memory for mock provider)
    if (this.isMockProvider()) {
      // For mock provider, use in-memory storage
      this.passwordResetTokens.set(resetToken, {
        token: resetToken,
        userId: userResult.user.id,
        expiresAt,
        used: false
      })
    } else {
      // For real providers, use database storage
      try {
        await db.insert(passwordResetTokens).values({
          token: resetToken,
          userId: userResult.user.id,
          expiresAt,
          used: false
        })
      } catch (error) {
        // Token storage failed, but email was sent
        // Log the error but don't fail the request since user got the email
        console.error('Failed to store password reset token in database:', error)
      }
    }

    return {
      success: true
    }
  }

  async verifyPasswordResetToken(token: string): Promise<AuthResult> {
    try {
      let resetToken: PasswordResetToken | undefined

      if (this.isMockProvider()) {
        // For mock provider, check in-memory storage
        resetToken = this.passwordResetTokens.get(token)
      } else {
        // For real providers, check database
        const resetTokens = await db.select()
          .from(passwordResetTokens)
          .where(eq(passwordResetTokens.token, token))
          .limit(1)
        resetToken = resetTokens[0]
      }
      
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
    } catch (error) {
      return {
        success: false,
        error: 'Invalid or expired reset token'
      }
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<AuthResult> {
    try {
      let resetToken: PasswordResetToken | undefined

      if (this.isMockProvider()) {
        // For mock provider, check in-memory storage
        resetToken = this.passwordResetTokens.get(token)
      } else {
        // For real providers, check database
        const resetTokens = await db.select()
          .from(passwordResetTokens)
          .where(eq(passwordResetTokens.token, token))
          .limit(1)
        resetToken = resetTokens[0]
      }
      
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
        if (this.isMockProvider()) {
          // For mock provider, update in-memory storage
          resetToken.used = true
        } else {
          // For real providers, update database
          await db.update(passwordResetTokens)
            .set({ used: true })
            .where(eq(passwordResetTokens.token, token))
        }
      }

      return result
    } catch (error) {
      return {
        success: false,
        error: 'Invalid or expired reset token'
      }
    }
  }

  async cleanupExpiredResetTokens(): Promise<void> {
    try {
      const now = new Date()
      
      if (this.isMockProvider()) {
        // For mock provider, cleanup in-memory storage
        for (const [token, resetToken] of this.passwordResetTokens.entries()) {
          if (resetToken.expiresAt.getTime() < now.getTime() || resetToken.used) {
            this.passwordResetTokens.delete(token)
          }
        }
      } else {
        // For real providers, cleanup database
        await db.delete(passwordResetTokens)
          .where(
            and(
              lt(passwordResetTokens.expiresAt, now)
            )
          )
      }
    } catch (error) {
      console.error('[AUTH] Failed to cleanup expired reset tokens:', error)
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
      expires: new Date(Date.now() + AUTH_CONFIG.SESSION_DURATION_MS).toISOString()
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
    return TokenGenerators.passwordReset()
  }

  // New email verification methods
  async sendEmailVerification(email: string): Promise<{ success: boolean; error?: string }> {
    return await this.provider.sendEmailVerification(email)
  }

  async verifyEmailWithToken(token: string): Promise<{ success: boolean; error?: string }> {
    return await this.provider.verifyEmailWithToken(token)
  }

  // New password reset methods
  async sendPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
    return await this.provider.sendPasswordReset(email)
  }

  async resetPasswordWithToken(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    return await this.provider.resetPasswordWithToken(token, newPassword)
  }
}