import { AuthProvider, AuthResult, AuthUser, SignUpRequest, AuthConfiguration, OAuthProvider, OAuthResult, UpdateProfileRequest } from '../types'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from '@node-rs/bcrypt'

export class DatabaseAuthProvider implements AuthProvider {
  private readonly bcryptRounds = 12

  async authenticateUser(email: string, password: string): Promise<AuthResult> {
    try {
      // Find user by email
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1)
      
      if (!user || !user.password) {
        return {
          success: false,
          error: 'Invalid credentials'
        }
      }

      // Verify password
      const isPasswordValid = await bcrypt.verify(password, user.password)
      
      if (!isPasswordValid) {
        return {
          success: false,
          error: 'Invalid credentials'
        }
      }

      // Return user without password
      const { password: _, ...authUser } = user
      return {
        success: true,
        user: authUser
      }
    } catch (error) {
      console.error('Database authentication error:', error)
      return {
        success: false,
        error: 'Authentication failed'
      }
    }
  }

  async createUser(userData: SignUpRequest): Promise<AuthResult> {
    const { email, password, name } = userData

    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return {
          success: false,
          error: 'Invalid email format'
        }
      }

      // Validate password length
      if (password.length < 8) {
        return {
          success: false,
          error: 'Password must be at least 8 characters'
        }
      }

      // Check if user already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1)

      if (existingUser) {
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

      // Return user without password
      const { password: _, ...authUser } = newUser
      return {
        success: true,
        user: authUser
      }
    } catch (error) {
      console.error('Database user creation error:', error)
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

      // Validate new password
      if (newPassword.length < 8) {
        return {
          success: false,
          error: 'Password must be at least 8 characters'
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

      // Validate new password
      if (newPassword.length < 8) {
        return {
          success: false,
          error: 'Password must be at least 8 characters'
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
    // OAuth functionality will be implemented in Phase 3
    // For now, return not implemented error
    return {
      success: false,
      error: 'OAuth not implemented yet'
    }
  }

  getAvailableOAuthProviders(): OAuthProvider[] {
    // OAuth providers will be implemented in Phase 3
    // For now, return empty array
    return []
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
}