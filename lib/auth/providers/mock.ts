import { randomUUID } from 'crypto';

import { hashSync, compareSync } from 'bcryptjs';

import { validateEmail } from '@/lib/utils/validators';

import {
  type AuthProvider,
  type AuthResult,
  type AuthUser,
  type SignUpRequest,
  type AuthConfiguration,
  type OAuthProvider,
  type OAuthResult,
  type UpdateProfileRequest,
} from '../types';

/**
 * SECURITY NOTE: This MockAuthProvider demonstrates proper password security patterns.
 * Even in mock implementations, we use proper bcrypt hashing to:
 * 1. Set good security precedents for developers
 * 2. Prevent accidental production deployment of insecure patterns
 * 3. Provide realistic testing of secure authentication flows
 */

interface MockUserWithPassword extends AuthUser {
  password: string;
}

export class MockAuthProvider implements AuthProvider {
  private mockUsers = new Map<string, MockUserWithPassword>([
    [
      'test-user-id',
      {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        image: null,
        emailVerified: new Date(),
        password: hashSync('password', 12), // Properly hashed password (test password: 'password')
      },
    ],
  ]);

  async authenticateUser(email: string, password: string): Promise<AuthResult> {
    await Promise.resolve(); // Ensure async compliance
    // Find user by email
    const user = Array.from(this.mockUsers.values()).find(
      u => u.email === email,
    );

    // Use secure password comparison even in mock implementation
    if (user && compareSync(password, user.password)) {
      // Return user without password
      const { password: _, ...authUser } = user;
      return {
        success: true,
        user: authUser,
      };
    }

    return {
      success: false,
      error: 'Invalid credentials',
    };
  }

  async createUser(userData: SignUpRequest): Promise<AuthResult> {
    await Promise.resolve(); // Ensure async compliance
    const { email, password, name } = userData;

    // Validate email format
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return {
        success: false,
        error: emailValidation.error || 'Invalid email format',
      };
    }

    // Validate password length
    if (password.length < 8) {
      return {
        success: false,
        error: 'Password must be at least 8 characters',
      };
    }

    // Check if user already exists
    const existingUser = Array.from(this.mockUsers.values()).find(
      u => u.email === email,
    );
    if (existingUser) {
      return {
        success: false,
        error: 'Email already exists',
      };
    }

    // Create new user with securely hashed password
    const newUser: MockUserWithPassword = {
      id: randomUUID(),
      email,
      name: name || null,
      image: null,
      emailVerified: null,
      password: hashSync(password, 12), // Securely hash password even in mock
    };

    this.mockUsers.set(newUser.id, newUser);

