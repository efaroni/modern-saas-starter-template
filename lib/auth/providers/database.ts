import { AuthProvider, AuthResult, AuthUser, SignUpRequest, AuthConfiguration, OAuthProvider, OAuthResult, UpdateProfileRequest } from '../types'
import { db } from '@/lib/db'
import { users, passwordHistory, authAttempts } from '@/lib/db/schema'
import { eq, desc, and, gte } from 'drizzle-orm'
import bcrypt from '@node-rs/bcrypt'
import { PasswordValidator, DEFAULT_PASSWORD_POLICY } from '../password-validator'
import { RateLimiter } from '../rate-limiter'
import { PasswordExpirationService, DEFAULT_PASSWORD_EXPIRATION_CONFIG } from '../password-expiration'
import { TokenService } from '../token-service'
import { emailService } from '@/lib/email/service'
import { authLogger, timeOperation } from '../logger'

export class DatabaseAuthProvider implements AuthProvider {
  private readonly bcryptRounds = 12
  private readonly passwordValidator = new PasswordValidator(DEFAULT_PASSWORD_POLICY)
  private readonly rateLimiter = new RateLimiter()
  private readonly passwordExpiration = new PasswordExpirationService(DEFAULT_PASSWORD_EXPIRATION_CONFIG)
  private readonly passwordHistoryLimit = 5
  private readonly tokenService = new TokenService()

