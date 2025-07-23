import bcrypt from '@node-rs/bcrypt';
import { eq, desc, and } from 'drizzle-orm';

import { users, passwordHistory } from '@/lib/db/schema';
import { testDb } from '@/lib/db/test';
import { emailService } from '@/lib/email/service';

import { authLogger, timeOperation } from '../logger';
import {
  PasswordExpirationService,
  DEFAULT_PASSWORD_EXPIRATION_CONFIG,
} from '../password-expiration';
import {
  PasswordValidator,
  DEFAULT_PASSWORD_POLICY,
} from '../password-validator';
import { RateLimiter } from '../rate-limiter';
import { TokenService } from '../token-service';
import {
  type AuthProvider,
  type AuthResult,
  type SignUpRequest,
  type AuthConfiguration,
  type OAuthProvider,
  type OAuthResult,
  type UpdateProfileRequest,
} from '../types';

export class DatabaseTestAuthProvider implements AuthProvider {
  private readonly bcryptRounds = 12;
  private readonly passwordValidator = new PasswordValidator(
    DEFAULT_PASSWORD_POLICY,
  );
  private readonly rateLimiter = new RateLimiter(testDb);
  private readonly passwordExpiration = new PasswordExpirationService(
    DEFAULT_PASSWORD_EXPIRATION_CONFIG,
  );
  private readonly passwordHistoryLimit = 5;
  private readonly tokenService = new TokenService();