    // Return user without password
    const { password: _, ...authUser } = newUser;
    return {
      success: true,
      user: authUser,
    };
  }

  async getUserById(id: string): Promise<AuthResult> {
    await Promise.resolve(); // Ensure async compliance
    const user = this.mockUsers.get(id);
    if (user) {
      const { password: _, ...authUser } = user;
      return {
        success: true,
        user: authUser,
      };
    }
    return {
      success: true,
      user: null,
    };
  }

  async getUserByEmail(email: string): Promise<AuthResult> {
    await Promise.resolve(); // Ensure async compliance
    const user = Array.from(this.mockUsers.values()).find(
      u => u.email === email,
    );
    if (user) {
      const { password: _, ...authUser } = user;
      return {
        success: true,
        user: authUser,
      };
    }
    return {
      success: true,
      user: null,
    };
  }

  isConfigured(): boolean {
    return true;
  }

  async signInWithOAuth(provider: string): Promise<OAuthResult> {
    // Simulate OAuth flow delay only for timeout tests
    if (provider === 'timeout-test') {
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      await Promise.resolve(); // Ensure async compliance
    }

    // Mock OAuth providers with properly hashed passwords
    const oauthUsers = {
      google: {
        id: 'google-user-id',
        email: 'user@gmail.com',
        name: 'Google User',
        image: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
        emailVerified: new Date(),
        password: hashSync('oauth-google', 12), // Securely hashed OAuth mock password
      },
      github: {
        id: 'github-user-id',
        email: 'user@github.com',
        name: 'GitHub User',
        image: 'https://avatars.githubusercontent.com/u/123456?v=4',
        emailVerified: new Date(),
        password: hashSync('oauth-github', 12), // Securely hashed OAuth mock password
      },
    };

    const oauthUser = oauthUsers[provider as keyof typeof oauthUsers];

    if (!oauthUser) {
      return {
        success: false,
        error: `OAuth provider "${provider}" not supported`,
      };
    }

    // Add user to mock store if not exists
    if (!this.mockUsers.has(oauthUser.id)) {
      this.mockUsers.set(oauthUser.id, oauthUser);
    }

    // Return user without password
    const { password: _, ...authUser } = oauthUser;
    return {
      success: true,
      user: authUser,
    };
  }

  getAvailableOAuthProviders(): OAuthProvider[] {
    return [
      {
        id: 'google',
        name: 'Google',
        iconUrl: 'https://developers.google.com/identity/images/g-logo.png',
      },
      {
        id: 'github',
        name: 'GitHub',
        iconUrl:
          'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
      },
    ];
  }

  getConfiguration(): AuthConfiguration {
    return {
      provider: 'mock',
      oauthProviders: ['google', 'github'],
    };
  }

  async updateUser(
    id: string,
    data: UpdateProfileRequest,
  ): Promise<AuthResult> {
    await Promise.resolve(); // Ensure async compliance
    const user = this.mockUsers.get(id);

    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    // Validate email if updating
    if (data.email) {
      const emailValidation = validateEmail(data.email);
      if (!emailValidation.isValid) {
        return {
          success: false,
          error: emailValidation.error || 'Invalid email format',
        };
      }

      // Check if email is already taken by another user
      const existingUser = Array.from(this.mockUsers.values()).find(
        u => u.email === data.email && u.id !== id,
      );
      if (existingUser) {
        return {
          success: false,
          error: 'Email already in use',
        };
      }

      // Reset email verification when email changes
      user.emailVerified = null;
    }

    // Update user fields
    if (data.name !== undefined) user.name = data.name;
    if (data.email !== undefined) user.email = data.email;
    if (data.image !== undefined) user.image = data.image;

    // Return updated user without password
    const { password: _, ...authUser } = user;
    return {
      success: true,
      user: authUser,
    };
  }

  async deleteUser(id: string): Promise<AuthResult> {
    await Promise.resolve(); // Ensure async compliance
    const user = this.mockUsers.get(id);

    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    this.mockUsers.delete(id);

    return {
      success: true,
    };
  }

  verifyUserEmail(id: string): Promise<AuthResult> {
    const user = this.mockUsers.get(id);

    if (!user) {
      return Promise.resolve({
        success: false,
        error: 'User not found',
      });
    }

    user.emailVerified = new Date();

    // Return user without password
    const { password: _, ...authUser } = user;
    return Promise.resolve({
      success: true,
      user: authUser,
    });
  }

  changeUserPassword(
    id: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<AuthResult> {
    const user = this.mockUsers.get(id);

    if (!user) {
      return Promise.resolve({
        success: false,
        error: 'User not found',
      });
    }

    // Verify current password using secure comparison
    if (!compareSync(currentPassword, user.password)) {
      return Promise.resolve({
        success: false,
        error: 'Current password is incorrect',
      });
    }

    // Validate new password
    if (newPassword.length < 8) {
      return Promise.resolve({
        success: false,
        error: 'Password must be at least 8 characters',
      });
    }

    // Update password with secure hashing
    user.password = hashSync(newPassword, 12);

    // Return user without password
    const { password: _, ...authUser } = user;
    return Promise.resolve({
      success: true,
      user: authUser,
    });
  }

  resetUserPassword(id: string, newPassword: string): Promise<AuthResult> {
    const user = this.mockUsers.get(id);

    if (!user) {
      return Promise.resolve({
        success: false,
        error: 'User not found',
      });
    }

    // Validate new password
    if (newPassword.length < 8) {
      return Promise.resolve({
        success: false,
        error: 'Password must be at least 8 characters',
      });
    }

    // Update password with secure hashing (no current password verification needed for reset)
    user.password = hashSync(newPassword, 12);

    // Return user without password
    const { password: _, ...authUser } = user;
    return Promise.resolve({
      success: true,
      user: authUser,
    });
  }

  // Email verification methods
  sendEmailVerification(
    _email: string,
  ): Promise<{ success: boolean; error?: string }> {
    // Mock implementation - just return success
    return Promise.resolve({ success: true });
  }

  verifyEmailWithToken(
    _token: string,
  ): Promise<{ success: boolean; error?: string }> {
    // Mock implementation - just return success
    return Promise.resolve({ success: true });
  }

  // Password reset methods
  sendPasswordReset(
    _email: string,
  ): Promise<{ success: boolean; error?: string }> {
    // Mock implementation - just return success
    return Promise.resolve({ success: true });
  }

  resetPasswordWithToken(
    _token: string,
    _newPassword: string,
  ): Promise<{ success: boolean; error?: string }> {
    // Mock implementation - just return success
    return Promise.resolve({ success: true });
  }
}