  async authenticateUser(email: string, password: string, ipAddress?: string, userAgent?: string): Promise<AuthResult> {
    const startTime = Date.now()
    
    try {
      return await timeOperation('authenticate_user', async () => {
        // Check rate limit
        const rateLimit = await this.rateLimiter.checkRateLimit(email, 'login', ipAddress)
        if (!rateLimit.allowed) {
          await this.rateLimiter.recordAttempt(email, 'login', false, ipAddress, userAgent)
          
          const errorMessage = rateLimit.locked 
            ? `Account temporarily locked. Try again after ${rateLimit.lockoutEndTime?.toLocaleTimeString()}`
            : `Too many attempts. Try again in ${Math.ceil((rateLimit.resetTime.getTime() - Date.now()) / 60000)} minutes`
          
          // Log security event for rate limiting
          authLogger.logSecurityEvent({
            type: 'brute_force',
            email,
            ipAddress,
            userAgent,
            severity: rateLimit.locked ? 'high' : 'medium',
            details: {
              attempts: rateLimit.remaining,
              locked: rateLimit.locked,
              resetTime: rateLimit.resetTime
            },
            timestamp: new Date(),
            actionTaken: 'rate_limit_applied'
          })
          
          authLogger.logAuthEvent({
            type: 'login',
            email,
            ipAddress,
            userAgent,
            success: false,
            error: errorMessage,
            timestamp: new Date(),
            duration: Date.now() - startTime
          })
          
          return {
            success: false,
            error: errorMessage
          }
        }

        // Find user by email
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1)
        
        if (!user || !user.password) {
          await this.rateLimiter.recordAttempt(email, 'login', false, ipAddress, userAgent)
          
          authLogger.logAuthEvent({
            type: 'login',
            email,
            ipAddress,
            userAgent,
            success: false,
            error: 'Invalid credentials',
            timestamp: new Date(),
            duration: Date.now() - startTime
          })
          
          return {
            success: false,
            error: 'Invalid credentials'
          }
        }

        // Verify password
        const isPasswordValid = await bcrypt.verify(password, user.password)
        
        if (!isPasswordValid) {
          await this.rateLimiter.recordAttempt(email, 'login', false, ipAddress, userAgent, user.id)
          
          authLogger.logAuthEvent({
            type: 'login',
            userId: user.id,
            email,
            ipAddress,
            userAgent,
            success: false,
            error: 'Invalid credentials',
            timestamp: new Date(),
            duration: Date.now() - startTime
          })
          
          return {
            success: false,
            error: 'Invalid credentials'
          }
        }

        // Record successful attempt
        await this.rateLimiter.recordAttempt(email, 'login', true, ipAddress, userAgent, user.id)

        // Check password expiration
        const expirationResult = await this.passwordExpiration.checkPasswordExpiration(user.id)
        
        // Log successful authentication
        authLogger.logAuthEvent({
          type: 'login',
          userId: user.id,
          email,
          ipAddress,
          userAgent,
          success: true,
          timestamp: new Date(),
          duration: Date.now() - startTime,
          metadata: {
            emailVerified: !!user.emailVerified,
            passwordExpired: expirationResult.isExpired,
            passwordNearExpiration: expirationResult.isNearExpiration
          }
        })
        
        // Return user without password
        const { password: _, ...authUser } = user
        return {
          success: true,
          user: authUser,
          passwordExpiration: expirationResult
        }
      })
    } catch (error) {
      console.error('Database authentication error:', error)
      
      authLogger.logAuthEvent({
        type: 'login',
        email,
        ipAddress,
        userAgent,
        success: false,
        error: 'Authentication failed',
        timestamp: new Date(),
        duration: Date.now() - startTime
      })
      
      return {
        success: false,
        error: 'Authentication failed'
      }
    }
  }

  async createUser(userData: SignUpRequest, ipAddress?: string, userAgent?: string): Promise<AuthResult> {
    const { email, password, name } = userData
    const startTime = Date.now()

    try {
      return await timeOperation('create_user', async () => {
      // Check rate limit
      const rateLimit = await this.rateLimiter.checkRateLimit(email, 'signup', ipAddress)
      if (!rateLimit.allowed) {
        await this.rateLimiter.recordAttempt(email, 'signup', false, ipAddress, userAgent)
        
        if (rateLimit.locked) {
          return {
            success: false,
            error: `Too many signup attempts. Try again after ${rateLimit.lockoutEndTime?.toLocaleTimeString()}`
          }
        }
        
        return {
          success: false,
          error: `Too many attempts. Try again in ${Math.ceil((rateLimit.resetTime.getTime() - Date.now()) / 60000)} minutes`
        }
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        await this.rateLimiter.recordAttempt(email, 'signup', false, ipAddress, userAgent)
        return {
          success: false,
          error: 'Invalid email format'
        }
      }

      // Validate password complexity
      const passwordValidation = this.passwordValidator.validate(password, { email, name })
      if (!passwordValidation.isValid) {
        await this.rateLimiter.recordAttempt(email, 'signup', false, ipAddress, userAgent)
        return {
          success: false,
          error: passwordValidation.errors.join('. ')
        }
      }

      // Check if user already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1)

      if (existingUser) {
        await this.rateLimiter.recordAttempt(email, 'signup', false, ipAddress, userAgent)
        return {
          success: false,
          error: 'Email already exists'
        }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, this.bcryptRounds)

      // Create new user
      const [newUser] = await db
        .insert(users)
        .values({
          email,
          name: name || null,
          password: hashedPassword,
          emailVerified: null,
          image: null
        })
        .returning()

      // Store password in history
      await db.insert(passwordHistory).values({
        userId: newUser.id,
        passwordHash: hashedPassword
      })

        // Record successful attempt
        await this.rateLimiter.recordAttempt(email, 'signup', true, ipAddress, userAgent, newUser.id)

        // Log successful signup
        authLogger.logAuthEvent({
          type: 'signup',
          userId: newUser.id,
          email,
          ipAddress,
          userAgent,
          success: true,
          timestamp: new Date(),
          duration: Date.now() - startTime,
          metadata: {
            emailVerified: false,
            hasName: !!name
          }
        })

        // Return user without password
        const { password: _, ...authUser } = newUser
        return {
          success: true,
          user: authUser
        }
      })
    } catch (error) {
      console.error('Database user creation error:', error)
      
      authLogger.logAuthEvent({
        type: 'signup',
        email,
        ipAddress,
        userAgent,
        success: false,
        error: 'User creation failed',
        timestamp: new Date(),
        duration: Date.now() - startTime
      })
      
      return {
        success: false,
        error: 'User creation failed'
      }
    }
  }

  async getUserById(id: string): Promise<AuthResult> {
    try {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(id)) {
        return {
          success: true,
          user: null
        }
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1)

      if (user) {
        const { password: _, ...authUser } = user
        return {
          success: true,
          user: authUser
        }
      }

      return {
        success: true,
        user: null
      }
    } catch (error) {
      console.error('Database getUserById error:', error)
      return {
        success: false,
        error: 'Failed to get user'
      }
    }
  }

  async getUserByEmail(email: string): Promise<AuthResult> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1)

      if (user) {
        const { password: _, ...authUser } = user
        return {
          success: true,
          user: authUser
        }
      }

      return {
        success: true,
        user: null
      }
    } catch (error) {
      console.error('Database getUserByEmail error:', error)
      return {
        success: false,
        error: 'Failed to get user'
      }
    }
  }

  async updateUser(id: string, data: UpdateProfileRequest): Promise<AuthResult> {
    try {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(id)) {
        return {
          success: false,
          error: 'User not found'
        }
      }

      // Check if user exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1)

      if (!existingUser) {
        return {
          success: false,
          error: 'User not found'
        }
      }

      // Validate email if updating
      if (data.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(data.email)) {
          return {
            success: false,
            error: 'Invalid email format'
          }
        }

        // Check if email is already taken by another user
        const [emailExists] = await db
          .select()
          .from(users)
          .where(eq(users.email, data.email))
          .limit(1)

        if (emailExists && emailExists.id !== id) {
          return {
            success: false,
            error: 'Email already in use'
          }
        }
      }

      // Build update object
      const updateData: any = {
        updatedAt: new Date()
      }

      if (data.name !== undefined) updateData.name = data.name
      if (data.email !== undefined) {
        updateData.email = data.email
        updateData.emailVerified = null // Reset email verification when email changes
      }
      if (data.image !== undefined) updateData.image = data.image

      // Update user
      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning()

      // Return updated user without password
      const { password: _, ...authUser } = updatedUser
      return {
        success: true,
        user: authUser
      }
    } catch (error) {
      console.error('Database updateUser error:', error)
      return {
        success: false,
        error: 'Failed to update user'
      }
    }
  }

  async deleteUser(id: string): Promise<AuthResult> {
    try {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(id)) {
        return {
          success: false,
          error: 'User not found'
        }
      }

      const [deletedUser] = await db
        .delete(users)
        .where(eq(users.id, id))
        .returning()

      if (!deletedUser) {
        return {
          success: false,
          error: 'User not found'
        }
      }

      return {
        success: true
      }
    } catch (error) {
      console.error('Database deleteUser error:', error)
      return {
        success: false,
        error: 'Failed to delete user'
      }
    }
  }

  async verifyUserEmail(id: string): Promise<AuthResult> {
    try {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(id)) {
        return {
          success: false,
          error: 'User not found'
        }
      }

      const [updatedUser] = await db
        .update(users)
        .set({ 
          emailVerified: new Date(),
          updatedAt: new Date()
        })
        .where(eq(users.id, id))
        .returning()

      if (!updatedUser) {
        return {
          success: false,
          error: 'User not found'
        }
      }

      // Return user without password
      const { password: _, ...authUser } = updatedUser
      return {
        success: true,
        user: authUser
      }
    } catch (error) {
      console.error('Database verifyUserEmail error:', error)
      return {
        success: false,
        error: 'Failed to verify email'
      }
    }
  }

  async changeUserPassword(id: string, currentPassword: string, newPassword: string): Promise<AuthResult> {
    try {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(id)) {
        return {
          success: false,
          error: 'User not found'
        }
      }

      // Get user with password
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1)

      if (!user || !user.password) {
        return {
          success: false,
          error: 'User not found'
        }
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.verify(currentPassword, user.password)
      if (!isCurrentPasswordValid) {
        return {
          success: false,
          error: 'Current password is incorrect'
        }
      }

      // Validate new password complexity
      const passwordValidation = this.passwordValidator.validate(newPassword, { 
        email: user.email, 
        name: user.name 
      })
      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: passwordValidation.errors.join('. ')
        }
      }

      // Check password history
      const recentPasswords = await db
        .select()
        .from(passwordHistory)
        .where(eq(passwordHistory.userId, id))
        .orderBy(desc(passwordHistory.createdAt))
        .limit(this.passwordHistoryLimit)

      for (const oldPassword of recentPasswords) {
        const isReusedPassword = await bcrypt.verify(newPassword, oldPassword.passwordHash)
        if (isReusedPassword) {
          return {
            success: false,
            error: `Cannot reuse any of your last ${this.passwordHistoryLimit} passwords`
          }
        }
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, this.bcryptRounds)

      // Update password
      const [updatedUser] = await db
        .update(users)
        .set({ 
          password: hashedPassword,
          updatedAt: new Date()
        })
        .where(eq(users.id, id))
        .returning()

      // Store password in history
      await db.insert(passwordHistory).values({
        userId: id,
        passwordHash: hashedPassword
      })

      // Mark password as updated for expiration tracking
      await this.passwordExpiration.markPasswordUpdated(id)

      // Clean up old password history (keep only last N passwords)
      const allPasswords = await db
        .select()
        .from(passwordHistory)
        .where(eq(passwordHistory.userId, id))
        .orderBy(desc(passwordHistory.createdAt))

      if (allPasswords.length > this.passwordHistoryLimit) {
        const passwordsToDelete = allPasswords.slice(this.passwordHistoryLimit)
        for (const oldPassword of passwordsToDelete) {
          await db
            .delete(passwordHistory)
            .where(eq(passwordHistory.id, oldPassword.id))
        }
      }

      // Return user without password
      const { password: _, ...authUser } = updatedUser
      return {
        success: true,
        user: authUser
      }
    } catch (error) {
      console.error('Database changeUserPassword error:', error)
      return {
        success: false,
        error: 'Failed to change password'
      }
    }
  }

  async resetUserPassword(id: string, newPassword: string): Promise<AuthResult> {
    try {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(id)) {
        return {
          success: false,
          error: 'User not found'
        }
      }

      // Get user info for password validation
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1)

      if (!user) {
        return {
          success: false,
          error: 'User not found'
        }
      }

      // Validate new password complexity
      const passwordValidation = this.passwordValidator.validate(newPassword, { 
        email: user.email, 
        name: user.name 
      })
      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: passwordValidation.errors.join('. ')
        }
      }

      // Check password history
      const recentPasswords = await db
        .select()
        .from(passwordHistory)
        .where(eq(passwordHistory.userId, id))
        .orderBy(desc(passwordHistory.createdAt))
        .limit(this.passwordHistoryLimit)

      for (const oldPassword of recentPasswords) {
        const isReusedPassword = await bcrypt.verify(newPassword, oldPassword.passwordHash)
        if (isReusedPassword) {
          return {
            success: false,
            error: `Cannot reuse any of your last ${this.passwordHistoryLimit} passwords`
          }
        }
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, this.bcryptRounds)

      // Update password (no current password verification needed for reset)
      const [updatedUser] = await db
        .update(users)
        .set({ 
          password: hashedPassword,
          updatedAt: new Date()
        })
        .where(eq(users.id, id))
        .returning()

      if (!updatedUser) {
        return {
          success: false,
          error: 'User not found'
        }
      }

      // Store password in history
      await db.insert(passwordHistory).values({
        userId: id,
        passwordHash: hashedPassword
      })

      // Mark password as updated for expiration tracking
      await this.passwordExpiration.markPasswordUpdated(id)

      // Clean up old password history (keep only last N passwords)
      const allPasswords = await db
        .select()
        .from(passwordHistory)
        .where(eq(passwordHistory.userId, id))
        .orderBy(desc(passwordHistory.createdAt))

      if (allPasswords.length > this.passwordHistoryLimit) {
        const passwordsToDelete = allPasswords.slice(this.passwordHistoryLimit)
        for (const oldPassword of passwordsToDelete) {
          await db
            .delete(passwordHistory)
            .where(eq(passwordHistory.id, oldPassword.id))
        }
      }

      // Return user without password
      const { password: _, ...authUser } = updatedUser
      return {
        success: true,
        user: authUser
      }
    } catch (error) {
      console.error('Database resetUserPassword error:', error)
      return {
        success: false,
        error: 'Failed to reset password'
      }
    }
  }

  async signInWithOAuth(provider: string): Promise<OAuthResult> {
    try {
      // Validate provider
      const availableProviders = this.getAvailableOAuthProviders()
      const oauthProvider = availableProviders.find(p => p.id === provider)
      
      if (!oauthProvider) {
        return {
          success: false,
          error: `OAuth provider '${provider}' is not supported`
        }
      }

      // Generate state for CSRF protection
      const state = Math.random().toString(36).substring(2, 15)
      
      // Create OAuth redirect URL
      const redirectUrl = `/api/auth/signin/${provider}?state=${state}`
      
      return {
        success: true,
        redirectUrl
      }
    } catch (error) {
      console.error('OAuth sign-in error:', error)
      return {
        success: false,
        error: 'OAuth sign-in failed'
      }
    }
  }

  getAvailableOAuthProviders(): OAuthProvider[] {
    const providers: OAuthProvider[] = []
    
    // Check if Google OAuth is configured
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      providers.push({
        id: 'google',
        name: 'Google',
        iconUrl: '/icons/google.svg'
      })
    }
    
    // Check if GitHub OAuth is configured
    if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
      providers.push({
        id: 'github',
        name: 'GitHub',
        iconUrl: '/icons/github.svg'
      })
    }
    
    return providers
  }

  isConfigured(): boolean {
    // Check if database connection is available
    return !!process.env.DATABASE_URL
  }

  getConfiguration(): AuthConfiguration {
    return {
      provider: 'nextauth',
      oauthProviders: [] // Will be populated in Phase 3
    }
  }

  // Email verification methods
  async sendEmailVerification(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if user exists
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1)
      
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        }
      }
      
      // Check if email is already verified
      if (user.emailVerified) {
        return {
          success: false,
          error: 'Email is already verified'
        }
      }
      
      // Create verification token (expires in 24 hours)
      const tokenData = await this.tokenService.createToken(email, 'email_verification', 24 * 60)
      
      // Send verification email
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      const verificationUrl = `${baseUrl}/auth/verify-email?token=${tokenData.token}`
      
      const emailResult = await emailService.sendVerificationEmail(email, {
        verificationToken: tokenData.token,
        verificationUrl,
        user: {
          email: user.email,
          name: user.name
        }
      })
      
      if (!emailResult.success) {
        return {
          success: false,
          error: emailResult.error || 'Failed to send verification email'
        }
      }
      
      return { success: true }
    } catch (error) {
      console.error('Failed to send email verification:', error)
      return {
        success: false,
        error: 'Failed to send verification email'
      }
    }
  }

  async verifyEmailWithToken(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Extract email from token (tokens are stored as "type:token" format)
      const [, actualToken] = token.split(':')
      if (!actualToken) {
        return {
          success: false,
          error: 'Invalid token format'
        }
      }
      
      // For now, we need to check all users to find the matching email
      // In a production system, you might want to include the email in the URL
      const allUsers = await db.select().from(users)
      
      for (const user of allUsers) {
        const verification = await this.tokenService.verifyToken(token, user.email)
        
        if (verification.valid && verification.type === 'email_verification') {
          // Mark email as verified
          await db
            .update(users)
            .set({ 
              emailVerified: new Date(),
              updatedAt: new Date()
            })
            .where(eq(users.id, user.id))
          
          // Send welcome email
          const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
          const dashboardUrl = `${baseUrl}/dashboard`
          
          await emailService.sendWelcomeEmail(user.email, {
            user: {
              email: user.email,
              name: user.name
            },
            dashboardUrl
          })
          
          return { success: true }
        }
      }
      
      return {
        success: false,
        error: 'Invalid or expired token'
      }
    } catch (error) {
      console.error('Failed to verify email token:', error)
      return {
        success: false,
        error: 'Failed to verify email'
      }
    }
  }

  // Password reset methods
  async sendPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if user exists
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1)
      
      if (!user) {
        // For security, don't reveal whether user exists
        return { success: true }
      }
      
      // Create password reset token (expires in 1 hour)
      const tokenData = await this.tokenService.createToken(email, 'password_reset', 60)
      
      // Send password reset email
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      const resetUrl = `${baseUrl}/auth/reset-password?token=${tokenData.token}`
      
      const emailResult = await emailService.sendPasswordResetEmail(email, {
        resetToken: tokenData.token,
        resetUrl,
        user: {
          email: user.email,
          name: user.name
        }
      })
      
      if (!emailResult.success) {
        console.error('Failed to send password reset email:', emailResult.error)
        // For security, don't reveal email sending failures
        return { success: true }
      }
      
      return { success: true }
    } catch (error) {
      console.error('Failed to send password reset:', error)
      return {
        success: false,
        error: 'Failed to send password reset email'
      }
    }
  }

  async resetPasswordWithToken(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      // For now, we need to check all users to find the matching email
      // In a production system, you might want to include the email in the URL
      const allUsers = await db.select().from(users)
      
      for (const user of allUsers) {
        const verification = await this.tokenService.verifyToken(token, user.email)
        
        if (verification.valid && verification.type === 'password_reset') {
          // Validate new password
          const passwordValidation = this.passwordValidator.validate(newPassword, { 
            email: user.email, 
            name: user.name 
          })
          if (!passwordValidation.isValid) {
            return {
              success: false,
              error: passwordValidation.errors.join('. ')
            }
          }
          
          // Check password history
          const recentPasswords = await db
            .select()
            .from(passwordHistory)
            .where(eq(passwordHistory.userId, user.id))
            .orderBy(desc(passwordHistory.createdAt))
            .limit(this.passwordHistoryLimit)

          for (const oldPassword of recentPasswords) {
            const isReusedPassword = await bcrypt.verify(newPassword, oldPassword.passwordHash)
            if (isReusedPassword) {
              return {
                success: false,
                error: `Cannot reuse any of your last ${this.passwordHistoryLimit} passwords`
              }
            }
          }
          
          // Hash new password
          const hashedPassword = await bcrypt.hash(newPassword, this.bcryptRounds)
          
          // Update password
          await db
            .update(users)
            .set({ 
              password: hashedPassword,
              updatedAt: new Date()
            })
            .where(eq(users.id, user.id))
          
          // Store password in history
          await db.insert(passwordHistory).values({
            userId: user.id,
            passwordHash: hashedPassword
          })
          
          // Mark password as updated for expiration tracking
          await this.passwordExpiration.markPasswordUpdated(user.id)
          
          return { success: true }
        }
      }
      
      return {
        success: false,
        error: 'Invalid or expired token'
      }
    } catch (error) {
      console.error('Failed to reset password with token:', error)
      return {
        success: false,
        error: 'Failed to reset password'
      }
    }
  }
}