  async authenticateUser(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResult> {
    const startTime = Date.now();

    try {
      return await timeOperation('authenticate_user', async () => {
        // Check rate limit
        const rateLimit = await this.rateLimiter.checkRateLimit(
          email,
          'login',
          ipAddress,
        );
        if (!rateLimit.allowed) {
          await this.rateLimiter.recordAttempt(
            email,
            'login',
            false,
            ipAddress,
            userAgent,
          );

          const errorMessage = rateLimit.locked
            ? `Account temporarily locked. Try again after ${rateLimit.lockoutEndTime?.toLocaleTimeString()}`
            : `Too many attempts. Try again in ${Math.ceil((rateLimit.resetTime.getTime() - Date.now()) / 60000)} minutes`;

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
              resetTime: rateLimit.resetTime,
            },
            timestamp: new Date(),
            actionTaken: 'rate_limit_applied',
          });

          authLogger.logAuthEvent({
            type: 'login',
            email,
            ipAddress,
            userAgent,
            success: false,
            error: errorMessage,
            timestamp: new Date(),
            duration: Date.now() - startTime,
          });

          return {
            success: false,
            error: errorMessage,
          };
        }

        // Find user by email
        const [user] = await testDb
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!user || !user.password) {
          await this.rateLimiter.recordAttempt(
            email,
            'login',
            false,
            ipAddress,
            userAgent,
          );

          authLogger.logAuthEvent({
            type: 'login',
            email,
            ipAddress,
            userAgent,
            success: false,
            error: 'Invalid credentials',
            timestamp: new Date(),
            duration: Date.now() - startTime,
          });

          return {
            success: false,
            error: 'Invalid credentials',
          };
        }

        // Verify password
        const isPasswordValid = await bcrypt.verify(password, user.password);

        if (!isPasswordValid) {
          await this.rateLimiter.recordAttempt(
            email,
            'login',
            false,
            ipAddress,
            userAgent,
            user.id,
          );

          authLogger.logAuthEvent({
            type: 'login',
            email,
            ipAddress,
            userAgent,
            userId: user.id,
            success: false,
            error: 'Invalid credentials',
            timestamp: new Date(),
            duration: Date.now() - startTime,
          });

          return {
            success: false,
            error: 'Invalid credentials',
          };
        }

        // Check password expiration
        const expirationResult =
          await this.passwordExpiration.checkPasswordExpiration(
            user.id,
            user.passwordCreatedAt,
          );

        // Record successful login
        await this.rateLimiter.recordAttempt(
          email,
          'login',
          true,
          ipAddress,
          userAgent,
          user.id,
        );

        authLogger.logAuthEvent({
          type: 'login',
          email,
          ipAddress,
          userAgent,
          userId: user.id,
          success: true,
          timestamp: new Date(),
          duration: Date.now() - startTime,
          metadata: {
            emailVerified: !!user.emailVerified,
            passwordExpired: expirationResult.expired,
            passwordNearExpiration: expirationResult.nearExpiration,
          },
        });

        return {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            emailVerified: user.emailVerified,
          },
        };
      });
    } catch {
      authLogger.logAuthEvent({
        type: 'login',
        email,
        ipAddress,
        userAgent,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        duration: Date.now() - startTime,
      });

      return {
        success: false,
        error: 'Authentication failed',
      };
    }
  }

  async createUser(
    userData: SignUpRequest,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResult> {
    const { email, password, name } = userData;
    const startTime = Date.now();

    try {
      return await timeOperation('create_user', async () => {
        // Check rate limit
        const rateLimit = await this.rateLimiter.checkRateLimit(
          email,
          'signup',
          ipAddress,
        );
        if (!rateLimit.allowed) {
          await this.rateLimiter.recordAttempt(
            email,
            'signup',
            false,
            ipAddress,
            userAgent,
          );

          const errorMessage = rateLimit.locked
            ? `Account creation temporarily locked. Try again after ${rateLimit.lockoutEndTime?.toLocaleTimeString()}`
            : `Too many attempts. Try again in ${Math.ceil((rateLimit.resetTime.getTime() - Date.now()) / 60000)} minutes`;

          authLogger.logAuthEvent({
            type: 'signup',
            email,
            ipAddress,
            userAgent,
            success: false,
            error: errorMessage,
            timestamp: new Date(),
            duration: Date.now() - startTime,
          });

          return {
            success: false,
            error: errorMessage,
          };
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return {
            success: false,
            error: 'Invalid email format',
          };
        }

        // Check if user already exists
        const [existingUser] = await testDb
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (existingUser) {
          return {
            success: false,
            error: 'Email already exists',
          };
        }

        // Validate password
        const passwordValidation = this.passwordValidator.validate(password, {
          email,
          name,
        });
        if (!passwordValidation.isValid) {
          return {
            success: false,
            error: passwordValidation.errors[0],
          };
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, this.bcryptRounds);

        // Create user
        const [newUser] = await testDb
          .insert(users)
          .values({
            email,
            name,
            password: hashedPassword,
            passwordCreatedAt: new Date(),
            emailVerified: null,
            image: null,
          })
          .returning();

        // Record successful signup
        await this.rateLimiter.recordAttempt(
          email,
          'signup',
          true,
          ipAddress,
          userAgent,
          newUser.id,
        );

        authLogger.logAuthEvent({
          type: 'signup',
          email,
          ipAddress,
          userAgent,
          userId: newUser.id,
          success: true,
          timestamp: new Date(),
          duration: Date.now() - startTime,
          metadata: {
            emailVerified: !!newUser.emailVerified,
            hasName: !!newUser.name,
          },
        });

        return {
          success: true,
          user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            image: newUser.image,
            emailVerified: newUser.emailVerified,
          },
        };
      });
    } catch {
      authLogger.logAuthEvent({
        type: 'signup',
        email,
        ipAddress,
        userAgent,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        duration: Date.now() - startTime,
      });

      return {
        success: false,
        error: 'User creation failed',
      };
    }
  }

  async getUserById(id: string): Promise<AuthResult> {
    try {
      const [user] = await testDb
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        return {
          success: true,
          user: null,
        };
      }

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          emailVerified: user.emailVerified,
        },
      };
    } catch {
      return {
        success: false,
        error: 'Failed to get user',
      };
    }
  }

  async getUserByEmail(email: string): Promise<AuthResult> {
    try {
      const [user] = await testDb
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user) {
        return {
          success: true,
          user: null,
        };
      }

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          emailVerified: user.emailVerified,
        },
      };
    } catch {
      return {
        success: false,
        error: 'Failed to get user',
      };
    }
  }

  async updateUser(
    id: string,
    data: UpdateProfileRequest,
  ): Promise<AuthResult> {
    try {
      // Check if user exists
      const [existingUser] = await testDb
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!existingUser) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      // Validate email if updating
      if (data.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
          return {
            success: false,
            error: 'Invalid email format',
          };
        }

        // Check if email is already taken by another user
        const [existingEmailUser] = await testDb
          .select()
          .from(users)
          .where(and(eq(users.email, data.email), eq(users.id, id)))
          .limit(1);

        if (existingEmailUser && existingEmailUser.id !== id) {
          return {
            success: false,
            error: 'Email already in use',
          };
        }
      }

      // Update user
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.email !== undefined) {
        updateData.email = data.email;
        updateData.emailVerified = null; // Reset email verification
      }
      if (data.image !== undefined) updateData.image = data.image;

      const [updatedUser] = await testDb
        .update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning();

      return {
        success: true,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          image: updatedUser.image,
          emailVerified: updatedUser.emailVerified,
        },
      };
    } catch {
      return {
        success: false,
        error: 'Failed to update user',
      };
    }
  }

  async deleteUser(id: string): Promise<AuthResult> {
    try {
      // Check if user exists
      const [existingUser] = await testDb
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!existingUser) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      // Delete user
      await testDb.delete(users).where(eq(users.id, id));

      return {
        success: true,
      };
    } catch {
      return {
        success: false,
        error: 'Failed to delete user',
      };
    }
  }

  async verifyUserEmail(id: string): Promise<AuthResult> {
    try {
      // Check if user exists
      const [existingUser] = await testDb
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!existingUser) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      // Update email verification
      const [updatedUser] = await testDb
        .update(users)
        .set({ emailVerified: new Date() })
        .where(eq(users.id, id))
        .returning();

      return {
        success: true,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          image: updatedUser.image,
          emailVerified: updatedUser.emailVerified,
        },
      };
    } catch {
      return {
        success: false,
        error: 'Failed to verify email',
      };
    }
  }

  async changeUserPassword(
    id: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<AuthResult> {
    try {
      // Get user
      const [user] = await testDb
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user || !user.password) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.verify(
        currentPassword,
        user.password,
      );
      if (!isCurrentPasswordValid) {
        return {
          success: false,
          error: 'Current password is incorrect',
        };
      }

      // Validate new password
      const passwordValidation = this.passwordValidator.validate(newPassword, {
        email: user.email,
        name: user.name,
      });
      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: passwordValidation.errors[0],
        };
      }

      // Check password history for reuse
      const recentPasswords = await testDb
        .select()
        .from(passwordHistory)
        .where(eq(passwordHistory.userId, id))
        .orderBy(desc(passwordHistory.createdAt))
        .limit(this.passwordHistoryLimit);

      // Check if new password matches any recent password
      for (const historyEntry of recentPasswords) {
        const isReused = await bcrypt.verify(
          newPassword,
          historyEntry.passwordHash,
        );
        if (isReused) {
          return {
            success: false,
            error: `Cannot reuse any of your last ${this.passwordHistoryLimit} passwords`,
          };
        }
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, this.bcryptRounds);

      // Update password
      await testDb
        .update(users)
        .set({
          password: hashedPassword,
          passwordCreatedAt: new Date(),
        })
        .where(eq(users.id, id));

      // Add current password to history
      await testDb.insert(passwordHistory).values({
        userId: id,
        passwordHash: user.password,
        createdAt: new Date(),
      });

      // Clean up old password history
      const oldPasswords = await testDb
        .select()
        .from(passwordHistory)
        .where(eq(passwordHistory.userId, id))
        .orderBy(desc(passwordHistory.createdAt))
        .limit(100)
        .offset(this.passwordHistoryLimit);

      if (oldPasswords.length > 0) {
        await testDb
          .delete(passwordHistory)
          .where(eq(passwordHistory.userId, id));
      }

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          emailVerified: user.emailVerified,
        },
      };
    } catch {
      return {
        success: false,
        error: 'Failed to change password',
      };
    }
  }

  async resetUserPassword(
    id: string,
    newPassword: string,
  ): Promise<AuthResult> {
    try {
      // Get user
      const [user] = await testDb
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      // Validate new password
      const passwordValidation = this.passwordValidator.validate(newPassword, {
        email: user.email,
        name: user.name,
      });
      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: passwordValidation.errors[0],
        };
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, this.bcryptRounds);

      // Update password
      await testDb
        .update(users)
        .set({
          password: hashedPassword,
          passwordCreatedAt: new Date(),
        })
        .where(eq(users.id, id));

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          emailVerified: user.emailVerified,
        },
      };
    } catch {
      return {
        success: false,
        error: 'Failed to reset password',
      };
    }
  }

  isConfigured(): boolean {
    return !!process.env.TEST_DATABASE_URL;
  }

  async signInWithOAuth(provider: string): Promise<OAuthResult> {
    return {
      success: false,
      error: 'OAuth not supported in database test provider',
    };
  }

  getAvailableOAuthProviders(): OAuthProvider[] {
    return [];
  }

  getConfiguration(): AuthConfiguration {
    return {
      provider: 'nextauth',
      oauthProviders: [],
    };
  }

  // Email verification methods
  async sendEmailVerification(
    email: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if user exists
      const [user] = await testDb
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Generate token
      const tokenData = await this.tokenService.createToken(
        email,
        'email_verification',
        24 * 60,
      ); // 24 hours

      // Send verification email
      const emailResult = await emailService.sendVerificationEmail(email, {
        verificationToken: tokenData.token,
        verificationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${tokenData.token}`,
        user: {
          email: user.email,
          name: user.name,
        },
      });

      return { success: emailResult.success, error: emailResult.error };
    } catch {
      return { success: false, error: 'Failed to send verification email' };
    }
  }

  async verifyEmailWithToken(
    token: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify token
      const verifyResult = await this.tokenService.verifyToken(
        token,
        'email_verification',
      );

      if (!verifyResult.valid) {
        return {
          success: false,
          error: 'Invalid or expired verification token',
        };
      }

      // Get user by email from token
      const [user] = await testDb
        .select()
        .from(users)
        .where(eq(users.email, verifyResult.identifier))
        .limit(1);

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Update email verification
      await testDb
        .update(users)
        .set({ emailVerified: new Date() })
        .where(eq(users.id, user.id));

      return { success: true };
    } catch {
      return { success: false, error: 'Failed to verify email' };
    }
  }

  // Password reset methods
  async sendPasswordReset(
    email: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if user exists
      const [user] = await testDb
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user) {
        // Don't reveal if user exists
        return { success: true };
      }

      // Generate token
      const tokenData = await this.tokenService.createToken(
        email,
        'password_reset',
        60,
      ); // 1 hour

      // Send reset email
      const emailResult = await emailService.sendPasswordResetEmail(email, {
        resetToken: tokenData.token,
        resetUrl: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${tokenData.token}`,
        user: {
          email: user.email,
          name: user.name,
        },
      });

      return { success: emailResult.success, error: emailResult.error };
    } catch {
      return { success: false, error: 'Failed to send password reset email' };
    }
  }

  async resetPasswordWithToken(
    token: string,
    newPassword: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify token
      const verifyResult = await this.tokenService.verifyToken(
        token,
        'password_reset',
      );

      if (!verifyResult.valid) {
        return { success: false, error: 'Invalid or expired reset token' };
      }

      // Get user by email from token
      const [user] = await testDb
        .select()
        .from(users)
        .where(eq(users.email, verifyResult.identifier))
        .limit(1);

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Reset password
      const resetResult = await this.resetUserPassword(user.id, newPassword);

      if (!resetResult.success) {
        return { success: false, error: resetResult.error };
      }

      return { success: true };
    } catch {
      return { success: false, error: 'Failed to reset password' };
    }
  }
}
